/**
 * Wat voor soort agent iets is, en wat dat betekent voor het portaal.
 *
 * Eén bron: het label, de omschrijving en of er een kennisbank bij hoort komen
 * hier vandaan. Tot nu toe leidde het portaal dat af uit de aanwezigheid van
 * een slug, wat een toevalligheid is en geen eigenschap — met als gevolg dat
 * een klant een uploadknop kreeg voor een agent die die kennis nooit zou lezen.
 */

export type AgentSoort =
  | "chat_assistent"
  | "uitgaande_email"
  | "sales_assistent"
  | "inbox_draft"
  | "whatsapp_followup"
  | "overig";

type Beschrijving = {
  label: string;
  /** Raadpleegt deze agent een kennisbank? Bepaalt of het scherm zin heeft. */
  kennisbank: boolean;
  /** Wat de klant hier in één zin over moet weten. */
  uitleg: string;
};

export const SOORTEN: Record<AgentSoort, Beschrijving> = {
  chat_assistent: {
    label: "Chat-assistent",
    kennisbank: true,
    uitleg:
      "Beantwoordt vragen van bezoekers op je website. Wat hij weet, komt uit zijn kennisbank.",
  },
  uitgaande_email: {
    label: "Uitgaande e-mailagent",
    // Wél een kennisbank, en om een andere reden dan bij de chat-assistent. Die
    // beantwoordt vragen van vreemden op een website; deze schrijft namens het
    // bedrijf aan mensen die het kennen. Wat hij beweert over prijzen, levering
    // en wat er in een pakket zit, moet uit de kennisbank komen en niet uit wat
    // het model aannemelijk vindt.
    kennisbank: true,
    uitleg:
      "Neemt zelf contact op met je relaties en volgt op. Wat hij over je bedrijf zegt, komt uit zijn kennisbank.",
  },
  sales_assistent: {
    label: "Sales-assistent",
    kennisbank: false,
    uitleg:
      "Kwalificeert binnenkomende leads en volgt ze op. Werkt op je eigen kanalen, niet op een kennisbank.",
  },
  inbox_draft: {
    label: "Inbox-assistent",
    kennisbank: false,
    uitleg: "Zet concept-antwoorden klaar in je mailbox. Jij beslist wat er verstuurd wordt.",
  },
  whatsapp_followup: {
    label: "WhatsApp-opvolger",
    kennisbank: false,
    uitleg:
      "Houdt leads warm via WhatsApp en draagt over aan een mens zodra het ingewikkeld wordt.",
  },
  overig: {
    label: "Maatwerk",
    kennisbank: false,
    uitleg: "Een automatisering op maat voor jouw situatie.",
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
