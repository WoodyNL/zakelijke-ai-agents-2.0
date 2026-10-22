/**
 * Het dagoverzicht: elke werkdag na achten één mail per agent met wat er
 * gisteren gebeurde en wat op de klant wacht.
 *
 * Geen klok, dus: elk verzoek na acht uur Nederlandse tijd kan de ronde
 * aanzwengelen, en de tabel dagrapporten (één regel per agent per dag) zorgt
 * dat een mail nooit twee keer gaat. Alleen voor agents waar de klant het
 * heeft aangezet, en alleen op werkdagen — een maandagochtend-mail over het
 * weekend is prima, een zondagochtend-mail niet.
 *
 * De cijfers komen rechtstreeks uit de tabellen, niet via de
 * kerncijferfuncties: die controleren wie er vraagt en de server is niemand.
 */

import { esc, opmaak, stuurMail } from "@/lib/mail.server";
import { delen } from "@/lib/verzendvenster";

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
async function tel(d: Db, pad: string): Promise<number> {
  const metSelect = pad.includes("select=")
    ? pad
    : `${pad}${pad.includes("?") ? "&" : "?"}select=id`;
  const res = await fetch(`${d.url}/rest/v1/${metSelect}&limit=1000`, { headers: d.headers });
  if (!res.ok) return 0;
  return ((await res.json()) as unknown[]).length;
}

type Agent = {
  id: string;
  name: string;
  kind: string;
  status: string;
  client_id: string;
  notify_email: string | null;
  opties: Record<string, unknown> | null;
};

/** De grenzen van "gisteren" in Nederlandse tijd, als ISO-tijdstippen. */
function gisteren(nu = new Date()): { van: string; tot: string; label: string } {
  // Middernacht vandaag in Nederland: het tijdstip van nu min de minuten die
  // de Nederlandse wandklok sinds middernacht telt. Dat is overal juist, ook
  // op Cloudflare waar de klok op UTC staat.
  const { minuten } = delen(nu);
  const middernachtVandaag = new Date(
    nu.getTime() - minuten * 60_000 - nu.getSeconds() * 1000 - nu.getMilliseconds(),
  );
  const middernachtGisteren = new Date(middernachtVandaag.getTime() - 86_400_000);
  return {
    van: middernachtGisteren.toISOString(),
    tot: middernachtVandaag.toISOString(),
    label: middernachtGisteren.toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "Europe/Amsterdam",
    }),
  };
}

type Regel = { getal: number; tekst: string };

