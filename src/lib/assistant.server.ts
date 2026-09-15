import { SITE } from "@/content/site";
import type { LeadData } from "./leads.server";

/**
 * Serverzijde van de website-assistent. Apart bestand omdat *.functions.ts naar
 * de clientbundle kan lekken: de API-sleutel en de systeemprompt mogen daar
 * nooit terechtkomen. Laad dit met een dynamische import binnen een handler.
 */

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 700;

export type ChatBericht = { role: "user" | "assistant"; content: string };

type KennisItem = { category: string; title: string; question: string | null; content: string };

/**
 * Haalt de actieve kennisitems op met de publieke sleutel. Sinds de migratie van
 * 15 september mogen anonieme lezers die zien, dus hier is geen service-role
 * nodig — wat belangrijk is, want dit project draait op Lovable Cloud waar die
 * sleutel niet beschikbaar is voor lokale ontwikkeling. Valt terug op de
 * service-role als de publieke sleutel in een omgeving ontbreekt.
 */
export async function haalKennis(): Promise<KennisItem[]> {
  const url = process.env["SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Supabase-omgevingsvariabelen ontbreken");

  const res = await fetch(
    `${url}/rest/v1/knowledge_items?select=category,title,question,content&is_active=eq.true&order=category,sort_order&limit=500`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) throw new Error(`Kennisbank ophalen mislukt [${res.status}]`);
  return (await res.json()) as KennisItem[];
}

function kennisAlsTekst(items: KennisItem[]) {
  const perCategorie = new Map<string, KennisItem[]>();
  for (const item of items) {
    const lijst = perCategorie.get(item.category) ?? [];
    lijst.push(item);
    perCategorie.set(item.category, lijst);
  }

  return [...perCategorie]
    .map(([categorie, lijst]) => {
      const regels = lijst.map((i) => {
        const vraag = i.question ? `\nVraag die hierbij hoort: ${i.question}` : "";
        return `### ${i.title}${vraag}\n${i.content}`;
      });
      return `## ${categorie.toUpperCase()}\n\n${regels.join("\n\n")}`;
    })
    .join("\n\n");
}

/**
 * Veelgevraagde totalen, vooraf uitgerekend. Een taalmodel dat zelf optelt maakt
 * fouten die overtuigend klinken: bij het testen gaf dezelfde vraag een keer
 * €1.280 en een keer €1.285. De instructie "niet rekenen" wordt genegeerd zodra
 * iemand er expliciet om vraagt, dus krijgt hij de uitkomsten gewoon aangereikt.
 *
 * De bedragen staan hier als getal zodat de sommen kloppen per definitie. Wijzig
 * je de tarieven in site.ts, pas deze constanten dan mee aan.
 */
const AGENT_EENMALIG = 795;
const AGENT_MAAND = 495;
const EXTRA_AGENT_MAAND = 395;
const PARTNER_MAAND = 2450;
const TRAJECT_VANAF = 4500;
const TRAJECT_BEHEER_MAAND = 395;

function euro(bedrag: number) {
  return `€${bedrag.toLocaleString("nl-NL")}`;
}

function rekenhulp() {
  const agents = (aantal: number) =>
    `${aantal} agents: ${euro(AGENT_EENMALIG)} eenmalig en ${euro(
      AGENT_MAAND + EXTRA_AGENT_MAAND * (aantal - 1),
    )} per maand`;

  return [
    agents(2),
    agents(3),
    agents(4),
    `AI-partner per jaar: ${euro(PARTNER_MAAND * 12)}`,
    `AI-traject eerste jaar: vanaf ${euro(TRAJECT_VANAF)} eenmalig plus ${euro(
      TRAJECT_BEHEER_MAAND * 12,
    )} beheer`,
  ]
    .map((r) => `- ${r}`)
    .join("\n");
}

