import { SITE } from "@/content/site";
import type { LeadData } from "./leads.server";

/**
 * Serverzijde van de website-assistent. Apart bestand omdat *.functions.ts naar
 * de clientbundle kan lekken: de API-sleutel en de systeemprompt mogen daar
 * nooit terechtkomen. Laad dit met een dynamische import binnen een handler.
 */

// Sonnet in plaats van Haiku. Haiku maakte Nederlandse spelfouten
// ("binnenkrigen"), weidde uit ondanks de lengteafspraak en produceerde
// markdown die in de chatbubbel letterlijk in beeld kwam. Gemeten op dezelfde
// vragen was Sonnet bovendien niet trager en gaf hij kórtere antwoorden, omdat
// hij zich wel aan de instructies houdt. Dit is de etalage van een AI-agency;
// kromme zinnen kosten hier meer dan het prijsverschil per token.
const MODEL = "claude-sonnet-5";
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
export const EIGEN_AGENT_SLUG = "website-assistent";

export type AgentConfig = {
  id: string;
  name: string;
  welcome_text: string | null;
  tone: string | null;
  model: string;
  capture_leads: boolean;
  allowed_domains: string[];
  rate_limit_per_hour: number;
};

function supabaseRest(serviceRole = false) {
  const url = process.env["SUPABASE_URL"];
  const key = serviceRole
    ? process.env["SUPABASE_SERVICE_ROLE_KEY"]
    : (process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"]);
  if (!url || !key) return null;
  return {
    url,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  };
}

/**
 * De publieke instellingen van een agent. Alles hierin is van buitenaf toch
 * waarneembaar zodra de agent draait, dus het mag langs de publieke sleutel.
 * Kort gecachet: instellingen wijzigen zelden, en anders kost elke vraag een
 * extra rondje naar de database.
 */
const configCache = new Map<string, { config: AgentConfig; tot: number }>();
const CACHE_MS = 60_000;

export async function haalAgent(slug: string): Promise<AgentConfig> {
  const bekend = configCache.get(slug);
  if (bekend && bekend.tot > Date.now()) return bekend.config;

  const rest = supabaseRest();
  if (!rest) throw new Error("Supabase-omgevingsvariabelen ontbreken");

  const res = await fetch(`${rest.url}/rest/v1/rpc/agent_public_config`, {
    method: "POST",
    headers: rest.headers,
    body: JSON.stringify({ _slug: slug }),
  });
  if (!res.ok) throw new Error(`Agent ophalen mislukt [${res.status}]`);

  const rijen = (await res.json()) as AgentConfig[];
  const config = rijen[0];
  if (!config) throw new Error(`Geen live agent met slug "${slug}"`);

  configCache.set(slug, { config, tot: Date.now() + CACHE_MS });
  return config;
}

/**
 * De gevoelige instellingen: waar leads naartoe gaan en de maatwerkinstructies
 * van een klant. Die blijven achter de service-role en zijn daarom lokaal niet
 * beschikbaar, waar alleen de publieke sleutel staat. Lokaal val je terug op de
 * standaarden, wat prima is: ze doen er pas toe zodra er echte klanten zijn.
 */
export async function haalPrivateConfig(agentId: string) {
  const rest = supabaseRest(true);
  if (!rest) return { notify_email: null, extra_instructions: null };

  const res = await fetch(
    `${rest.url}/rest/v1/agents?select=notify_email,extra_instructions&id=eq.${encodeURIComponent(agentId)}`,
    { headers: rest.headers },
  );
  if (!res.ok) return { notify_email: null, extra_instructions: null };

  const rijen = (await res.json()) as Array<{
    notify_email: string | null;
    extra_instructions: string | null;
  }>;
  return rijen[0] ?? { notify_email: null, extra_instructions: null };
}

/**
 * Mag deze agent op dit domein draaien? Een lege lijst betekent overal, en is
 * alleen bedoeld voor een agent die nog wordt opgezet. Zonder deze controle kan
 * iedereen die het embed-script kopieert een agent op jouw rekening laten
 * draaien.
 */
export function domeinToegestaan(config: AgentConfig, origin: string | null): boolean {
  if (config.allowed_domains.length === 0) return true;
  if (!origin) return false;

  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }

  return config.allowed_domains.some((toegestaan) => {
    const d = toegestaan.trim().toLowerCase();
    return host === d || host.endsWith(`.${d}`);
  });
}