async function cijfersVoor(
  d: Db,
  a: Agent,
  g: { van: string; tot: string },
): Promise<{ regels: Regel[]; wacht: Regel[]; scherm: string }> {
  const tussen = (kolom: string) => `${kolom}=gte.${g.van}&${kolom}=lt.${g.tot}`;
  switch (a.kind) {
    case "chat_assistent":
      return {
        scherm: "/gesprekken",
        regels: [
          {
            getal: await tel(d, `chatgesprekken?agent_id=eq.${a.id}&${tussen("begonnen_op")}`),
            tekst: "gesprekken gestart",
          },
          {
            getal: await tel(d, `lead_requests?agent_id=eq.${a.id}&${tussen("created_at")}`),
            tekst: "contactgegevens achtergelaten",
          },
        ],
        // chatberichten kent geen agent_id; via het gesprek. PostgREST kan dat
        // met een embedded filter op de bovenliggende tabel.
        wacht: [
          {
            getal: await tel(
              d,
              `chatberichten?onbeantwoord=eq.true&${tussen("op")}&chatgesprekken.agent_id=eq.${a.id}&select=id,chatgesprekken!inner(agent_id)`,
            ),
            tekst: "vragen die hij niet kon beantwoorden",
          },
        ],
      };
    case "uitgaande_email":
    case "heractivatie":
      return {
        scherm: "/campagnes",
        regels: [
          {
            getal: await tel(d, `outbound_messages?agent_id=eq.${a.id}&${tussen("verzonden_op")}`),
            tekst: "berichten verstuurd",
          },
          {
            getal: await tel(d, `outbound_replies?agent_id=eq.${a.id}&${tussen("ontvangen_op")}`),
            tekst: "antwoorden binnen",
          },
          {
            getal: await tel(d, `outbound_contacts?agent_id=eq.${a.id}&${tussen("afgemeld_op")}`),
            tekst: "afgemeld",
          },
        ],
        wacht: [
          {
            getal: await tel(d, `outbound_replies?agent_id=eq.${a.id}&afgehandeld_op=is.null`),
            tekst: "antwoorden nog niet afgehandeld",
          },
          {
            // Antwoorden van de agent die niet de deur uit zijn gegaan. Stap 5
            // is het antwoord in een gesprek; staat daar geen verzendmoment op,
            // dan wacht die klant nog — en niemand merkt dat vanzelf, want dit
            // gebeurt in een webhook waar geen mens bij zit.
            getal: await tel(
              d,
              `outbound_messages?agent_id=eq.${a.id}&stap=eq.5&verzonden_op=is.null`,
            ),
            tekst: "antwoorden van de agent niet verstuurd",
          },
        ],
      };
    case "inbox_draft":
      return {
        scherm: "/support",
        regels: [
          {
            getal: await tel(d, `support_mails?agent_id=eq.${a.id}&${tussen("ontvangen_op")}`),
            tekst: "supportmails binnen",
          },
          {
            getal: await tel(d, `support_mails?agent_id=eq.${a.id}&${tussen("verzonden_op")}`),
            tekst: "beantwoord",
          },
        ],
        wacht: [
          {
            getal: await tel(d, `support_mails?agent_id=eq.${a.id}&status=in.(concept,mens_nodig)`),
            tekst: "wachten op jou",
          },
        ],
      };
    case "sales_assistent":
      return {
        scherm: "/leads",
        regels: [
          {
            getal: await tel(d, `sales_leads?agent_id=eq.${a.id}&${tussen("ontvangen_op")}`),
            tekst: "leads binnen",
          },
          {
            getal: await tel(
              d,
              `sales_leads?agent_id=eq.${a.id}&oordeel=eq.past&${tussen("concept_op")}`,
            ),
            tekst: "passen bij jou",
          },
        ],
        wacht: [
          {
            getal: await tel(
              d,
              `sales_leads?agent_id=eq.${a.id}&status=in.(twijfel,gekwalificeerd)&verzonden_op=is.null`,
            ),
            tekst: "wachten op je antwoord",
          },
        ],
      };
    case "whatsapp_followup":
      return {
        scherm: "/whatsapp",
        regels: [
          {
            getal: await tel(
              d,
              `whatsapp_berichten?agent_id=eq.${a.id}&richting=eq.in&${tussen("op")}`,
            ),
            tekst: "vragen via WhatsApp",
          },
          {
            getal: await tel(
              d,
              `whatsapp_berichten?agent_id=eq.${a.id}&richting=eq.uit&door=eq.agent&${tussen("op")}`,
            ),
            tekst: "door de agent beantwoord",
          },
        ],
        wacht: [
          {
            getal: await tel(d, `whatsapp_gesprekken?agent_id=eq.${a.id}&status=eq.overgedragen`),
            tekst: "gesprekken wachten op jou",
          },
        ],
      };
    case "offerte":
      return {
        scherm: "/aanvragen",
        regels: [
          {
            getal: await tel(d, `offerte_aanvragen?agent_id=eq.${a.id}&${tussen("ontvangen_op")}`),
            tekst: "aanvragen binnen",
          },
          {
            getal: await tel(d, `offerte_aanvragen?agent_id=eq.${a.id}&${tussen("verzonden_op")}`),
            tekst: "offertes verstuurd",
          },
        ],
        wacht: [
          {
            getal: await tel(
              d,
              `offerte_aanvragen?agent_id=eq.${a.id}&status=in.(concept,mens_nodig)`,
            ),
            tekst: "concepten wachten op jou",
          },
        ],
      };
    case "betaalherinnering":
      return {
        scherm: "/facturen",
        regels: [
          {
            getal: await tel(
              d,
              `factuur_herinneringen?agent_id=eq.${a.id}&${tussen("verstuurd_op")}`,
            ),
            tekst: "herinneringen verstuurd",
          },
          {
            getal: await tel(d, `facturen?agent_id=eq.${a.id}&${tussen("reactie_op")}`),
            tekst: "debiteuren reageerden",
          },
        ],
        wacht: [
          {
            getal: await tel(
              d,
              `facturen?agent_id=eq.${a.id}&status=eq.open&vervaldatum=lt.${g.tot.slice(0, 10)}`,
            ),
            tekst: "facturen over de termijn",
          },
        ],
      };
    case "reviews":
      return {
        scherm: "/reviews",
        regels: [
          {
            getal: await tel(d, `review_verzoeken?agent_id=eq.${a.id}&${tussen("verstuurd_op")}`),
            tekst: "reviewverzoeken verstuurd",
          },
          {
            getal: await tel(d, `reviews?agent_id=eq.${a.id}&${tussen("aangemaakt_op")}`),
            tekst: "reviews binnen",
          },
        ],
        wacht: [
          {
            getal: await tel(d, `reviews?agent_id=eq.${a.id}&beantwoord_op=is.null`),
            tekst: "reviews zonder antwoord",
          },
        ],
      };
    case "afspraken":
      return {
        scherm: "/afspraken",
        regels: [
          {
            getal: await tel(
              d,
              `afspraken?agent_id=eq.${a.id}&begint_op=gte.${g.tot}&begint_op=lt.${new Date(new Date(g.tot).getTime() + 86_400_000).toISOString()}`,
            ),
            tekst: "afspraken vandaag",
          },
          {
            getal: await tel(
              d,
              `afspraken?agent_id=eq.${a.id}&status=eq.no_show&${tussen("begint_op")}`,
            ),
            tekst: "no-shows gisteren",
          },
        ],
        wacht: [
          {
            getal: await tel(d, `afspraken?agent_id=eq.${a.id}&status=eq.verzet_gevraagd`),
            tekst: "willen verzetten",
          },
        ],
      };
    default:
      return { scherm: "/dashboard", regels: [], wacht: [] };
  }
}