export function bouwSysteemprompt(items: KennisItem[]) {
  return `Je bent de website-assistent van ${SITE.name}, een AI-agency uit Amsterdam voor het Nederlandse mkb. Je praat met bezoekers van zakelijkeaiagents.nl.

## Hoe je praat
Zakelijk en vriendelijk. Je klinkt als een ervaren adviseur die de tijd neemt, niet als een chatbot en niet als een verkoper.

- Nederlands, "je" en "jij". Nooit "u".
- Kort. Twee tot vier zinnen per antwoord, tenzij iemand expliciet om details vraagt.
- Beleefd en behulpzaam, maar zonder overdreven enthousiasme. Geen uitroeptekens, geen "geweldige vraag", geen "wat leuk dat je dat vraagt".
- Geen marketingtaal en geen vulling. Schrap woorden als "krachtig", "naadloos", "op maat gemaakt", "in een handomdraai". Zeg wat iets doet, niet hoe bijzonder het is.
- Gebruik nooit het teken — of het teken –. Schrijf in gewone zinnen met komma's en punten. Wil je iets toelichten, begin dan een nieuwe zin.
- Geen opsommingen tenzij je echt een lijstje opnoemt, bijvoorbeeld wat er in een pakket zit.
- Denk mee in plaats van te antwoorden op de letter. Begrijp je de situatie nog niet goed genoeg, stel dan één gerichte wedervraag voordat je met een oplossing komt.
- Je bent geen verkoper die alles wil sluiten. Je helpt iemand uitzoeken of dit bij hem past.

## Nooit zelf rekenen
Noem bedragen altijd precies zoals ze hieronder staan. Tel nooit zelf prijzen bij elkaar op en reken nooit zelf een totaal, een korting of een jaarbedrag uit. Een verkeerd opgeteld bedrag is schadelijker dan geen bedrag: de bezoeker onthoudt het en komt er later mee terug.

Deze totalen zijn al uitgerekend en mag je letterlijk gebruiken:

${rekenhulp()}

Staat een gevraagde combinatie hier niet bij, noem dan de losse onderdelen en zeg erbij dat Wouter het exacte totaal in de verkenning doorneemt.

## Wat je wel en niet weet
Alles wat je over dit bedrijf zegt, moet uit de kennis hieronder komen. Dat geldt in het bijzonder voor prijzen, doorlooptijden en wat er in een pakket zit.

Weet je iets niet, zeg dat dan gewoon: "Dat weet ik niet precies — dat kun je het beste even met Wouter bespreken." Verzin nooit een prijs, een termijn of een belofte. Een verkeerd antwoord kost dit bedrijf een klant; een eerlijk "dat weet ik niet" niet.

Past AI niet bij wat iemand beschrijft, zeg dat dan ook. Dit bedrijf zegt liever nee dan dat het iets verkoopt wat niet werkt — dat is hun hele positionering.

## Over contactgegevens
Toont iemand echte interesse — vraagt naar een kennismaking, wil de AI-scan, of vraagt wat het in zijn situatie zou kosten — bied dan aan om zijn gegevens door te geven, zodat Wouter binnen één werkdag contact opneemt.

Zegt iemand ja, vraag dan om naam, bedrijf en e-mailadres. Vraag ze in één bericht, niet één voor één. Heb je alle drie, gebruik dan het gereedschap leg_contact_vast.

Dring niet aan. Vraagt iemand alleen iets op, laat hem dan gewoon iets opvragen. Eén keer aanbieden is genoeg.

## De kennis

${kennisAlsTekst(items)}

## Als laatste
Kom je er samen niet uit, verwijs dan naar het contactformulier op de pagina of naar ${SITE.email}. De gratis AI-verkenning van 30 minuten is altijd een goede volgende stap: vrijblijvend, en ze zeggen eerlijk of AI iets oplevert.`;
}

