import type { AgentSoort } from "@/lib/agent-soorten";

/**
 * Wat je per agent aan en uit kunt zetten.
 *
 * Eén lijst voor alles wat een agent anders laat werken, zodat een nieuwe
 * functie één regel is in plaats van een nieuwe kolom, een nieuw veld en een
 * nieuw scherm. Tot nu toe zaten die instellingen verspreid: een paar in de
 * agents-tabel, een paar per campagne, een paar bij supportmail. Een beheerder
 * moest weten wáár iets stond om het te kunnen wijzigen.
 *
 * Drie dingen staan bij elke optie, en die drie maken het verschil:
 *
 *   wie      Wie mag dit zetten. "klant" betekent dat het ook in zijn eigen
 *            portaal staat; dat is waar controle echt controle wordt.
 *   bron     Waar de waarde leeft. Bestaande instellingen blijven in hun eigen
 *            kolom staan (één waarheid, geen migratie van werkende dingen);
 *            nieuwe komen in agents.opties, een jsonb-veld.
 *   gebouwd  Of de agent er werkelijk iets mee doet. Staat dit op false, dan
 *            is de knop uitgeschakeld en staat erbij dat hij eraan komt. Een
 *            schakelaar die niets doet is erger dan geen schakelaar: hij
 *            belooft iets wat niet gebeurt.
 */

// Relatief en met extensie: scripts/test-catalogus.ts laadt dit bestand
// rechtstreeks met Node, en die kent het @/-pad niet.
import { STANDAARD_OVERDRACHTSWOORDEN } from "./overdrachtswoorden.ts";

export type OptieType = "schakelaar" | "getal" | "tekst" | "tekstlang" | "keuze" | "lijst";

export type OptieBron =
  /** Een bestaande kolom op de agents-tabel. */
  | { soort: "kolom"; naam: string }
  /** Nieuw: leeft in agents.opties (jsonb). */
  | { soort: "optie" }
  /** Bestaat al, maar heeft een eigen scherm; hier alleen als verwijzing. */
  | { soort: "elders"; scherm: string; waar: string };

export type Optie = {
  sleutel: string;
  label: string;
  /** Eén zin, in de woorden van de klant. Staat ook in zijn portaal. */
  uitleg: string;
  type: OptieType;
  wie: "beheerder" | "klant";
  bron: OptieBron;
  gebouwd: boolean;
  standaard?: string | number | boolean | string[] | null;
  min?: number;
  max?: number;
  eenheid?: string;
  keuzes?: Array<{ waarde: string; label: string }>;
  /** Waar het in het scherm onder komt te staan. */
  groep: "gedrag" | "grenzen" | "koppelingen" | "meldingen";
};