let laatsteRonde = 0;
const RONDE_MS = 30 * 60 * 1000;

export async function rondeDagrapporten(): Promise<void> {
  if (Date.now() - laatsteRonde < RONDE_MS) return;
  laatsteRonde = Date.now();
  const d = db();
  if (!d) return;
  const nu = new Date();
  const { weekdag, minuten } = delen(nu);
  if (weekdag === 0 || weekdag === 6 || minuten < 8 * 60) return;
  const vandaag = `${delen(nu).jaar}-${String(delen(nu).maand).padStart(2, "0")}-${String(delen(nu).dag).padStart(2, "0")}`;

  try {
    const agents = (await (
      await fetch(
        `${d.url}/rest/v1/agents?select=id,name,kind,status,client_id,notify_email,opties&status=eq.live&limit=200`,
        { headers: d.headers },
      )
    ).json()) as Agent[];
    for (const a of agents) {
      if ((a.opties ?? {})["dagrapport"] !== true) continue;
      // Claimen: lukt de insert niet, dan is de mail van vandaag al weg.
      const claim = await fetch(`${d.url}/rest/v1/dagrapporten`, {
        method: "POST",
        headers: { ...d.headers, Prefer: "return=minimal" },
        body: JSON.stringify({ agent_id: a.id, datum: vandaag }),
      });
      if (!claim.ok) continue;
      try {
        const [klant] = (await (
          await fetch(`${d.url}/rest/v1/profiles?select=name,email&id=eq.${a.client_id}`, {
            headers: d.headers,
          })
        ).json()) as Array<{ name: string; email: string }>;
        const aan = [a.notify_email || klant?.email].filter((x): x is string => !!x);
        if (aan.length === 0) continue;
        const g = gisteren(nu);
        const { regels, wacht, scherm } = await cijfersVoor(d, a, g);
        const basis = process.env["SITE_URL"] ?? "https://zakelijkeaiagents.nl";
        await stuurMail({
          aan,
          onderwerp: `${a.name}: ${g.label}`,
          html: opmaak(
            [
              `Hoi ${esc(klant?.name ?? "")},`,
              `Wat <strong>${esc(a.name)}</strong> gisteren deed:`,
              `<ul style="margin:0;padding-left:18px">${regels.map((r) => `<li><strong>${r.getal}</strong> ${esc(r.tekst)}</li>`).join("")}</ul>`,
              wacht.some((w) => w.getal > 0)
                ? `Wat op jou wacht: ${wacht
                    .filter((w) => w.getal > 0)
                    .map((w) => `<strong>${w.getal}</strong> ${esc(w.tekst)}`)
                    .join(", ")}.`
                : "Er wacht niets op je.",
            ],
            { tekst: "Open het portaal", url: `${basis}${scherm}` },
          ),
        });
      } catch (e) {
        console.warn("dagrapport: mislukt", a.id, e);
      }
    }
  } catch (e) {
    console.warn("dagrapport: ronde mislukt", e);
  }
}