export const LEAD_TOOL = {
  name: "leg_contact_vast",
  description:
    "Leg de contactgegevens van een geïnteresseerde bezoeker vast, zodat er binnen één werkdag contact met hem wordt opgenomen. Gebruik dit pas als je naam, bedrijf én e-mailadres hebt, en de bezoeker heeft aangegeven dat hij contact wil.",
  input_schema: {
    type: "object" as const,
    properties: {
      naam: { type: "string", description: "Voor- en achternaam van de bezoeker" },
      bedrijf: { type: "string", description: "Bedrijfsnaam" },
      email: { type: "string", description: "E-mailadres" },
      telefoon: { type: "string", description: "Telefoonnummer, alleen als de bezoeker het geeft" },
      samenvatting: {
        type: "string",
        description:
          "Korte samenvatting van waar het gesprek over ging en waar de bezoeker tegenaan loopt, in het Nederlands",
      },
    },
    required: ["naam", "bedrijf", "email"],
  },
};

type ToolInvoer = {
  naam: string;
  bedrijf: string;
  email: string;
  telefoon?: string;
  samenvatting?: string;
};

/** Zet de gegevens uit het gereedschap om naar een lead en legt hem vast. */
export async function verwerkLead(invoer: ToolInvoer) {
  const { storeLead, notifyByEmail } = await import("./leads.server");
  const data: LeadData = {
    name: invoer.naam,
    company: invoer.bedrijf,
    email: invoer.email,
    phone: invoer.telefoon ?? "",
    stage: "Via de website-assistent",
    message: invoer.samenvatting ?? "",
  };

  const [opgeslagen, gemaild] = await Promise.all([
    storeLead(data).then(
      () => true,
      (err: unknown) => {
        console.error("assistent: lead opslaan mislukt:", err);
        return false;
      },
    ),
    notifyByEmail(data).then(
      () => true,
      (err: unknown) => {
        console.error("assistent: leadmelding mislukt:", err);
        return false;
      },
    ),
  ]);

  return { opgeslagen, gemaild, gelukt: opgeslagen || gemaild };
}

type AnthropicBlok =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown };

type AnthropicAntwoord = {
  content: AnthropicBlok[];
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
};

async function roepClaude(systeem: string, berichten: unknown[]): Promise<AnthropicAntwoord> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY ontbreekt");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // De hele kennisbank zit in de systeemprompt en is bij elke vraag
      // identiek. Met cache_control betaal je die maar één keer vol; daarna
      // wordt het voorvoegsel (gereedschap plus systeemprompt) uit de cache
      // gelezen tegen een fractie van de prijs. Dat scheelt het meeste bij een
      // gesprek van meerdere beurten, precies wat hier gebeurt.
      system: [{ type: "text", text: systeem, cache_control: { type: "ephemeral" } }],
      tools: [LEAD_TOOL],
      messages: berichten,
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic gaf ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return (await res.json()) as AnthropicAntwoord;
}

/**
 * Voert één beurt uit: vraagt Claude om een antwoord, legt een lead vast als hij
 * daarom vraagt, en haalt daarna het afsluitende bericht op. Meer dan één
 * gereedschapsronde is hier niet nodig — er is maar één gereedschap.
 */
export async function beantwoord(berichten: ChatBericht[]) {
  const kennis = await haalKennis();
  const systeem = bouwSysteemprompt(kennis);

  const verloop: unknown[] = berichten.map((b) => ({ role: b.role, content: b.content }));
  let antwoord = await roepClaude(systeem, verloop);
  let leadVastgelegd = false;

  const toolBlok = antwoord.content.find((b) => b.type === "tool_use");
  if (toolBlok && toolBlok.type === "tool_use") {
    const resultaat = await verwerkLead(toolBlok.input as ToolInvoer);
    leadVastgelegd = resultaat.gelukt;

    verloop.push({ role: "assistant", content: antwoord.content });
    verloop.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolBlok.id,
          content: resultaat.gelukt
            ? "Gelukt. De gegevens zijn doorgegeven; er wordt binnen één werkdag contact opgenomen."
            : "Mislukt. Vraag de bezoeker om het contactformulier op de pagina te gebruiken of te mailen naar " +
              SITE.email,
        },
      ],
    });

    antwoord = await roepClaude(systeem, verloop);
  }

  const tekst = antwoord.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return {
    tekst: tekst || "Sorry, daar kwam ik even niet uit. Stel je vraag gerust anders.",
    leadVastgelegd,
    verbruik: antwoord.usage,
  };
}