const MODELLEN = [
  { waarde: "claude-sonnet-5", label: "Claude Sonnet 5 (standaard)" },
  { waarde: "claude-opus-5", label: "Claude Opus 5 (duurder, voor moeilijke taken)" },
  { waarde: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (sneller, goedkoper)" },
];

/** Geldt voor elke soort agent. */
const ALGEMEEN: Optie[] = [
  {
    sleutel: "model",
    label: "Taalmodel",
    uitleg: "Welk model de agent gebruikt. Zwaarder is beter in nuance, lichter is sneller.",
    type: "keuze",
    keuzes: MODELLEN,
    wie: "beheerder",
    bron: { soort: "kolom", naam: "model" },
    gebouwd: true,
    standaard: "claude-sonnet-5",
    groep: "gedrag",
  },
  {
    sleutel: "tone",
    label: "Toon",
    uitleg: "Hoe de agent schrijft. Bijvoorbeeld: kort en zakelijk, of hartelijk en informeel.",
    type: "tekst",
    wie: "klant",
    bron: { soort: "kolom", naam: "tone" },
    gebouwd: true,
    groep: "gedrag",
  },
  {
    sleutel: "extra_instructions",
    label: "Extra instructies",
    uitleg: "Afspraken die altijd gelden, bijvoorbeeld: noem nooit levertijden in dagen.",
    type: "tekstlang",
    wie: "beheerder",
    bron: { soort: "kolom", naam: "extra_instructions" },
    gebouwd: true,
    groep: "gedrag",
  },
  {
    sleutel: "notify_email",
    label: "Meldingen naar",
    uitleg: "Het adres waar meldingen van deze agent heen gaan.",
    type: "tekst",
    wie: "klant",
    bron: { soort: "kolom", naam: "notify_email" },
    gebouwd: true,
    groep: "meldingen",
  },
  {
    sleutel: "fair_use_per_month",
    label: "Fair use per maand",
    uitleg: "Hoeveel gesprekken of berichten er in het abonnement zitten. Leeg is geen grens.",
    type: "getal",
    min: 0,
    max: 1000000,
    wie: "beheerder",
    bron: { soort: "kolom", naam: "fair_use_per_month" },
    gebouwd: true,
    groep: "grenzen",
  },
  {
    sleutel: "bewaartermijn_dagen",
    label: "Bewaartermijn",
    uitleg:
      "Hoe lang gesprekken en e-mails van deze agent blijven staan. Daarna wist de database ze vanzelf.",
    type: "getal",
    min: 7,
    max: 730,
    eenheid: "dagen",
    wie: "klant",
    bron: { soort: "optie" },
    gebouwd: true,
    standaard: 90,
    groep: "grenzen",
  },
  {
    sleutel: "dagrapport",
    label: "Dagoverzicht per mail",
    uitleg: "Elke werkdag om 8:00 een mail met wat de agent gisteren deed en wat op je wacht.",
    type: "schakelaar",
    wie: "klant",
    bron: { soort: "optie" },
    gebouwd: true,
    standaard: false,
    groep: "meldingen",
  },
];

/**
 * Alles wat uitgaande post regelt. Eén lijst voor twee soorten: de uitgaande
 * e-mailagent, en de heractivatie-agent die technisch dezelfde machine is met
 * een andere lijst en een ander doel. Eén lijst, zodat een rem die we voor de
 * één bouwen (bounces, verzendvenster) nooit bij de ander ontbreekt.
 */
const UITGAAND: Optie[] = [
  {
    sleutel: "inbound_local",
    label: "Ontvangstadres voor antwoorden",
    uitleg: "Waar antwoorden van je relaties binnenkomen, zodat de agent ze kan verwerken.",
    type: "tekst",
    wie: "beheerder",
    bron: { soort: "kolom", naam: "inbound_local" },
    gebouwd: true,
    groep: "koppelingen",
  },
  {
    sleutel: "campagne_instellingen",
    label: "Afzender, aanbod en verzendtempo",
    uitleg:
      "Per campagne: van welk adres hij verstuurt, wat je aanbiedt, hoeveel mails per dag en na hoeveel dagen hij opvolgt.",
    type: "tekst",
    wie: "klant",
    bron: { soort: "elders", scherm: "/campagnes", waar: "bij de campagne zelf" },
    gebouwd: true,
    groep: "gedrag",
  },
  {
    sleutel: "bounce_drempel",
    label: "Waarschuwen bij bounces boven",
    uitleg:
      "Boven dit percentage onbezorgbare mail stopt de agent met versturen en krijg je bericht. Dat beschermt je verzendadres.",
    type: "getal",
    min: 1,
    max: 20,
    eenheid: "%",
    wie: "beheerder",
    bron: { soort: "optie" },
    gebouwd: true,
    standaard: 3,
    groep: "grenzen",
  },
  {
    sleutel: "overdracht_woorden",
    label: "Direct overdragen bij",
    uitleg:
      "Schrijft iemand een van deze woorden, dan antwoordt de agent niet maar leg je het zelf. Denk aan klacht, bedorven of jurist. Leeg laten zet deze rem uit.",
    type: "lijst",
    wie: "klant",
    bron: { soort: "optie" },
    gebouwd: true,
    standaard: [...STANDAARD_OVERDRACHTSWOORDEN],
    groep: "grenzen",
  },
  {
    sleutel: "stop_bij_klacht",
    label: "Stoppen bij een spamklacht",
    uitleg: "Meldt iemand je mail als spam, dan zet de agent de campagne stil tot jij kijkt.",
    type: "schakelaar",
    wie: "klant",
    bron: { soort: "optie" },
    gebouwd: true,
    standaard: true,
    groep: "grenzen",
  },
  {
    sleutel: "verzendvenster",
    label: "Alleen versturen tussen",
    uitleg:
      "Buiten deze uren gaat er niets weg, en in het weekend niets. Nederlandse tijd. Bijvoorbeeld 09:00-17:00.",
    type: "tekst",
    wie: "klant",
    bron: { soort: "optie" },
    gebouwd: true,
    standaard: "09:00-17:00",
    groep: "grenzen",
  },
];

const PER_SOORT: Record<AgentSoort, Optie[]> = {
  chat_assistent: [
    {
      sleutel: "gesprekken_bewaren",
      label: "Gesprekken bewaren",
      uitleg:
        "Aan: je leest terug wat de assistent met bezoekers besprak. Uit: er blijft niets van staan, ook niet voor jou.",
      type: "schakelaar",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: true,
      groep: "grenzen",
    },
    {
      sleutel: "welcome_text",
      label: "Welkomsttekst",
      uitleg: "De eerste zin die een bezoeker ziet als hij de chat opent.",
      type: "tekst",
      wie: "klant",
      bron: { soort: "kolom", naam: "welcome_text" },
      gebouwd: true,
      groep: "gedrag",
    },
    {
      sleutel: "capture_leads",
      label: "Contactgegevens vragen",
      uitleg:
        "De agent mag om naam en e-mail vragen als iemand teruggebeld wil worden. Staat dit uit, dan beantwoordt hij alleen vragen.",
      type: "schakelaar",
      wie: "klant",
      bron: { soort: "kolom", naam: "capture_leads" },
      gebouwd: true,
      standaard: true,
      groep: "gedrag",
    },
    {
      sleutel: "allowed_domains",
      label: "Toegestane websites",
      uitleg: "Op welke domeinen de chat mag draaien. Elders weigert hij.",
      type: "lijst",
      wie: "beheerder",
      bron: { soort: "kolom", naam: "allowed_domains" },
      gebouwd: true,
      groep: "grenzen",
    },
    {
      sleutel: "rate_limit_per_hour",
      label: "Maximaal aantal vragen per uur",
      uitleg: "Beschermt tegen misbruik door één bezoeker.",
      type: "getal",
      min: 1,
      max: 10000,
      eenheid: "per uur",
      wie: "beheerder",
      bron: { soort: "kolom", naam: "rate_limit_per_hour" },
      gebouwd: true,
      standaard: 60,
      groep: "grenzen",
    },
    {
      sleutel: "onbeantwoord_verzamelen",
      label: "Onbeantwoorde vragen verzamelen",
      uitleg:
        "Wat de agent niet wist, komt op een lijst die je met één klik aan de kennisbank toevoegt.",
      type: "schakelaar",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: true,
      groep: "gedrag",
    },
    {
      sleutel: "overdracht_aanbieden",
      label: "Doorverwijzen naar een mens",
      uitleg:
        "Komt de agent er niet uit, dan biedt hij aan om een bericht achter te laten voor je team.",
      type: "schakelaar",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: true,
      groep: "gedrag",
    },
  ],

  uitgaande_email: UITGAAND,

  inbox_draft: [
    {
      sleutel: "support_modus",
      label: "Concept of direct versturen",
      uitleg: "Of elk antwoord op jou wacht, of dat zekere antwoorden meteen weggaan.",
      type: "tekst",
      wie: "klant",
      bron: { soort: "elders", scherm: "/support", waar: "bovenaan Supportmail" },
      gebouwd: true,
      groep: "gedrag",
    },
    {
      sleutel: "support_afzender",
      label: "Afzender en ondertekening",
      uitleg: "Vanaf welk adres hij antwoordt en hoe hij afsluit.",
      type: "tekst",
      wie: "klant",
      bron: { soort: "elders", scherm: "/support", waar: "bovenaan Supportmail" },
      gebouwd: true,
      groep: "gedrag",
    },
    {
      sleutel: "direct_onderwerpen",
      label: "Direct versturen alleen voor",
      uitleg:
        "Categorieën uit je kennisbank waarbij hij zelf mag antwoorden, bijvoorbeeld verzendkosten. Leeg betekent: alles waar hij zeker over is.",
      type: "lijst",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      groep: "gedrag",
    },
    {
      sleutel: "vragen_groeperen",
      label: "Terugkerende vragen groeperen",
      uitleg:
        "Komt dezelfde vraag vaker, dan stelt de agent voor om er één kennisitem van te maken.",
      type: "schakelaar",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: true,
      groep: "gedrag",
    },
    {
      sleutel: "reactietijd_doel",
      label: "Streeftijd voor een antwoord",
      uitleg: "Blijft een mail langer liggen, dan zie je dat terug op je dashboard.",
      type: "getal",
      min: 5,
      max: 2880,
      eenheid: "minuten",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: 240,
      groep: "grenzen",
    },
  ],

  sales_assistent: [
    {
      sleutel: "bronnen",
      label: "Waar leads vandaan komen",
      uitleg:
        "Welke kanalen de agent in de gaten houdt: formulier (via het ontvangstadres), chat (van je eigen chat-assistent) of mail.",
      type: "lijst",
      wie: "beheerder",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: ["formulier"],
      groep: "koppelingen",
    },
    {
      sleutel: "reactietijd_doel",
      label: "Binnen hoeveel minuten reageren",
      uitleg: "Hoe sneller het eerste antwoord, hoe groter de kans op een gesprek.",
      type: "getal",
      min: 1,
      max: 1440,
      eenheid: "minuten",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: 5,
      groep: "gedrag",
    },
    {
      sleutel: "kwalificatie",
      label: "Wie past bij jou",
      uitleg:
        "In je eigen woorden: welke aanvragen interessant zijn en welke niet. Hij kwalificeert hierop en zegt er altijd bij waarom.",
      type: "tekstlang",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      groep: "gedrag",
    },
    {
      sleutel: "zelf_antwoorden",
      label: "Zelf antwoorden op nieuwe leads",
      uitleg: "Staat dit uit, dan zet hij een concept klaar in plaats van te versturen.",
      type: "schakelaar",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: false,
      groep: "gedrag",
    },
    {
      sleutel: "agenda",
      label: "Agenda koppelen",
      uitleg: "Laat hem vrije momenten voorstellen en de afspraak meteen inplannen.",
      type: "keuze",
      keuzes: [
        { waarde: "geen", label: "Geen agenda" },
        { waarde: "calendly", label: "Calendly" },
        { waarde: "google", label: "Google Agenda" },
      ],
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: false,
      standaard: "geen",
      groep: "koppelingen",
    },
    {
      sleutel: "crm",
      label: "CRM koppelen",
      uitleg: "Elke gekwalificeerde lead komt automatisch in je CRM te staan.",
      type: "keuze",
      keuzes: [
        { waarde: "geen", label: "Geen CRM" },
        { waarde: "hubspot", label: "HubSpot" },
        { waarde: "pipedrive", label: "Pipedrive" },
      ],
      wie: "beheerder",
      bron: { soort: "optie" },
      gebouwd: false,
      standaard: "geen",
      groep: "koppelingen",
    },
  ],

  whatsapp_followup: [
    {
      sleutel: "nummer",
      label: "WhatsApp-nummer",
      uitleg:
        "Het geverifieerde zakelijke nummer waarvandaan hij bericht, zoals de klant het ziet.",
      type: "tekst",
      wie: "beheerder",
      bron: { soort: "optie" },
      gebouwd: true,
      groep: "koppelingen",
    },
    {
      sleutel: "phone_number_id",
      label: "Nummer-id bij Meta",
      uitleg:
        "Het Phone number ID uit de WhatsApp-instellingen van de Meta-app. Hieraan herkent de server voor wie een binnenkomend bericht is.",
      type: "tekst",
      wie: "beheerder",
      bron: { soort: "optie" },
      gebouwd: true,
      groep: "koppelingen",
    },
    {
      sleutel: "sjabloon",
      label: "Sjabloon voor opvolging",
      uitleg:
        "De naam van het door Meta goedgekeurde berichtsjabloon waarmee hij zelf mag beginnen. Zonder sjabloon kan hij alleen antwoorden.",
      type: "tekst",
      wie: "beheerder",
      bron: { soort: "optie" },
      gebouwd: true,
      groep: "koppelingen",
    },
    {
      sleutel: "verzendvenster",
      label: "Zelf beginnen tussen",
      uitleg:
        "Alleen tussen deze uren, op werkdagen, begint hij zelf een gesprek. Op een vraag van een klant antwoordt hij altijd meteen. Een appje om 22:00 kost je de klant.",
      type: "tekst",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: "09:00-18:00",
      groep: "grenzen",
    },
    {
      sleutel: "overdracht_woorden",
      label: "Direct overdragen bij",
      uitleg:
        "Woorden die betekenen dat een mens het overneemt, bijvoorbeeld klacht, annuleren of jurist. Wat hij niet weet, draagt hij sowieso over.",
      type: "lijst",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: ["klacht", "annuleren", "jurist"],
      groep: "gedrag",
    },
    {
      sleutel: "automatisch_opvolgen",
      label: "Leads vanzelf opvolgen",
      uitleg:
        "Een lead van je sales-assistent die een nummer achterliet en na het eerste antwoord stil bleef, krijgt vanzelf het opvolgbericht. Uit: jij klikt per lead.",
      type: "schakelaar",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: false,
      groep: "gedrag",
    },
    {
      sleutel: "opvolgen_na_dagen",
      label: "Opvolgen na",
      uitleg:
        "Zoveel dagen zonder reactie op het eerste antwoord, en de lead staat klaar om op te volgen.",
      type: "getal",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: 2,
      min: 0,
      max: 30,
      eenheid: "dagen",
      groep: "gedrag",
    },
    {
      sleutel: "kosten_doorbelasten",
      label: "Berichtkosten doorbelasten",
      uitleg: "De kosten die Meta per gesprek rekent, verschijnen apart op je factuur.",
      type: "schakelaar",
      wie: "beheerder",
      bron: { soort: "optie" },
      gebouwd: false,
      standaard: true,
      groep: "grenzen",
    },
  ],

  // -------------------------------------------------------------------------
  // De vijf van 18 oktober 2026 (documenten/voorstel-nieuwe-agents.md). Nog
  // niet gebouwd; de knoppen staan er zodat de klant ziet wat hij straks zelf
  // bepaalt en wij niet later een scherm hoeven te verzinnen.
  // -------------------------------------------------------------------------
  heractivatie: [
    ...UITGAAND,
    {
      sleutel: "slapend_na_maanden",
      label: "Slapend na",
      uitleg:
        "Een klant telt als slapend als hij zo lang niets heeft afgenomen. Ouder dan drie jaar schrijven we niet aan: dat is geen klantrelatie meer.",
      type: "getal",
      min: 3,
      max: 36,
      eenheid: "maanden",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: 12,
      groep: "gedrag",
    },
    {
      sleutel: "heractivatie_aanbod",
      label: "Reden om terug te komen",
      uitleg:
        "Wat je een slapende klant te bieden hebt: een nieuw product, een actie, of gewoon dat je hem mist. Zonder reden is het een herinnering dat hij weg is.",
      type: "tekstlang",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      groep: "gedrag",
    },
    {
      sleutel: "max_berichten_per_klant",
      label: "Hoogstens zoveel berichten per klant",
      uitleg: "Daarna laat hij het rusten. Twee is genoeg; wie dan niet reageert, wil niet.",
      type: "getal",
      min: 1,
      max: 4,
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: 2,
      groep: "grenzen",
    },
    {
      sleutel: "nooit_aanschrijven",
      label: "Nooit aanschrijven",
      uitleg: "E-mailadressen of bedrijfsnamen die hij altijd overslaat, wat de lijst ook zegt.",
      type: "lijst",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      groep: "grenzen",
    },
    {
      sleutel: "orderwaarde",
      label: "Gemiddelde orderwaarde",
      uitleg:
        "Waarmee hij uitrekent wat een teruggewonnen klant waard is. Jouw schatting, geen meting.",
      type: "getal",
      min: 0,
      max: 1000000,
      eenheid: "euro",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      groep: "meldingen",
    },
  ],

  offerte: [
    {
      sleutel: "offerte_modus",
      label: "Concept of direct versturen",
      uitleg:
        "Standaard kijk jij elke offerte na. Direct versturen kan later, en dan alleen onder het bedrag hieronder.",
      type: "keuze",
      keuzes: [
        { waarde: "concept", label: "Concept: ik kijk na en verstuur zelf" },
        { waarde: "direct", label: "Direct, maar alleen onder het maximumbedrag" },
      ],
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: "concept",
      groep: "gedrag",
    },
    {
      sleutel: "offerte_max_direct",
      label: "Maximumbedrag zonder jouw oog",
      uitleg: "Boven dit bedrag is het altijd een concept, ook als direct versturen aanstaat.",
      type: "getal",
      min: 0,
      max: 1000000,
      eenheid: "euro",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: 500,
      groep: "grenzen",
    },
    {
      sleutel: "offerte_geldig_dagen",
      label: "Geldigheid van een offerte",
      type: "getal",
      uitleg: "Hoe lang de prijzen in een offerte gelden. Staat onderaan elke offerte.",
      min: 1,
      max: 180,
      eenheid: "dagen",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: 30,
      groep: "gedrag",
    },
    {
      sleutel: "offerte_opvolgen_na",
      label: "Opvolgen na",
      uitleg:
        "Geen reactie? Dan vraagt hij één keer vriendelijk of er nog vragen zijn. Nul is nooit.",
      type: "getal",
      min: 0,
      max: 30,
      eenheid: "dagen",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: 5,
      groep: "gedrag",
    },
    {
      sleutel: "offerte_voorwaarden",
      label: "Standaardvoorwaarden",
      uitleg:
        "De tekst die onder elke offerte komt: betaaltermijn, wat niet is inbegrepen, je algemene voorwaarden.",
      type: "tekstlang",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      groep: "gedrag",
    },
    {
      sleutel: "prijslijst",
      label: "Prijslijst",
      uitleg:
        "Waar elke prijs in een offerte uit komt. Staat er iets niet in, dan noemt hij geen bedrag.",
      type: "tekst",
      wie: "klant",
      bron: { soort: "elders", scherm: "/knowledge", waar: "bij de kennisbank, onder Prijzen" },
      gebouwd: true,
      groep: "koppelingen",
    },
  ],

  betaalherinnering: [
    {
      sleutel: "herinnering_momenten",
      label: "Momenten van de reeks",
      uitleg:
        "Dagen ten opzichte van de vervaldatum. Bijvoorbeeld -3, 3, 14, 30: een vooraankondiging, en daarna drie herinneringen die steeds zakelijker worden.",
      type: "lijst",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: ["-3", "3", "14", "30"],
      groep: "gedrag",
    },
    {
      sleutel: "herinnering_max",
      label: "Hoogstens zoveel herinneringen",
      uitleg: "Daarna stopt hij en is het aan jou. Hij dreigt nooit zelf met incasso.",
      type: "getal",
      min: 1,
      max: 5,
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: 3,
      groep: "grenzen",
    },
    {
      sleutel: "stop_bij_antwoord",
      label: "Stoppen zodra de klant antwoordt",
      uitleg:
        "Schrijft iemand 'ik betaal volgende week', dan houdt hij op en krijg jij het antwoord.",
      type: "schakelaar",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: true,
      groep: "gedrag",
    },
    {
      sleutel: "nooit_herinneren",
      label: "Nooit herinneren",
      uitleg:
        "Klanten waar je zelf achteraan gaat, bijvoorbeeld je grootste of een familiebedrijf.",
      type: "lijst",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      groep: "grenzen",
    },
    {
      sleutel: "kopie_bij_laatste",
      label: "Kopie naar mij bij de laatste stap",
      uitleg: "Zodat je weet wie er op het punt staat uit handen gegeven te worden.",
      type: "schakelaar",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: true,
      groep: "meldingen",
    },
    {
      sleutel: "betaalgegevens",
      label: "Betaalgegevens in elke herinnering",
      uitleg:
        "Bijvoorbeeld je IBAN en het verzoek het factuurnummer te vermelden. Komt letterlijk onder elke herinnering.",
      type: "tekstlang",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      groep: "gedrag",
    },
    {
      sleutel: "boekhoudkoppeling",
      label: "Boekhoudpakket",
      uitleg:
        "Moneybird, e-Boekhouden of Exact Online. Zonder koppeling lever je facturen aan als bestand, en stuurt hij alleen concepten: een herinnering voor een betaalde factuur mag nooit.",
      type: "keuze",
      keuzes: [
        { waarde: "geen", label: "Geen: facturen als bestand aanleveren" },
        { waarde: "moneybird", label: "Moneybird" },
        { waarde: "eboekhouden", label: "e-Boekhouden" },
        { waarde: "exact", label: "Exact Online" },
      ],
      wie: "beheerder",
      bron: { soort: "optie" },
      gebouwd: false,
      standaard: "geen",
      groep: "koppelingen",
    },
  ],

  reviews: [
    {
      sleutel: "review_vragen_na",
      label: "Vragen na",
      uitleg:
        "Hoeveel dagen na de klus of levering hij om een review vraagt. Snel werkt beter dan later.",
      type: "getal",
      min: 0,
      max: 30,
      eenheid: "dagen",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: 1,
      groep: "gedrag",
    },
    {
      sleutel: "review_link",
      label: "Link naar je Google-profiel",
      uitleg:
        "De link die in elk verzoek staat. Iedereen krijgt dezelfde vraag; we sturen niet alleen tevreden klanten door.",
      type: "tekst",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      groep: "koppelingen",
    },
    {
      sleutel: "review_niet_na_klacht",
      label: "Niet vragen na een klacht",
      uitleg: "Een reviewverzoek na een slechte ervaring versnelt alleen de slechte review.",
      type: "schakelaar",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: true,
      groep: "grenzen",
    },
    {
      sleutel: "review_antwoord_modus",
      label: "Antwoorden op reviews",
      uitleg: "Onder vier sterren is het altijd een concept; daar hoort een mens naar te kijken.",
      type: "keuze",
      keuzes: [
        { waarde: "concept", label: "Altijd als concept" },
        { waarde: "automatisch_positief", label: "Vijf sterren automatisch, de rest als concept" },
      ],
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: "concept",
      groep: "gedrag",
    },
    {
      sleutel: "google_profiel",
      label: "Google Bedrijfsprofiel koppelen",
      uitleg:
        "Nodig om antwoorden rechtstreeks te plaatsen. Zonder koppeling kopieer je het antwoord zelf.",
      type: "schakelaar",
      wie: "beheerder",
      bron: { soort: "optie" },
      gebouwd: false,
      standaard: false,
      groep: "koppelingen",
    },
  ],

  afspraken: [
    {
      sleutel: "herinneren_op",
      label: "Herinneren op",
      uitleg: "Uren vooraf. Bijvoorbeeld 48 en 2: een dag van tevoren en vlak ervoor.",
      type: "lijst",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: ["48", "2"],
      groep: "gedrag",
    },
    {
      sleutel: "verzetten_tot",
      label: "Verzetten mag tot",
      uitleg:
        "Zo veel uur vooraf kan een klant nog verzetten of annuleren met één antwoord. Daarna gaat het via jou.",
      type: "getal",
      min: 0,
      max: 168,
      eenheid: "uur vooraf",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: 24,
      groep: "grenzen",
    },
    {
      sleutel: "wachtlijst",
      label: "Wachtlijst",
      uitleg: "Valt er een plek vrij, dan biedt hij die aan wie op de wachtlijst staat.",
      type: "schakelaar",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: false,
      groep: "gedrag",
    },
    {
      sleutel: "na_no_show",
      label: "Na een no-show",
      uitleg: "Een vriendelijk bericht met een voorstel voor een nieuwe afspraak. Geen verwijt.",
      type: "schakelaar",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: true,
      standaard: true,
      groep: "gedrag",
    },
    {
      sleutel: "agenda",
      label: "Agenda koppelen",
      uitleg:
        "Google Agenda of Microsoft 365. Dezelfde kluis en dezelfde ontkoppelknop als bij de mailbox.",
      type: "keuze",
      keuzes: [
        { waarde: "geen", label: "Nog niet gekoppeld" },
        { waarde: "google", label: "Google Agenda" },
        { waarde: "microsoft", label: "Microsoft 365" },
      ],
      wie: "beheerder",
      bron: { soort: "optie" },
      gebouwd: false,
      standaard: "geen",
      groep: "koppelingen",
    },
    {
      sleutel: "alleen_lezen",
      label: "Alleen lezen",
      uitleg:
        "Om mee te beginnen: hij herinnert en bevestigt, maar schrijft nog niets in je agenda.",
      type: "schakelaar",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: false,
      standaard: true,
      groep: "grenzen",
    },
  ],

  overig: [
    {
      sleutel: "kpi",
      label: "Afgesproken KPI",
      uitleg: "Het ene getal waarop we deze automatisering beoordelen.",
      type: "tekst",
      wie: "beheerder",
      bron: { soort: "optie" },
      gebouwd: false,
      groep: "gedrag",
    },
  ],
};

/** Alle opties van een soort agent: eerst de algemene, daarna de eigen. */
export function optiesVoor(kind: string | null | undefined): Optie[] {
  const soort = (kind ?? "overig") as AgentSoort;
  return [...ALGEMEEN, ...(PER_SOORT[soort] ?? PER_SOORT.overig)];
}

/** Alleen wat deze persoon mag zien en zetten. */
export function optiesVoorWie(kind: string | null | undefined, wie: "beheerder" | "klant") {
  const alles = optiesVoor(kind);
  return wie === "beheerder" ? alles : alles.filter((o) => o.wie === "klant");
}

export const GROEPEN: Array<{ sleutel: Optie["groep"]; label: string }> = [
  { sleutel: "gedrag", label: "Hoe hij werkt" },
  { sleutel: "grenzen", label: "Grenzen en veiligheid" },
  { sleutel: "koppelingen", label: "Koppelingen" },
  { sleutel: "meldingen", label: "Meldingen" },
];

type AgentRij = Record<string, unknown> & { opties?: Record<string, unknown> | null };

/** De waarde die nu geldt: uit de kolom of uit opties, anders de standaard. */
export function waardeVan(optie: Optie, agent: AgentRij): unknown {
  if (optie.bron.soort === "kolom") {
    const v = agent[optie.bron.naam];
    return v === null || v === undefined ? (optie.standaard ?? null) : v;
  }
  if (optie.bron.soort === "optie") {
    const v = (agent.opties ?? {})[optie.sleutel];
    return v === undefined ? (optie.standaard ?? null) : v;
  }
  return null;
}

/**
 * Controleert één waarde tegen zijn definitie. Geeft undefined terug als de
 * waarde niet deugt; de aanroeper slaat hem dan niet op in plaats van er iets
 * van te maken.
 */
export function schoneWaarde(optie: Optie, ruw: unknown): unknown | undefined {
  switch (optie.type) {
    case "schakelaar":
      return typeof ruw === "boolean" ? ruw : undefined;
    case "getal": {
      if (ruw === null || ruw === "") return null;
      const n = typeof ruw === "number" ? ruw : Number(String(ruw).replace(",", "."));
      if (!Number.isFinite(n)) return undefined;
      if (optie.min !== undefined && n < optie.min) return undefined;
      if (optie.max !== undefined && n > optie.max) return undefined;
      return n;
    }
    case "keuze":
      return typeof ruw === "string" && (optie.keuzes ?? []).some((k) => k.waarde === ruw)
        ? ruw
        : undefined;
    case "lijst": {
      if (ruw === null) return [];
      const lijst = Array.isArray(ruw)
        ? ruw
        : typeof ruw === "string"
          ? ruw.split(",").map((x) => x.trim())
          : undefined;
      if (!lijst) return undefined;
      const schoon = lijst.filter((x): x is string => typeof x === "string" && x !== "");
      return schoon.length > 200 ? undefined : schoon;
    }
    case "tekst":
    case "tekstlang": {
      if (ruw === null) return null;
      if (typeof ruw !== "string") return undefined;
      const max = optie.type === "tekst" ? 300 : 4000;
      const t = ruw.trim();
      return t.length > max ? undefined : t === "" ? null : t;
    }
  }
}

export type Opslag = { kolommen: Record<string, unknown>; opties: Record<string, unknown> };

/**
 * Verdeelt ingevulde waarden over de agents-kolommen en het jsonb-veld, en
 * laat alles vallen wat deze persoon niet mag zetten of wat niet deugt. Dit is
 * de enige plek waar invoer een opslagplek krijgt; wie het aanroept hoeft
 * alleen te weten van wie het verzoek komt.
 */
export function verdeelOpslag(
  kind: string | null | undefined,
  invoer: Record<string, unknown>,
  wie: "beheerder" | "klant",
): Opslag {
  const uit: Opslag = { kolommen: {}, opties: {} };
  for (const optie of optiesVoorWie(kind, wie)) {
    if (!(optie.sleutel in invoer)) continue;
    if (optie.bron.soort === "elders") continue;
    // Een knop die nog niets doet, slaan we ook niet op. Anders staat er een
    // waarde in de database die suggereert dat er iets gebeurt.
    if (!optie.gebouwd) continue;
    const waarde = schoneWaarde(optie, invoer[optie.sleutel]);
    if (waarde === undefined) continue;
    if (optie.bron.soort === "kolom") uit.kolommen[optie.bron.naam] = waarde;
    else uit.opties[optie.sleutel] = waarde;
  }
  return uit;
}
