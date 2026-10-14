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
    gebouwd: false,
    standaard: false,
    groep: "meldingen",
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
      sleutel: "gesprekken_bewaren",
      label: "Gesprekken bewaren",
      uitleg:
        "Gesprekken teruglezen in je portaal, zodat je ziet wat bezoekers vragen en wat hij antwoordde.",
      type: "schakelaar",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: false,
      standaard: true,
      groep: "gedrag",
    },
    {
      sleutel: "bewaartermijn_dagen",
      label: "Gesprekken bewaren voor",
      uitleg: "Na deze termijn worden gesprekken automatisch verwijderd.",
      type: "getal",
      min: 7,
      max: 730,
      eenheid: "dagen",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: false,
      standaard: 90,
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
      gebouwd: false,
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
      gebouwd: false,
      standaard: true,
      groep: "gedrag",
    },
  ],

  uitgaande_email: [
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
      gebouwd: false,
      standaard: 3,
      groep: "grenzen",
    },
    {
      sleutel: "stop_bij_klacht",
      label: "Stoppen bij een spamklacht",
      uitleg: "Meldt iemand je mail als spam, dan zet de agent de campagne stil tot jij kijkt.",
      type: "schakelaar",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: false,
      standaard: true,
      groep: "grenzen",
    },
    {
      sleutel: "verzendvenster",
      label: "Alleen versturen tussen",
      uitleg: "Buiten deze uren gaat er niets weg. Bijvoorbeeld 09:00–17:00 op werkdagen.",
      type: "tekst",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: false,
      standaard: "09:00-17:00",
      groep: "grenzen",
    },
  ],

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
        "Onderwerpen waarbij hij zelf mag antwoorden, bijvoorbeeld verzendkosten en openingstijden. De rest blijft een concept.",
      type: "lijst",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: false,
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
      gebouwd: false,
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
      gebouwd: false,
      standaard: 240,
      groep: "grenzen",
    },
  ],

  sales_assistent: [
    {
      sleutel: "bronnen",
      label: "Waar leads vandaan komen",
      uitleg: "Welke kanalen de agent in de gaten houdt: contactformulier, chat of mailbox.",
      type: "lijst",
      wie: "beheerder",
      bron: { soort: "optie" },
      gebouwd: false,
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
      gebouwd: false,
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
      gebouwd: false,
      groep: "gedrag",
    },
    {
      sleutel: "zelf_antwoorden",
      label: "Zelf antwoorden op nieuwe leads",
      uitleg: "Staat dit uit, dan zet hij een concept klaar in plaats van te versturen.",
      type: "schakelaar",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: false,
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
      uitleg: "Het geverifieerde zakelijke nummer waarvandaan hij bericht.",
      type: "tekst",
      wie: "beheerder",
      bron: { soort: "optie" },
      gebouwd: false,
      groep: "koppelingen",
    },
    {
      sleutel: "verzendvenster",
      label: "Alleen berichten tussen",
      uitleg: "Buiten deze uren stuurt hij niets. Een appje om 22:00 kost je de klant.",
      type: "tekst",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: false,
      standaard: "09:00-18:00",
      groep: "grenzen",
    },
    {
      sleutel: "overdracht_woorden",
      label: "Direct overdragen bij",
      uitleg:
        "Woorden die betekenen dat een mens het overneemt, bijvoorbeeld klacht, annuleren of advocaat.",
      type: "lijst",
      wie: "klant",
      bron: { soort: "optie" },
      gebouwd: false,
      standaard: ["klacht", "annuleren", "jurist"],
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
