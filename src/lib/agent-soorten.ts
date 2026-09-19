/**
 * Wat voor soort agent iets is, en wat dat betekent voor het portaal.
 *
 * Eén bron: het label, de omschrijving, welke schermen de klant krijgt en welke
 * cijfers er op zijn dashboard staan komen hier vandaan. Tot nu toe leidde het
 * portaal dat af uit de aanwezigheid van een slug, wat een toevalligheid is en
 * geen eigenschap — met als gevolg dat een klant een uploadknop kreeg voor een
 * agent die die kennis nooit zou lezen.
 */

export type AgentSoort =
  | "chat_assistent"
  | "uitgaande_email"
  | "sales_assistent"
  | "inbox_draft"
  | "whatsapp_followup"
  | "overig";

/** Schermen in het klantportaal die alleen bij bepaalde soorten horen. */
export type Scherm =
  "contacten" | "campagnes" | "berichten" | "antwoorden" | "bezorgen" | "support";

/**
 * Een kerncijfer op het dashboard van een agent, en waar het vandaan komt.
 *
 *   gesprekken  verzoeken aan de agent, geteld per uur (agent_usage)
 *   leads       aanvragen die de agent binnenhaalde (lead_requests)
 *   trechter    aangeschreven → bezorgd → reactie → afspraak (outbound_*)
 *   metingen    de dagcijfers die per agent worden bijgehouden (agent_stats)
 *   support     supportmail: binnen, automatisch, via concept, naar een mens
 */
export type Bron = "gesprekken" | "leads" | "trechter" | "metingen" | "support";

type Beschrijving = {
  label: string;
  /** Raadpleegt deze agent een kennisbank? Bepaalt of het scherm zin heeft. */
  kennisbank: boolean;
  /** Wat de klant hier in één zin over moet weten. */
  uitleg: string;
  /** Welke schermen de klant standaard krijgt, naast de vaste. */
  schermen: Scherm[];
  /**
   * Schermen die per agent aan te zetten zijn, maar standaard uit staan. Voor
   * onderdelen die voor één klant zijn gebouwd: Bezorgen is van FJ Snacks.
   */
  optioneel: Scherm[];
  /** Wat er op het dashboard van deze agent staat, en waar het vandaan komt. */
  bronnen: Bron[];
  /**
   * Wat we per soort gaan tonen maar nog niet meten. Staat erbij zodat de
   * klant ziet wat eraan komt, in plaats van een leeg vak of een verzonnen
   * getal. Is het er, dan verhuist het naar bronnen.
   */
  binnenkort: string[];
};

