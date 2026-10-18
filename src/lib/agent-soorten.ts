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
  // De vijf van 18 oktober 2026, in bouwvolgorde. Zie
  // documenten/voorstel-nieuwe-agents.md voor het waarom.
  | "heractivatie"
  | "offerte"
  | "betaalherinnering"
  | "reviews"
  | "afspraken"
  | "overig";

/** Schermen in het klantportaal die alleen bij bepaalde soorten horen. */
export type Scherm =
  | "gesprekken"
  | "leads"
  | "aanvragen"
  | "facturen"
  | "reviews"
  | "afspraken"
  | "contacten"
  | "campagnes"
  | "berichten"
  | "antwoorden"
  | "bezorgen"
  | "support"
  | "whatsapp";

/**
 * Een kerncijfer op het dashboard van een agent, en waar het vandaan komt.
 *
 *   gesprekken  verzoeken aan de agent, geteld per uur (agent_usage)
 *   leads       aanvragen die de agent binnenhaalde (lead_requests)
 *   trechter    aangeschreven → bezorgd → reactie → afspraak (outbound_*)
 *   metingen    de dagcijfers die per agent worden bijgehouden (agent_stats)
 *   support     supportmail: binnen, automatisch, via concept, naar een mens
 *   heractivatie  slapende klanten: aangeschreven, gereageerd, teruggekomen
 *   offertes    aanvragen, reactietijd, verstuurd, geaccepteerd
 *   facturen    openstaand, over de termijn, betaald na een herinnering
 *   reviews     verzoeken, reviews en gemiddelde (90 dagen), onbeantwoord
 *   afspraken   komende week, bevestigd, no-shows, wachtlijst
 *   sales       leads, oordeel, eerste antwoord in minuten, afspraken
 *   whatsapp    gesprekken, door de agent beantwoord, overdrachten, reactietijd
 */
export type Bron =
  | "gesprekken"
  | "leads"
  | "trechter"
  | "metingen"
  | "support"
  | "heractivatie"
  | "offertes"
  | "facturen"
  | "reviews"
  | "afspraken"
  | "sales"
  | "whatsapp";

