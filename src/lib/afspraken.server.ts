/**
 * De afsprakenagent aan het werk: herinneren, antwoorden lezen, na een
 * no-show opvolgen, en een vrijgekomen plek aan de wachtlijst aanbieden.
 *
 * Zonder klok, net als de rest: de ronde lift mee op het verkeer, hoogstens
 * eens per vijf minuten. Dat is fijnmazig genoeg voor een herinnering "twee
 * uur vooraf".
 *
 * Wat de agent nooit zelf doet: een afspraak verzetten. Wie wil verzetten,
 * komt bij een mens terecht; de agent legt alleen vast dát iemand dat wil en
 * zegt het tegen de ondernemer. Zonder agendakoppeling kán hij ook niet meer,
 * en mét koppeling begint hij alleen-lezend — dat is de instelling.
 */

import { esc, opmaak, stuurMail } from "@/lib/mail.server";
import {
  herinneringNodig,
  herinneringTekst,
  leesAntwoord,
  leesHerinnerUren,
  noShowTekst,
  wachtlijstTekst,
} from "@/lib/afspraken";

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
async function patch(
  d: Db,
  tabel: string,
  filter: string,
  velden: Record<string, unknown>,
  representatie = false,
): Promise<unknown[]> {
  const res = await fetch(`${d.url}/rest/v1/${tabel}?${filter}`, {
    method: "PATCH",
    headers: { ...d.headers, Prefer: representatie ? "return=representation" : "return=minimal" },
    body: JSON.stringify({ ...velden, bijgewerkt_op: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`Bijwerken mislukt [${res.status}]: ${tabel}`);
  return representatie ? ((await res.json()) as unknown[]) : [];
}

type Agent = {
  id: string;
  name: string;
  status: string;
  client_id: string;
  notify_email: string | null;
  opties: Record<string, unknown> | null;
};
type Afspraak = {
  id: string;
  agent_id: string;
  klant_naam: string | null;
  klant_email: string;
  begint_op: string;
  omschrijving: string | null;
  locatie: string | null;
  status: string;
  herinnerd: number[];
  no_show_opgevolgd_op: string | null;
};
type Afzender = {
  afzender_naam: string | null;
  afzender_email: string | null;
  ondertekening: string | null;
};

async function afzenderVan(
  d: Db,
  agent: Agent,
): Promise<
  | (Afzender & {
      bedrijfsnaam: string;
      ondertekening: string;
      klantEmail: string | null;
      klantNaam: string | null;
    })
  | null
> {
  const [afz] = await haal<Afzender>(
    d,
    `support_instellingen?select=afzender_naam,afzender_email,ondertekening&agent_id=eq.${agent.id}`,
  );
  if (!afz?.afzender_email) return null;
  const [klant] = await haal<{ name: string; email: string }>(
    d,
    `profiles?select=name,email&id=eq.${agent.client_id}`,
  );
  const bedrijfsnaam = afz.afzender_naam || klant?.name || agent.name;
  return {
    ...afz,
    bedrijfsnaam,
    ondertekening: afz.ondertekening || `Met vriendelijke groet,\n${bedrijfsnaam}`,
    klantEmail: klant?.email ?? null,
    klantNaam: klant?.name ?? null,
  };
}

async function mailVanAgent(
  afz: { afzender_naam: string | null; afzender_email: string | null },
  aan: string,
  onderwerp: string,
  tekst: string,
): Promise<string | null> {
  const sleutel = process.env["RESEND_API_KEY"];
  if (!sleutel || !afz.afzender_email) return null;
  const res = await fetch(`${RESEND}/emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sleutel}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: afz.afzender_naam ? `${afz.afzender_naam} <${afz.afzender_email}>` : afz.afzender_email,
      to: [aan],
      reply_to: afz.afzender_email,
      subject: onderwerp,
      text: tekst,
      html: opmaak(tekst.split(/\n{2,}/).map(esc)),
    }),
  });
  const j = (await res.json().catch(() => ({}))) as { id?: string };
  return res.ok && j.id ? j.id : null;
}

export async function rondeVoor(agent: Agent, d: Db): Promise<number> {
  if (agent.status !== "live") return 0;
  const opties = agent.opties ?? {};
  const uren = leesHerinnerUren(opties["herinneren_op"]);
  const verzettenTot = Number(opties["verzetten_tot"]);
  const naNoShow = opties["na_no_show"] !== false;
  const afz = await afzenderVan(d, agent);
  if (!afz) return 0;
  let n = 0;
  const nu = new Date();

  // Herinneringen voor wat eraan komt (de komende twee weken is ruim genoeg).
  const komend = await haal<Afspraak>(
    d,
    `afspraken?select=*&agent_id=eq.${agent.id}&status=in.(gepland,bevestigd)&begint_op=gte.${nu.toISOString()}&begint_op=lte.${new Date(nu.getTime() + 14 * 86_400_000).toISOString()}&order=begint_op.asc&limit=300`,
  );
  for (const a of komend) {
    const uur = herinneringNodig(
      {
        begint_op: a.begint_op,
        status: a.status,
        herinnerd: Array.isArray(a.herinnerd) ? a.herinnerd : [],
      },
      uren,
      nu,
    );
    if (uur === null) continue;
    // Claimen: de lijst 'herinnerd' bijwerken vóór het versturen, met de oude
    // waarde als voorwaarde zodat twee instanties niet allebei versturen.
    const geclaimd = await patch(
      d,
      "afspraken",
      `id=eq.${a.id}&herinnerd=eq.${encodeURIComponent(JSON.stringify(a.herinnerd ?? []))}`,
      { herinnerd: [...(a.herinnerd ?? []), uur] },
      true,
    );
    if (geclaimd.length === 0) continue;
    const { onderwerp, tekst } = herinneringTekst({
      uren: uur,
      afspraak: a,
      bedrijfsnaam: afz.bedrijfsnaam,
      ondertekening: afz.ondertekening,
      verzettenTotUur: Number.isFinite(verzettenTot) ? verzettenTot : 24,
    });
    if (await mailVanAgent(afz, a.klant_email, onderwerp, tekst)) n++;
  }

  // Na een no-show: één vriendelijk bericht, als dat aanstaat.
  if (naNoShow) {
    const gemist = await haal<Afspraak>(
      d,
      `afspraken?select=*&agent_id=eq.${agent.id}&status=eq.no_show&no_show_opgevolgd_op=is.null&begint_op=gte.${new Date(nu.getTime() - 14 * 86_400_000).toISOString()}&limit=50`,
    );
    for (const a of gemist) {
      const geclaimd = await patch(
        d,
        "afspraken",
        `id=eq.${a.id}&no_show_opgevolgd_op=is.null`,
        { no_show_opgevolgd_op: nu.toISOString() },
        true,
      );
      if (geclaimd.length === 0) continue;
      const { onderwerp, tekst } = noShowTekst({
        klant_naam: a.klant_naam,
        begint_op: a.begint_op,
        bedrijfsnaam: afz.bedrijfsnaam,
        ondertekening: afz.ondertekening,
      });
      if (await mailVanAgent(afz, a.klant_email, onderwerp, tekst)) n++;
    }
  }
  return n;
}

let laatsteRonde = 0;
const RONDE_MS = 5 * 60 * 1000;
export async function rondeAfspraken(): Promise<void> {
  if (Date.now() - laatsteRonde < RONDE_MS) return;
  laatsteRonde = Date.now();
  const d = db();
  if (!d) return;
  try {
    const agents = await haal<Agent>(
      d,
      `agents?select=id,name,status,client_id,notify_email,opties&kind=eq.afspraken&status=eq.live&limit=100`,
    );
    for (const a of agents)
      await rondeVoor(a, d).catch((e) => console.warn("afspraken: ronde mislukt", a.id, e));
  } catch (e) {
    console.warn("afspraken: ronde mislukt", e);
  }
}

/**
 * Een klant antwoordt op een herinnering. Ja: bevestigd. Verzetten of
 * annuleren of onduidelijk: vastleggen en de ondernemer mailen. Bij een
 * annulering met wachtlijst aan: de plek aanbieden aan de eerste die wacht.
 */
export async function verwerkAntwoordOpAfspraak(
  agentId: string,
  vanEmail: string,
  tekst: string,
): Promise<boolean> {
  const d = db();
  if (!d) return false;
  const [agent] = await haal<Agent>(
    d,
    `agents?select=id,name,status,client_id,notify_email,opties&id=eq.${agentId}`,
  );
  if (!agent) return false;
  const [a] = await haal<Afspraak>(
    d,
    `afspraken?select=*&agent_id=eq.${agentId}&klant_email=eq.${encodeURIComponent(vanEmail.toLowerCase())}&status=in.(gepland,bevestigd,verzet_gevraagd)&begint_op=gte.${new Date(Date.now() - 2 * 3_600_000).toISOString()}&order=begint_op.asc&limit=1`,
  );
  if (!a) return false;

  const soort = leesAntwoord(tekst);
  const nu = new Date().toISOString();
  const velden: Record<string, unknown> = { reactie_op: nu, laatste_reactie: tekst.slice(0, 2000) };
  if (soort === "bevestigd") Object.assign(velden, { status: "bevestigd", bevestigd_op: nu });
  if (soort === "verzetten") velden["status"] = "verzet_gevraagd";
  if (soort === "annuleren") velden["status"] = "geannuleerd";
  await patch(d, "afspraken", `id=eq.${a.id}`, velden);

  const afz = await afzenderVan(d, agent);
  const aan = [agent.notify_email || afz?.klantEmail].filter((x): x is string => !!x);

  // De ondernemer hoort alles behalve een simpele ja.
  if (soort !== "bevestigd" && aan.length > 0) {
    const kop =
      soort === "verzetten"
        ? "wil verzetten"
        : soort === "annuleren"
          ? "zegt af"
          : "antwoordde, maar onduidelijk";
    await stuurMail({
      aan,
      onderwerp: `Afspraak ${new Date(a.begint_op).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" })}: ${a.klant_naam || a.klant_email} ${kop}`,
      html: opmaak([
        `Hoi ${esc(afz?.klantNaam ?? "")},`,
        `<strong>${esc(a.klant_naam || a.klant_email)}</strong> reageerde op de herinnering voor de afspraak van ${esc(new Date(a.begint_op).toLocaleString("nl-NL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" }))}:`,
        `<blockquote style="border-left:3px solid #ccc;margin:0;padding:4px 12px;color:#444">${esc(tekst.slice(0, 1500))}</blockquote>`,
        soort === "verzetten"
          ? "De agent heeft de afspraak op 'verzetten gevraagd' gezet. Plan een nieuw moment en pas de afspraak aan in je portaal."
          : soort === "annuleren"
            ? "De afspraak staat nu op geannuleerd."
            : "De agent kon dit niet met zekerheid lezen en heeft niets veranderd aan de afspraak.",
      ]),
    }).catch((e) => console.warn("afspraken: melding mislukt", e));
  }

  // Een plek vrij, en een wachtlijst: aanbieden aan de eerste.
  if (soort === "annuleren" && (agent.opties ?? {})["wachtlijst"] === true && afz) {
    const [w] = await haal<{ id: string; naam: string | null; email: string }>(
      d,
      `afspraak_wachtlijst?select=id,naam,email&agent_id=eq.${agentId}&status=eq.wacht&order=aangemaakt_op.asc&limit=1`,
    );
    if (w) {
      const { onderwerp, tekst: t } = wachtlijstTekst({
        naam: w.naam,
        begint_op: a.begint_op,
        bedrijfsnaam: afz.bedrijfsnaam,
        ondertekening: afz.ondertekening,
      });
      if (await mailVanAgent(afz, w.email, onderwerp, t)) {
        await fetch(`${d.url}/rest/v1/afspraak_wachtlijst?id=eq.${w.id}`, {
          method: "PATCH",
          headers: { ...d.headers, Prefer: "return=minimal" },
          body: JSON.stringify({ status: "aangeboden", aangeboden_op: nu }),
        }).catch(() => {});
      }
    }
  }
  return true;
}