// Elke soort heeft een kennisbank. Wat erin staat verschilt: bij een
// chat-assistent de vragen van bezoekers, bij een sales-assistent de ideale
// klant en de bezwaren, bij een inbox-assistent de huisstijl en het beleid.
// Maar geen enkele agent hoort iets te beweren over het bedrijf dat niet uit
// zijn kennisbank komt.
export const SOORTEN: Record<AgentSoort, Beschrijving> = {
  chat_assistent: {
    label: "Chat-assistent",
    kennisbank: true,
    uitleg:
      "Beantwoordt vragen van bezoekers op je website. Wat hij weet, komt uit zijn kennisbank.",
    schermen: [],
    optioneel: [],
    bronnen: ["gesprekken", "leads"],
    binnenkort: ["Gesprekken teruglezen", "Vragen die hij niet kon beantwoorden"],
  },
  uitgaande_email: {
    label: "Uitgaande e-mailagent",
    // Wat hij beweert over prijzen, levering en wat er in een pakket zit, moet
    // uit de kennisbank komen en niet uit wat het model aannemelijk vindt.
    kennisbank: true,
    uitleg:
      "Neemt zelf contact op met je relaties en volgt op. Wat hij over je bedrijf zegt, komt uit zijn kennisbank.",
    schermen: ["contacten", "campagnes", "berichten", "antwoorden"],
    optioneel: ["bezorgen"],
    bronnen: ["trechter", "gesprekken"],
    binnenkort: [],
  },
  sales_assistent: {
    label: "Sales-assistent",
    kennisbank: true,
    uitleg:
      "Kwalificeert binnenkomende leads en volgt ze op. Wie je ideale klant is en hoe je bezwaren beantwoordt, staat in zijn kennisbank.",
    schermen: [],
    optioneel: [],
    bronnen: ["leads", "metingen"],
    binnenkort: ["Gekwalificeerd tegenover afgewezen", "Geboekte afspraken", "Responstijd"],
  },
  inbox_draft: {
    label: "Inbox-assistent",
    kennisbank: true,
    // Uitgebreid op 19 september 2026: beantwoordt supportmail. Standaard als
    // concept; direct versturen zet de klant zelf aan als hij hem vertrouwt.
    uitleg:
      "Beantwoordt supportmail met wat in zijn kennisbank staat. Standaard als concept dat jij goedkeurt; als je hem vertrouwt, zet je direct versturen aan.",
    schermen: ["support"],
    optioneel: [],
    bronnen: ["support"],
    binnenkort: ["Mailbox koppelen (Gmail, Outlook)", "Wijzigingen waarvan hij leerde"],
  },
  whatsapp_followup: {
    label: "WhatsApp-opvolger",
    kennisbank: true,
    uitleg:
      "Houdt leads warm via WhatsApp en draagt over aan een mens zodra het ingewikkeld wordt.",
    schermen: [],
    optioneel: [],
    bronnen: ["metingen"],
    binnenkort: ["Berichten verstuurd", "Reacties ontvangen", "Overdrachten naar een mens"],
  },
  overig: {
    label: "Maatwerk",
    kennisbank: true,
    uitleg: "Een automatisering op maat voor jouw situatie.",
    schermen: [],
    optioneel: [],
    bronnen: ["metingen"],
    binnenkort: [],
  },
};

export function soortVan(kind: string | null | undefined): Beschrijving {
  return SOORTEN[(kind as AgentSoort) ?? "overig"] ?? SOORTEN.overig;
}

/**
 * Heeft deze agent een kennisbank? Alleen de soort telt, niet of er al een slug
 * is: een chat-assistent die nog wordt ingericht heeft zijn kennisbank juist
 * het hardst nodig.
 */
export function heeftKennisbank(kind: string | null | undefined): boolean {
  return soortVan(kind).kennisbank;
}

export const ALLE_SCHERMEN: Scherm[] = [
  "support",
  "contacten",
  "campagnes",
  "berichten",
  "antwoorden",
  "bezorgen",
];

/** Wat er voor deze soort aan of uit kan: de standaard plus het optionele. */
export function beschikbareSchermen(kind: string | null | undefined): Scherm[] {
  const s = soortVan(kind);
  return ALLE_SCHERMEN.filter((x) => s.schermen.includes(x) || s.optioneel.includes(x));
}

/**
 * Welke schermen deze ene agent aan heeft. Staat er per agent niets ingesteld
 * (null), dan de standaard van de soort. Wat bij de soort niet kan, telt niet,
 * ook niet als het in de database staat.
 */
export function actieveSchermen(
  kind: string | null | undefined,
  modules: string[] | null | undefined,
): Scherm[] {
  const kan = beschikbareSchermen(kind);
  if (!modules) return soortVan(kind).schermen;
  return kan.filter((x) => modules.includes(x));
}

/**
 * Welke schermen iemand met deze agents in zijn menu krijgt, in vaste volgorde.
 * Een klant met alleen een chat-assistent krijgt geen Contacten en Campagnes:
 * dat waren lege schermen voor iets wat hij niet heeft. En Bezorgen staat
 * alleen aan bij een agent waar de beheerder het heeft aangezet.
 */
export function schermenVoor(
  agents: Array<{ kind?: string | null; modules?: string[] | null }>,
): Scherm[] {
  const aan = new Set(agents.flatMap((a) => actieveSchermen(a.kind, a.modules)));
  return ALLE_SCHERMEN.filter((s) => aan.has(s));
}
