/**
 * De betaalherinnering-agent aan het werk: de ronde langs open facturen, en
 * wat er gebeurt als een debiteur antwoordt.
 *
 * Geen klok, net als het opruimen en de mailboxen: elk verzoek aan de site
 * kan de ronde aanzwengelen, hoogstens eens per tien minuten per instantie,
 * en de rekenregels in herinneringen.ts bepalen of er werkelijk iets te
 * versturen is. Voor herinneringen die op dagen werken is dat ruim genoeg.
 *
 * De twee remmen die hier zitten en nergens anders:
 *
 *   Zonder actuele betaalstatus geen latere stappen vanzelf. Levert de klant
 *   zijn facturen als bestand aan (bron 'bestand' of 'handmatig'), dan weet de
 *   agent alleen wat de klant hem vertelt. Dan gaat stap één en twee vanzelf en
 *   wacht de rest tot de lijst is ververst (bijgewerkt in de laatste zeven
 *   dagen). Een herinnering voor een betaalde factuur mag nooit.
 *
 *   Antwoordt de debiteur, dan stopt de reeks een week en hoort de klant het.
 *   "Ik betaal volgende week" is een afspraak tussen mensen; daar komt geen
 *   agent tussen.
 */

import { esc, opmaak, stuurMail } from "@/lib/mail.server";
import {
  herinneringTekst,
  leesMomenten,
  nietHerinneren,
  vandaagIso,
  volgendeStap,
} from "@/lib/herinneringen";

const RESEND = "https://api.resend.com";

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
async function haal<T>(d: Db, pad: string): Promise<T[]> {
  const res = await fetch(`${d.url}/rest/v1/${pad}`, { headers: d.headers });
  if (!res.ok) throw new Error(`Ophalen mislukt [${res.status}]: ${pad}`);
  return (await res.json()) as T[];
}
async function patch(d: Db, tabel: string, filter: string, velden: Record<string, unknown>) {
  const res = await fetch(`${d.url}/rest/v1/${tabel}?${filter}`, {
    method: "PATCH",
    headers: { ...d.headers, Prefer: "return=minimal" },
    body: JSON.stringify(velden),
  });
  if (!res.ok) throw new Error(`Bijwerken mislukt [${res.status}]: ${tabel}`);
}

type Factuur = {
  id: string;
  agent_id: string;
  nummer: string;
  klant_naam: string | null;
  klant_email: string;
  bedrag: number;
  factuurdatum: string;
  vervaldatum: string;
  betaald_op: string | null;
  status: string;
  laatste_stap: number;
  laatste_herinnering_op: string | null;
  pauze_tot: string | null;
  bron: string;
  bijgewerkt_op: string;
};

type Agent = {
  id: string;
  name: string;
  status: string;
  client_id: string;
  notify_email: string | null;
  opties: Record<string, unknown> | null;
};

/** Hoeveel stappen er vanzelf mogen zonder verse betaalstatus. */
const STAPPEN_ZONDER_KOPPELING = 2;
const VERS_DAGEN = 7;

