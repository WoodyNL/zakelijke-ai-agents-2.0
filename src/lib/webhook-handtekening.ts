/**
 * De handtekening van een binnenkomende webhook controleren.
 *
 * Een webhook-adres is openbaar: het staat op internet en iedereen kan eraan
 * kloppen. Zonder deze controle kan een willekeurige vreemde een bericht
 * verzinnen dat eruitziet als een antwoord van een klant, en daarmee de agent
 * laten reageren op iets wat nooit is gestuurd. Bij een uitgaande e-mailagent is
 * dat geen theoretisch lek: het gevolg is echte post naar een echt adres.
 *
 * Resend tekent zijn webhooks via Svix. Er zit geen svix-pakket in dit project
 * en er is hier geen pakketbeheerder om er een toe te voegen, dus doen we het
 * met WebCrypto — dat werkt zowel in Node als op de rand van Cloudflare, waar
 * dit uiteindelijk draait.
 *
 * Het schema: onderteken de tekst `<id>.<timestamp>.<body>` met HMAC-SHA256,
 * waarbij de sleutel de base64-decodering is van het geheim ná `whsec_`. De
 * kopregel kan meerdere handtekeningen bevatten, gescheiden door spaties, elk
 * als `v1,<base64>` — dat is hoe Svix een sleutelwissel opvangt.
 */

const VIJF_MINUTEN = 5 * 60;

export type Controle =
  | { ok: true }
  | { ok: false; reden: string };

function base64NaarBytes(b64: string): Uint8Array {
  const binair = atob(b64);
  const uit = new Uint8Array(binair.length);
  for (let i = 0; i < binair.length; i++) uit[i] = binair.charCodeAt(i);
  return uit;
}

function bytesNaarBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/**
 * Vergelijkt twee tekenreeksen in gelijke tijd.
 *
 * Een gewone vergelijking stopt bij het eerste verschil. Wie dat duizenden
 * keren meet, kan daaruit teken voor teken de juiste handtekening afleiden.
 * Dat is hier vergezocht, maar het kost één regel om het uit te sluiten.
 */
function gelijkInVasteTijd(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let verschil = 0;
  for (let i = 0; i < a.length; i++) verschil |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return verschil === 0;
}

export async function controleerHandtekening({
  geheim,
  id,
  timestamp,
  handtekening,
  body,
  nu = Math.floor(Date.now() / 1000),
}: {
  geheim: string;
  id: string | null;
  timestamp: string | null;
  handtekening: string | null;
  /** De ruwe tekst van het verzoek, precies zoals binnengekomen. */
  body: string;
  nu?: number;
}): Promise<Controle> {
  if (!id || !timestamp || !handtekening) {
    return { ok: false, reden: "svix-kopregels ontbreken" };
  }

  // Zonder deze controle blijft een onderschept verzoek voor altijd geldig en
  // kan iemand hem maanden later opnieuw afspelen.
  const t = Number(timestamp);
  if (!Number.isFinite(t)) return { ok: false, reden: "timestamp is geen getal" };
  if (Math.abs(nu - t) > VIJF_MINUTEN) {
    return { ok: false, reden: "timestamp te oud of te ver in de toekomst" };
  }

  const kaal = geheim.startsWith("whsec_") ? geheim.slice(6) : geheim;
  let sleutelbytes: Uint8Array;
  try {
    sleutelbytes = base64NaarBytes(kaal);
  } catch {
    return { ok: false, reden: "geheim is geen geldige base64" };
  }

  const sleutel = await crypto.subtle.importKey(
    "raw",
    sleutelbytes as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bericht = new TextEncoder().encode(`${id}.${timestamp}.${body}`);
  const eigen = bytesNaarBase64(
    new Uint8Array(await crypto.subtle.sign("HMAC", sleutel, bericht as unknown as ArrayBuffer)),
  );

  // Meerdere handtekeningen betekent een sleutelwissel; één geldige is genoeg.
  for (const deel of handtekening.split(" ")) {
    const [versie, waarde] = deel.split(",");
    if (versie !== "v1" || !waarde) continue;
    if (gelijkInVasteTijd(eigen, waarde)) return { ok: true };
  }

  return { ok: false, reden: "handtekening klopt niet" };
}