/** Hoogt de teller op en zegt of dit verzoek nog binnen de uurgrens valt. */
export async function binnenLimiet(agentId: string): Promise<boolean> {
  const rest = supabaseRest();
  if (!rest) return true;

  const res = await fetch(`${rest.url}/rest/v1/rpc/claim_agent_request`, {
    method: "POST",
    headers: rest.headers,
    body: JSON.stringify({ _agent_id: agentId }),
  });
  // Faalt de telling zelf, dan laten we het verzoek door: een kapotte teller
  // mag geen werkende assistent stilleggen. De uitgave blijft begrensd door het
  // maandplafond op het Anthropic-account.
  if (!res.ok) {
    console.warn("assistent: verbruik tellen mislukt", res.status);
    return true;
  }
  return (await res.json()) === true;
}

/**
 * Haalt de actieve kennisitems van één agent op. De filter hieronder zorgt voor
 * de juiste uitkomst; RLS zorgt voor de garantie dat dit nooit de kennis van een
 * andere klant kan opleveren. Beide lagen staan er bewust.
 */
export async function haalKennis(agentId: string): Promise<KennisItem[]> {
  const rest = supabaseRest();
  if (!rest) throw new Error("Supabase-omgevingsvariabelen ontbreken");

  const res = await fetch(
    `${rest.url}/rest/v1/knowledge_items` +
      `?select=category,title,question,content` +
      `&agent_id=eq.${encodeURIComponent(agentId)}` +
      `&is_active=eq.true&order=category,sort_order&limit=500`,
    { headers: rest.headers },
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

export function bouwSysteemprompt(
  items: KennisItem[],
  config?: AgentConfig,
  extraInstructies?: string | null,
) {
  const toon = config?.tone ? `\n\nExtra over de toon voor deze agent: ${config.tone}` : "";
  const extra = extraInstructies ? `\n\n## Aanvullende instructies\n${extraInstructies}` : "";
  return `Je bent de website-assistent van ${SITE.name}, een AI-agency uit Amsterdam voor het Nederlandse mkb. Je praat met bezoekers van zakelijkeaiagents.nl.

## Hoe je praat
Zakelijk en vriendelijk. Je klinkt als een ervaren adviseur die de tijd neemt, niet als een chatbot en niet als een verkoper.

- Nederlands, "je" en "jij". Nooit "u".
- Kort. Twee tot vier zinnen per antwoord, tenzij iemand expliciet om details vraagt.
- Beleefd en behulpzaam, maar zonder overdreven enthousiasme. Geen uitroeptekens, geen "geweldige vraag", geen "wat leuk dat je dat vraagt".
- Geen marketingtaal en geen vulling. Schrap woorden als "krachtig", "naadloos", "op maat gemaakt", "in een handomdraai". Zeg wat iets doet, niet hoe bijzonder het is.
- Gebruik nooit het teken — of het teken –. Schrijf in gewone zinnen met komma's en punten. Wil je iets toelichten, begin dan een nieuwe zin.
- Schrijf platte tekst. Geen markdown: geen sterretjes voor vet, geen kopjes met #, geen genummerde lijsten. Je antwoord verschijnt in een chatvenster dat opmaak niet weergeeft, dus sterretjes komen letterlijk in beeld.
- Geen opsommingen tenzij je echt een lijstje opnoemt, bijvoorbeeld wat er in een pakket zit. Schrijf dat dan als gewone zinnen achter elkaar.
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
Kom je er samen niet uit, verwijs dan naar het contactformulier op de pagina of naar ${SITE.email}. De gratis AI-verkenning van 30 minuten is altijd een goede volgende stap: vrijblijvend, en ze zeggen eerlijk of AI iets oplevert.${toon}${extra}`;
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
export async function verwerkLead(
  invoer: ToolInvoer,
  agentId: string,
  notifyEmail?: string | null,
) {
  const { storeLead, notifyByEmail } = await import("./leads.server");
  const data: LeadData = {
    name: invoer.naam,
    company: invoer.bedrijf,
    email: invoer.email,
    phone: invoer.telefoon ?? "",
    stage: "Via de website-assistent",
    message: invoer.samenvatting ?? "",
    agentId,
  };

  const [opgeslagen, gemaild] = await Promise.all([
    storeLead(data).then(
      () => true,
      (err: unknown) => {
        console.error("assistent: lead opslaan mislukt:", err);
        return false;
      },
    ),
    notifyByEmail(data, notifyEmail ?? undefined).then(
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

async function roepClaude(
  systeem: string,
  berichten: unknown[],
  config: AgentConfig,
): Promise<AnthropicAntwoord> {
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
      model: config.model || MODEL,
      max_tokens: MAX_TOKENS,
      // De hele kennisbank zit in de systeemprompt en is bij elke vraag
      // identiek. Met cache_control betaal je die maar één keer vol; daarna
      // wordt het voorvoegsel (gereedschap plus systeemprompt) uit de cache
      // gelezen tegen een fractie van de prijs. Dat scheelt het meeste bij een
      // gesprek van meerdere beurten, precies wat hier gebeurt.
      system: [{ type: "text", text: systeem, cache_control: { type: "ephemeral" } }],
      tools: config.capture_leads ? [LEAD_TOOL] : [],
      messages: berichten,
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic gaf ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return (await res.json()) as AnthropicAntwoord;
}

/**
 * Haalt gedachtestreepjes uit het antwoord. De promptregel hierover wordt
 * onbetrouwbaar opgevolgd: bij het testen kwamen ze steeds terug zodra een zin
 * zich ervoor leende. Een taalmodel vragen iets te laten is zwakker dan het
 * daarna gewoon weghalen, dus doen we dat hier.
 */
function zonderStreepjes(tekst: string) {
  return tekst
    .replace(/\s+[\u2014\u2013]\s+/g, ", ")
    .replace(/\s*[\u2014\u2013]\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+,/g, ",")
    .replace(/,\s*([.!?])/g, "$1");
}

/**
 * Voert één beurt uit: vraagt Claude om een antwoord, legt een lead vast als hij
 * daarom vraagt, en haalt daarna het afsluitende bericht op. Meer dan één
 * gereedschapsronde is hier niet nodig — er is maar één gereedschap.
 */
export async function beantwoord(
  berichten: ChatBericht[],
  slug = EIGEN_AGENT_SLUG,
  origin: string | null = null,
) {
  const config = await haalAgent(slug);

  if (!domeinToegestaan(config, origin)) {
    throw new Error(`Agent "${slug}" mag niet draaien op ${origin ?? "een onbekend domein"}`);
  }

  if (!(await binnenLimiet(config.id))) {
    return {
      tekst:
        "Het is nu erg druk met vragen. Probeer het over een uurtje nog eens, of stuur je vraag per e-mail.",
      leadVastgelegd: false,
      verbruik: { input_tokens: 0, output_tokens: 0 },
    };
  }

  const [kennis, prive] = await Promise.all([haalKennis(config.id), haalPrivateConfig(config.id)]);
  const systeem = bouwSysteemprompt(kennis, config, prive.extra_instructions);

  const verloop: unknown[] = berichten.map((b) => ({ role: b.role, content: b.content }));
  let antwoord = await roepClaude(systeem, verloop, config);
  let leadVastgelegd = false;

  const toolBlok = antwoord.content.find((b) => b.type === "tool_use");
  if (toolBlok && toolBlok.type === "tool_use") {
    const resultaat = await verwerkLead(toolBlok.input as ToolInvoer, config.id, prive.notify_email);
    leadVastgelegd = resultaat.gelukt;

    verloop.push({ role: "assistant", content: antwoord.content });
    verloop.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolBlok.id,
          content: resultaat.gelukt
            ? "Gelukt. De gegevens zijn doorgegeven; er wordt binnen \u00e9\u00e9n werkdag contact opgenomen."
            : "Mislukt. Vraag de bezoeker om het contactformulier op de pagina te gebruiken of te mailen naar " +
              SITE.email,
        },
      ],
    });

    antwoord = await roepClaude(systeem, verloop, config);
  }

  const tekst = antwoord.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return {
    tekst:
      zonderStreepjes(tekst) || "Sorry, daar kwam ik even niet uit. Stel je vraag gerust anders.",
    leadVastgelegd,
    verbruik: antwoord.usage,
  };
}