export async function verstuurHerinneringenVoor(agent: Agent, d: Db): Promise<number> {
  if (agent.status !== "live") return 0;
  const opties = agent.opties ?? {};
  const momenten = leesMomenten(opties["herinnering_momenten"]);
  const max = Number(opties["herinnering_max"]) || 3;
  const lijst = Array.isArray(opties["nooit_herinneren"])
    ? (opties["nooit_herinneren"] as string[])
    : [];
  const kopieBijLaatste = opties["kopie_bij_laatste"] !== false;
  const koppeling =
    typeof opties["boekhoudkoppeling"] === "string" && opties["boekhoudkoppeling"] !== "geen";

  const [afz] = await haal<{
    afzender_naam: string | null;
    afzender_email: string | null;
    ondertekening: string | null;
  }>(
    d,
    `support_instellingen?select=afzender_naam,afzender_email,ondertekening&agent_id=eq.${agent.id}`,
  );
  if (!afz?.afzender_email) return 0; // zonder afzenderadres kan er niets weg
  const [klant] = await haal<{ name: string; email: string }>(
    d,
    `profiles?select=name,email&id=eq.${agent.client_id}`,
  );
  const bedrijfsnaam = afz.afzender_naam || klant?.name || agent.name;
  const ondertekening = afz.ondertekening || `Met vriendelijke groet,\n${bedrijfsnaam}`;
  const betaalgegevens =
    typeof opties["betaalgegevens"] === "string" ? opties["betaalgegevens"] : null;

  const sleutel = process.env["RESEND_API_KEY"];
  if (!sleutel) return 0;

  const facturen = await haal<Factuur>(
    d,
    `facturen?select=*&agent_id=eq.${agent.id}&status=eq.open&order=vervaldatum.asc&limit=200`,
  );
  const vandaag = vandaagIso();
  let verstuurd = 0;

  for (const f of facturen) {
    if (nietHerinneren(f, lijst)) continue;
    const stap = volgendeStap(f, momenten, max, vandaag);
    if (!stap) continue;

    // De rem zonder koppeling: na twee stappen alleen verder als de lijst
    // de afgelopen week nog is bijgewerkt — dat is het enige teken dat de
    // betaalstatus klopt.
    if (!koppeling && stap.stap > STAPPEN_ZONDER_KOPPELING) {
      const vers = Date.now() - new Date(f.bijgewerkt_op).getTime() < VERS_DAGEN * 86_400_000;
      if (!vers) continue;
    }

    const totaalStappen = Math.min(momenten.length, max);
    const { onderwerp, tekst } = herinneringTekst({
      stap: stap.stap,
      totaalStappen,
      moment: stap.moment,
      factuur: f,
      bedrijfsnaam,
      ondertekening,
      betaalgegevens,
    });

    // Claimen vóór het versturen: twee instanties die tegelijk een ronde
    // lopen, mogen samen één herinnering opleveren.
    const claim = await fetch(
      `${d.url}/rest/v1/facturen?id=eq.${f.id}&laatste_stap=eq.${f.laatste_stap}&status=eq.open`,
      {
        method: "PATCH",
        headers: { ...d.headers, Prefer: "return=representation" },
        body: JSON.stringify({
          laatste_stap: stap.stap,
          laatste_herinnering_op: new Date().toISOString(),
          bijgewerkt_op: f.bijgewerkt_op,
        }),
      },
    );
    if (!claim.ok || ((await claim.json()) as unknown[]).length === 0) continue;

    const laatste = stap.stap >= totaalStappen;
    const res = await fetch(`${RESEND}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sleutel}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: afz.afzender_naam
          ? `${afz.afzender_naam} <${afz.afzender_email}>`
          : afz.afzender_email,
        to: [f.klant_email],
        reply_to: afz.afzender_email,
        bcc:
          laatste && kopieBijLaatste
            ? [agent.notify_email || klant?.email].filter(Boolean)
            : undefined,
        subject: onderwerp,
        text: tekst,
        html: opmaak(tekst.split(/\n{2,}/).map(esc)),
      }),
    });
    const j = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok || !j.id) {
      // Terugdraaien: de stap is niet gezet.
      await patch(d, "facturen", `id=eq.${f.id}`, {
        laatste_stap: f.laatste_stap,
        laatste_herinnering_op: f.laatste_herinnering_op,
      }).catch(() => {});
      console.warn("herinnering: versturen mislukt", f.nummer, j.message ?? res.status);
      continue;
    }

    await fetch(`${d.url}/rest/v1/factuur_herinneringen`, {
      method: "POST",
      headers: { ...d.headers, Prefer: "return=minimal" },
      body: JSON.stringify({
        factuur_id: f.id,
        agent_id: agent.id,
        stap: stap.stap,
        moment: stap.moment,
        provider_id: j.id,
        onderwerp,
        tekst,
      }),
    }).catch((e) => console.warn("herinnering: log mislukt", e));
    verstuurd++;
  }
  return verstuurd;
}

let laatsteRonde = 0;
const RONDE_MS = 10 * 60 * 1000;

/** Alle betaalherinnering-agents langs, hoogstens eens per tien minuten. */
export async function rondeHerinneringen(): Promise<void> {
  if (Date.now() - laatsteRonde < RONDE_MS) return;
  laatsteRonde = Date.now();
  const d = db();
  if (!d) return;
  try {
    const agents = await haal<Agent>(
      d,
      `agents?select=id,name,status,client_id,notify_email,opties&kind=eq.betaalherinnering&status=eq.live&limit=100`,
    );
    for (const a of agents) {
      await verstuurHerinneringenVoor(a, d).catch((e) =>
        console.warn("herinneringen: ronde mislukt", a.id, e),
      );
    }
  } catch (e) {
    console.warn("herinneringen: ronde mislukt", e);
  }
}

/**
 * Een debiteur antwoordt op een herinnering. De reeks pauzeert een week, en
 * de klant krijgt het antwoord — dit is het moment waarop een mens het
 * overneemt. Zonder open factuur bij dit adres doen we niets.
 */
export async function verwerkReactie(
  agentId: string,
  vanEmail: string,
  onderwerp: string | null,
  tekst: string,
): Promise<boolean> {
  const d = db();
  if (!d) return false;
  const [agent] = await haal<Agent>(
    d,
    `agents?select=id,name,status,client_id,notify_email,opties&id=eq.${agentId}`,
  );
  if (!agent) return false;
  const stop = (agent.opties ?? {})["stop_bij_antwoord"] !== false;

  const facturen = await haal<Factuur>(
    d,
    `facturen?select=*&agent_id=eq.${agentId}&klant_email=eq.${encodeURIComponent(vanEmail.toLowerCase())}&status=in.(open,gepauzeerd)&order=vervaldatum.asc`,
  );
  if (facturen.length === 0) return false;

  const pauzeTot = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  for (const f of facturen) {
    await patch(d, "facturen", `id=eq.${f.id}`, {
      reactie_op: new Date().toISOString(),
      laatste_reactie: tekst.slice(0, 2000),
      ...(stop ? { pauze_tot: pauzeTot } : {}),
      bijgewerkt_op: new Date().toISOString(),
    });
  }

  const [klant] = await haal<{ name: string; email: string }>(
    d,
    `profiles?select=name,email&id=eq.${agent.client_id}`,
  );
  const aan = [agent.notify_email || klant?.email].filter((x): x is string => !!x);
  if (aan.length > 0) {
    const nummers = facturen.map((f) => f.nummer).join(", ");
    await stuurMail({
      aan,
      onderwerp: `Reactie op een betaalherinnering (${nummers})`,
      html: opmaak([
        `Hoi ${esc(klant?.name ?? "")},`,
        `<strong>${esc(vanEmail)}</strong> reageerde op een herinnering voor factuur ${esc(nummers)}${onderwerp ? ` met als onderwerp "${esc(onderwerp)}"` : ""}:`,
        `<blockquote style="border-left:3px solid #ccc;margin:0;padding:4px 12px;color:#444">${esc(tekst.slice(0, 1500))}</blockquote>`,
        stop
          ? "De agent wacht nu een week met verdere herinneringen voor dit adres. Dit is het moment voor een mens: beantwoord de mail, of markeer de factuur in je portaal als betaald, gepauzeerd of uit handen."
          : "Je hebt ingesteld dat de agent doorgaat bij een antwoord; kijk even of dat hier klopt.",
      ]),
    }).catch((e) => console.warn("herinnering: melding aan de klant mislukt", e));
  }
  return true;
}
