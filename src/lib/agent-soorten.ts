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
export type Scherm = "contacten" | "campagnes" | "berichten" | "antwoorden" | "bezorgen";

/**
 * Een kerncijfer op het dashboard van een agent, en waar het vandaan komt.
 *
 *   gesprekken  verzoeken aan de agent, geteld per uur (agent_usage)
 *   leads       aanvragen die de agent binnenhaalde (lead_requests)
 *   trechter    aangeschreven → bezorgd → reactie → afspraak (outbound_*)
 *   metingen    de dagcijfers die per agent worden bijgehouden (agent_stats)
 */
export type Bron = "gesprekken" | "leads" | "trechter" | "metingen";

type Beschrijving = {
  label: string;
  /** Raadpleegt deze agent een kennisbank? Bepaalt of het scherm zin heeft. */
  kennisbank: boolean;
  /** Wat de klant hier in één zin over moet weten. */
  uitleg: string;
  /** Welke schermen de klant voor deze agent krijgt, naast de vaste. */
  schermen: Scherm[];
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
    schermen: ["contacten", "campagnes", "berichten", "antwoorden", "bezorgen"],
    bronnen: ["trechter", "gesprekken"],
    binnenkort: [],
  },
  sales_assistent: {
    label: "Sales-assistent",
    kennisbank: true,
    uitleg:
      "Kwalificeert binnenkomende leads en volgt ze op. Wie je ideale klant is en hoe je bezwaren beantwoordt, staat in zijn kennisbank.",
    schermen: [],
    bronnen: ["leads", "metingen"],
    binnenkort: ["Gekwalificeerd tegenover afgewezen", "Geboekte afspraken", "Responstijd"],
  },
  inbox_draft: {
    label: "Inbox-assistent",
    kennisbank: true,
    uitleg:
      "Zet concept-antwoorden klaar in je mailbox. Jij beslist wat er verstuurd wordt. Je huisstijl en beleid staan in zijn kennisbank.",
    schermen: [],
    bronnen: ["metingen"],
    binnenkort: ["Concepten klaargezet", "Goedgekeurd door jou", "Wijzigingen waarvan hij leerde"],
  },
  whatsapp_followup: {
    label: "WhatsApp-opvolger",
    kennisbank: true,
    uitleg:
      "Houdt leads warm via WhatsApp en draagt over aan een mens zodra het ingewikkeld wordt.",
    schermen: [],
    bronnen: ["metingen"],
    binnenkort: ["Berichten verstuurd", "Reacties ontvangen", "Overdrachten naar een mens"],
  },
  overig: {
    label: "Maatwerk",
    kennisbank: true,
    uitleg: "Een automatisering op maat voor jouw situatie.",
    schermen: [],
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

/**
 * Welke schermen iemand met deze agents in zijn menu krijgt, in vaste volgorde.
 * Een klant met alleen een chat-assistent krijgt geen Contacten en Campagnes
 * meer: dat waren lege schermen voor iets wat hij niet heeft.
 */
export function schermenVoor(kinds: Array<string | null | undefined>): Scherm[] {
  const alle: Scherm[] = ["contacten", "campagnes", "berichten", "antwoorden", "bezorgen"];
  const aan = new Set(kinds.flatMap((k) => soortVan(k).schermen));
  return alle.filter((s) => aan.has(s));
}
