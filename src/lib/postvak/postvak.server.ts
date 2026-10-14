import { beschikbaar, vernieuwToken, type Aanbieder } from "@/lib/postvak/aanbieders.server";
import { kluisBeschikbaar, ontsleutel, versleutel } from "@/lib/postvak/kluis.server";
import {
  haalNieuwe,
  verstuurAntwoord,
  zetConcept,
  type Antwoord,
  type Postvakbericht,
} from "@/lib/postvak/mailbox.server";

/**
 * De koppeling aan het werk.
 *
 * Hier komt alles samen: een geldig token uit de kluis halen, kijken of er
 * nieuwe post is, die het gewone supportproces in duwen, en het antwoord weer
 * terugzetten in de mailbox van de klant.
 *
 * Over het ophalen: dit project heeft geen klok. Net als het opruimen hangt
 * deze ronde aan het verkeer dat er toch al is — hoogstens eens per drie
 * minuten per instantie. Voor supportmail is dat ruim genoeg, en het scheelt
 * een hele push-koppeling met Pub/Sub (Google) en abonnementen die elke drie
 * dagen vernieuwd moeten worden (Microsoft). Mocht er ooit een echte planner
 * zijn, dan hangt deze functie daaraan en verandert er verder niets.
 */

type Db = { url: string; headers: Record<string, string> };

function db(): Db | null {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) return null;
  return {
    url,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  };
}

