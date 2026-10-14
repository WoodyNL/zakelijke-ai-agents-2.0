/**
 * De sleutelkluis.
 *
 * Een koppeling geeft ons toegang tot de mailbox van een klant. Dat token is
 * daarmee het gevoeligste wat dit platform bewaart — gevoeliger dan de inhoud
 * van één mail, want ermee kun je bij álle mail, ook die van morgen.
 *
 * Daarom staat het versleuteld in de database, met een sleutel die alleen in
 * de omgeving van de server leeft. Wie de database in handen krijgt, heeft dan
 * nog steeds geen mailbox. En het staat in het private schema, dat niet via de
 * REST-API bereikbaar is — twee sloten, niet één.
 *
 * AES-GCM, want die controleert ook of er niet mee geknoeid is. Elk token
 * krijgt zijn eigen willekeurige nonce; dezelfde sleutel met dezelfde nonce
 * twee keer gebruiken breekt GCM, en dat is precies de fout die je niet wilt
 * maken in code die jaren meegaat.
 */

const ALGORITME = { name: "AES-GCM", length: 256 } as const;

async function sleutel(): Promise<CryptoKey> {
  const ruw = process.env["POSTVAK_SLEUTEL"];
  if (!ruw) {
    throw new Error(
      "POSTVAK_SLEUTEL ontbreekt op de server. Zonder die sleutel kan een mailboxkoppeling niet veilig bewaard worden.",
    );
  }
  const bytes = Uint8Array.from(atob(ruw), (c) => c.charCodeAt(0));
  if (bytes.length !== 32) {
    throw new Error("POSTVAK_SLEUTEL moet 32 bytes zijn, base64-gecodeerd.");
  }
  return crypto.subtle.importKey("raw", bytes, ALGORITME, false, ["encrypt", "decrypt"]);
}

/** Of er überhaupt een sleutel is. Zonder sleutel bieden we koppelen niet aan. */
export function kluisBeschikbaar(): boolean {
  const ruw = process.env["POSTVAK_SLEUTEL"];
  if (!ruw) return false;
  try {
    return Uint8Array.from(atob(ruw), (c) => c.charCodeAt(0)).length === 32;
  } catch {
    return false;
  }
}

export async function versleutel(tekst: string): Promise<string> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(tekst);
  const versleuteld = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, await sleutel(), data),
  );
  const alles = new Uint8Array(nonce.length + versleuteld.length);
  alles.set(nonce);
  alles.set(versleuteld, nonce.length);
  return btoa(String.fromCharCode(...alles));
}

export async function ontsleutel(opgeslagen: string): Promise<string> {
  const alles = Uint8Array.from(atob(opgeslagen), (c) => c.charCodeAt(0));
  const nonce = alles.slice(0, 12);
  const data = alles.slice(12);
  const klaar = await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, await sleutel(), data);
  return new TextDecoder().decode(klaar);
}

/**
 * Een ondertekend reisbriefje voor de rondgang langs Google of Microsoft.
 *
 * De koppeling begint in het portaal (waar we weten wie je bent) en eindigt op
 * een adres waar de browser van de klant terugkomt zonder sessie. Wat ertussen
 * meereist, mag dus niet te vervalsen zijn: anders kan iemand de koppeling van
 * een andere klant op zijn eigen mailbox zetten.
 *
 * Tien minuten geldig. Lang genoeg om in te loggen en toestemming te geven,
 * kort genoeg dat een briefje dat ergens blijft rondslingeren niets meer waard
 * is.
 */
export type Reisbriefje = { agentId: string; userId: string; provider: string; map: string };

const GELDIG_MS = 10 * 60 * 1000;

async function hmacSleutel(): Promise<CryptoKey> {
  const geheim = process.env["POSTVAK_SLEUTEL"];
  if (!geheim) throw new Error("POSTVAK_SLEUTEL ontbreekt op de server.");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`state:${geheim}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

const web64 = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const vanWeb64 = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export async function maakBriefje(b: Reisbriefje): Promise<string> {
  const inhoud = web64(
    new TextEncoder().encode(JSON.stringify({ ...b, tot: Date.now() + GELDIG_MS })),
  );
  const handtekening = new Uint8Array(
    await crypto.subtle.sign("HMAC", await hmacSleutel(), new TextEncoder().encode(inhoud)),
  );
  return `${inhoud}.${web64(handtekening)}`;
}

export async function leesBriefje(state: string): Promise<Reisbriefje | null> {
  const [inhoud, handtekening] = state.split(".");
  if (!inhoud || !handtekening) return null;
  const klopt = await crypto.subtle.verify(
    "HMAC",
    await hmacSleutel(),
    vanWeb64(handtekening),
    new TextEncoder().encode(inhoud),
  );
  if (!klopt) return null;
  try {
    const b = JSON.parse(new TextDecoder().decode(vanWeb64(inhoud))) as Reisbriefje & {
      tot: number;
    };
    if (!b.tot || b.tot < Date.now()) return null;
    return { agentId: b.agentId, userId: b.userId, provider: b.provider, map: b.map };
  } catch {
    return null;
  }
}