type Beschrijving = {
  label: string;
  /** Raadpleegt deze agent een kennisbank? Bepaalt of het scherm zin heeft. */
  kennisbank: boolean;
  /** Wat de klant hier in één zin over moet weten. */
  uitleg: string;
  /**
   * Waar de cijfers op het dashboard naar heten. Bij het aanmaken van een
   * agent vullen deze de velden alvast in, zodat een beheerder niet bij elke
   * nieuwe agent "acties" en "prestatiescore" hoeft te verzinnen.
   */
  labels: { metric: string; score: string };
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
    labels: { metric: "gesprekken", score: "zelf afgehandeld" },
    schermen: ["gesprekken"],
    optioneel: [],
    bronnen: ["gesprekken", "leads"],
    binnenkort: [],
  },
  uitgaande_email: {
    label: "Uitgaande e-mailagent",
    // Wat hij beweert over prijzen, levering en wat er in een pakket zit, moet
    // uit de kennisbank komen en niet uit wat het model aannemelijk vindt.
    kennisbank: true,
    uitleg:
      "Neemt zelf contact op met je relaties en volgt op. Wat hij over je bedrijf zegt, komt uit zijn kennisbank.",
    labels: { metric: "berichten verstuurd", score: "reactiepercentage" },
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
    labels: { metric: "leads beoordeeld", score: "eerste antwoord op tijd" },
    schermen: ["leads"],
    optioneel: [],
    bronnen: ["sales"],
    binnenkort: ["Agenda koppelen (vrije momenten voorstellen)", "CRM koppelen"],
  },
  inbox_draft: {
    label: "Inbox-assistent",
    kennisbank: true,
    // Uitgebreid op 19 september 2026: beantwoordt supportmail. Standaard als
    // concept; direct versturen zet de klant zelf aan als hij hem vertrouwt.
    uitleg:
      "Beantwoordt supportmail met wat in zijn kennisbank staat. Standaard als concept dat jij goedkeurt; als je hem vertrouwt, zet je direct versturen aan.",
    labels: { metric: "supportmails beantwoord", score: "ongewijzigd verstuurd" },
    schermen: ["support"],
    optioneel: [],
    bronnen: ["support"],
    binnenkort: ["Wijzigingen waarvan hij leerde"],
  },
  whatsapp_followup: {
    label: "WhatsApp-opvolger",
    kennisbank: true,
    uitleg:
      "Houdt leads warm via WhatsApp en draagt over aan een mens zodra het ingewikkeld wordt.",
    // Gebouwd op 19 oktober 2026. Beantwoordt wat klanten appen en volgt
    // leads van de sales-assistent op met een goedgekeurd sjabloon.
    labels: { metric: "berichten beantwoord", score: "zonder mens afgehandeld" },
    schermen: ["whatsapp"],
    optioneel: [],
    bronnen: ["whatsapp"],
    binnenkort: ["Herinneringen van de afsprakenagent via WhatsApp"],
  },
  // -------------------------------------------------------------------------
  // De vijf van 18 oktober 2026. Nog geen van alle gebouwd: ze staan hier
  // zodat een beheerder ze kan kiezen en de klant in zijn portaal ziet wat
  // eraan komt, in plaats van een leeg vak. Zodra er gemeten wordt, verhuist
  // een regel van `binnenkort` naar `bronnen`.
  // -------------------------------------------------------------------------
  heractivatie: {
    label: "Heractivatie-agent",
    kennisbank: true,
    // Technisch de uitgaande e-mailagent met een andere lijst en een ander
    // doel: wie al klant was en stil is geworden. Daarom dezelfde schermen.
    uitleg:
      "Schrijft klanten aan die stil zijn geworden, met een reden om terug te komen, en volgt op. Stopt zodra iemand reageert of zich afmeldt.",
    labels: { metric: "klanten aangeschreven", score: "teruggewonnen" },
    schermen: ["contacten", "campagnes", "berichten", "antwoorden"],
    optioneel: ["bezorgen"],
    bronnen: ["trechter", "gesprekken"],
    binnenkort: [
      "Teruggewonnen klanten en wat dat waard was",
      "Slapend sinds, als filter op de lijst",
    ],
  },
  offerte: {
    label: "Offerte-agent",
    kennisbank: true,
    uitleg:
      "Zet van een aanvraag binnen minuten een concept-offerte klaar, opgebouwd uit je prijslijst. Jij kijkt na en verstuurt; hij volgt op.",
    labels: { metric: "offertes opgesteld", score: "geaccepteerd" },
    schermen: ["aanvragen"],
    optioneel: [],
    bronnen: ["offertes"],
    binnenkort: [],
  },
  betaalherinnering: {
    label: "Betaalherinnering-agent",
    kennisbank: true,
    uitleg:
      "Houdt openstaande facturen bij en herinnert op het juiste moment in de juiste toon. Stopt zodra er betaald is; dreigt nooit zelf.",
    labels: { metric: "herinneringen verstuurd", score: "betaald na herinnering" },
    schermen: ["facturen"],
    optioneel: [],
    bronnen: ["facturen"],
    binnenkort: ["Koppeling met je boekhoudpakket"],
  },
  reviews: {
    label: "Review-agent",
    kennisbank: true,
    uitleg:
      "Vraagt na een klus of levering om een review en zet een antwoord klaar op elke review die binnenkomt, in jouw toon.",
    labels: { metric: "reviewverzoeken", score: "reviews ontvangen" },
    schermen: ["reviews"],
    optioneel: [],
    bronnen: ["reviews"],
    binnenkort: [
      "Reviews automatisch ophalen en antwoorden plaatsen via je Google Bedrijfsprofiel",
    ],
  },
  afspraken: {
    label: "Afsprakenagent",
    kennisbank: true,
    uitleg:
      "Bevestigt afspraken, herinnert op tijd, laat verzetten met één antwoord en vult vrijgekomen plekken vanuit een wachtlijst.",
    labels: { metric: "afspraken bevestigd", score: "no-shows voorkomen" },
    schermen: ["afspraken"],
    optioneel: [],
    bronnen: ["afspraken"],
    binnenkort: ["Koppeling met Google Agenda en Microsoft 365", "Herinneringen via WhatsApp"],
  },
  overig: {
    label: "Maatwerk",
    kennisbank: true,
    uitleg: "Een automatisering op maat voor jouw situatie.",
    labels: { metric: "acties", score: "prestatiescore" },
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
  "gesprekken",
  "leads",
  "aanvragen",
  "facturen",
  "reviews",
  "afspraken",
  "support",
  "contacten",
  "campagnes",
  "berichten",
  "antwoorden",
  "bezorgen",
  "whatsapp",
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