async function rpc<T>(d: Db, naam: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${d.url}/rest/v1/rpc/${naam}`, {
    method: "POST",
    headers: d.headers,
    body: JSON.stringify(args),
  });
  if (!res.ok)
    throw new Error(`${naam} mislukt [${res.status}]: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

export type Toegang = {
  aanbieder: Aanbieder;
  toegang: string;
  email: string;
  map: string;
  cursor: string | null;
};

/**
 * Een token dat nu werkt.
 *
 * Verloopt het binnen twee minuten, dan vernieuwen we het eerst. Die marge is
 * er omdat een token dat tijdens de aanroep verloopt een fout geeft die je
 * daarna niet meer kunt onderscheiden van een ingetrokken koppeling.
 */
export async function geldigeToegang(agentId: string): Promise<Toegang | null> {
  const d = db();
  if (!d || !kluisBeschikbaar()) return null;

  const rijen = await rpc<
    Array<{
      provider: Aanbieder;
      email: string;
      map: string;
      cursor: string | null;
      toegang: string;
      vernieuwen: string | null;
      verloopt_op: string | null;
    }>
  >(d, "postvak_sleutels", { _agent_id: agentId });

  const k = rijen[0];
  if (!k) return null;

  const verlooptBinnenkort =
    !k.verloopt_op || new Date(k.verloopt_op).getTime() - Date.now() < 2 * 60_000;

  if (!verlooptBinnenkort) {
    return {
      aanbieder: k.provider,
      toegang: await ontsleutel(k.toegang),
      email: k.email,
      map: k.map,
      cursor: k.cursor,
    };
  }

  if (!k.vernieuwen) {
    await rpc(d, "postvak_stand", {
      _agent_id: agentId,
      _cursor: null,
      _fout: "De koppeling is verlopen. Koppel de mailbox opnieuw.",
    });
    return null;
  }

  const vers = await vernieuwToken(k.provider, await ontsleutel(k.vernieuwen));
  await rpc(d, "postvak_vernieuwd", {
    _agent_id: agentId,
    _toegang: await versleutel(vers.toegang),
    _verloopt_op: vers.verlooptOp.toISOString(),
  });
  return {
    aanbieder: k.provider,
    toegang: vers.toegang,
    email: k.email,
    map: k.map,
    cursor: k.cursor,
  };
}

/**
 * Eén ronde langs de mailbox van één agent.
 *
 * Nieuwe post gaat het gewone supportproces in, hetzelfde proces als bij
 * doorsturen. Dat is met opzet: de koppeling verandert waar de post vandaan
 * komt en waar het antwoord heen gaat, niet wat de agent ermee doet.
 */
export async function haalPostvakOp(agentId: string): Promise<number> {
  const d = db();
  if (!d) return 0;

  let toegang: Toegang | null = null;
  try {
    toegang = await geldigeToegang(agentId);
  } catch (err) {
    await rpc(d, "postvak_stand", {
      _agent_id: agentId,
      _cursor: null,
      _fout: `Token vernieuwen mislukte: ${err instanceof Error ? err.message : "onbekend"}`.slice(
        0,
        300,
      ),
    }).catch(() => {});
    return 0;
  }
  if (!toegang) return 0;

  try {
    const { berichten, cursor } = await haalNieuwe(
      toegang.aanbieder,
      toegang.toegang,
      toegang.map,
      toegang.cursor,
    );

    const { ontvangSupportMail, verwerkSupportMail } = await import("@/lib/support.server");
    let nieuw = 0;

    for (const b of berichten) {
      // Post van de klant aan zichzelf is geen supportvraag; dat is het
      // antwoord dat wijzelf net hebben klaargezet of verstuurd.
      if (b.vanEmail === toegang.email.toLowerCase()) continue;

      const id = await ontvangSupportMail({
        agentId,
        providerId: b.id,
        messageId: b.messageId,
        gesprekId: b.gesprek,
        vanEmail: b.vanEmail,
        vanNaam: b.vanNaam,
        onderwerp: b.onderwerp,
        vraag: b.tekst,
      });
      // Null betekent: dit bericht kenden we al. Dan niet opnieuw opstellen.
      if (!id) continue;
      nieuw++;
      await verwerkSupportMail(id);
    }

    await rpc(d, "postvak_stand", { _agent_id: agentId, _cursor: cursor, _fout: null });
    return nieuw;
  } catch (err) {
    await rpc(d, "postvak_stand", {
      _agent_id: agentId,
      _cursor: null,
      _fout: (err instanceof Error ? err.message : "Onbekende fout").slice(0, 300),
    }).catch(() => {});
    return 0;
  }
}

/** Alle gekoppelde mailboxen langs, hoogstens eens per drie minuten. */
let laatsteRonde = 0;
const RONDE_MS = 3 * 60 * 1000;

export async function rondePostvakken(): Promise<void> {
  if (Date.now() - laatsteRonde < RONDE_MS) return;
  laatsteRonde = Date.now();

  const d = db();
  if (!d || !kluisBeschikbaar()) return;
  if (!beschikbaar("google") && !beschikbaar("microsoft")) return;

  try {
    const res = await fetch(
      `${d.url}/rest/v1/postvak_koppelingen?select=agent_id&status=in.(actief,fout)&limit=50`,
      { headers: d.headers },
    );
    if (!res.ok) return;
    const rijen = (await res.json()) as Array<{ agent_id: string }>;
    for (const r of rijen) {
      await haalPostvakOp(r.agent_id).catch((err) =>
        console.warn("postvak: ronde mislukt", r.agent_id, err),
      );
    }
  } catch (err) {
    console.warn("postvak: ronde mislukt", err);
  }
}

/* --- Terugschrijven ----------------------------------------------------- */

/** Of deze agent een gekoppelde mailbox heeft (zonder tokens aan te raken). */
export async function heeftKoppeling(agentId: string): Promise<boolean> {
  const d = db();
  if (!d) return false;
  const res = await fetch(
    `${d.url}/rest/v1/postvak_koppelingen?select=id&agent_id=eq.${agentId}&status=eq.actief`,
    { headers: d.headers },
  );
  if (!res.ok) return false;
  return ((await res.json()) as unknown[]).length > 0;
}

function alsBericht(m: {
  provider_id: string;
  gesprek_id: string | null;
  message_id: string | null;
  van_email: string;
  van_naam: string | null;
  onderwerp: string | null;
}): Postvakbericht {
  return {
    id: m.provider_id,
    gesprek: m.gesprek_id,
    messageId: m.message_id,
    vanEmail: m.van_email,
    vanNaam: m.van_naam,
    onderwerp: m.onderwerp,
    tekst: "",
    ontvangenOp: new Date().toISOString(),
  };
}

/** Zet het concept klaar in de mailbox van de klant. Stil falen mag niet. */
export async function conceptInPostvak(
  agentId: string,
  mail: Parameters<typeof alsBericht>[0],
  antwoord: Antwoord,
): Promise<void> {
  const t = await geldigeToegang(agentId);
  if (!t) return;
  await zetConcept(t.aanbieder, t.toegang, alsBericht(mail), antwoord, t.email);
}

/** Verstuurt het antwoord vanuit de mailbox van de klant. */
export async function verstuurUitPostvak(
  agentId: string,
  mail: Parameters<typeof alsBericht>[0],
  antwoord: Antwoord,
): Promise<boolean> {
  const t = await geldigeToegang(agentId);
  if (!t) return false;
  await verstuurAntwoord(t.aanbieder, t.toegang, alsBericht(mail), antwoord, t.email);
  return true;
}
