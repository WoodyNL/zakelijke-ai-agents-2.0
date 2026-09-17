/** Canonical production domain. Update here when the domain changes. */
export const SITE_URL = "https://zakelijkeaiagents.nl";

/**
 * Vaste identiteiten voor de structured data.
 *
 * Hier stonden eerst twee losse beschrijvingen van hetzelfde bedrijf: een
 * Organization vanuit de root en een ProfessionalService vanuit de homepage.
 * Zonder `@id` zijn dat voor een zoekmachine twee verschillende bedrijven die
 * toevallig dezelfde naam hebben, en dan versterken de signalen elkaar niet.
 * Nu is er één bedrijf en één persoon, allebei met een vast adres, waar de
 * rest van de pagina's naar terugwijzen in plaats van het over te schrijven.
 */
export const ORGANISATIE_ID = `${SITE_URL}/#organisatie`;
export const PERSOON_ID = `${SITE_URL}/#wouter-ransijn`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * De deelafbeelding voor sociale media.
 *
 * Deze stond eerst als 685 kB PNG op de voorbeeld-bucket van het bouwplatform.
 * Dat is een adres waar wij niets over te zeggen hebben, en elke deling van de
 * site hing eraan. Nu staat hij in `public/`, op eigen domein, als 41 kB JPEG.
 */
export const OG_AFBEELDING = `${SITE_URL}/og-zakelijke-ai-agents.jpg`;
export const OG_AFBEELDING_BREEDTE = "1200";
export const OG_AFBEELDING_HOOGTE = "675";

/** Het logo in de maat die Google voor een vermelding wil: ruim boven 112 px. */
export const LOGO_AFBEELDING = `${SITE_URL}/logo-zakelijke-ai-agents-512.png`;

/**
 * Het Google Bedrijfsprofiel, in de vorm met het vaste profiel-ID.
 *
 * Google deelt zo'n vermelding ook als verkorte link (maps.app.goo.gl/...),
 * maar dat is een omleiding van een dienst die Google kan opheffen. Deze vorm
 * wijst rechtstreeks naar de vermelding zelf en blijft geldig.
 *
 * Het staat in sameAs, en dat is geen sierlijkheid: het is de manier waarop je
 * tegen een zoekmachine zegt dat de site en het bedrijfsprofiel hetzelfde
 * bedrijf zijn. Zonder die verklaring zijn het twee losse vermeldingen die
 * elkaar niet versterken.
 */
export const GOOGLE_BEDRIJFSPROFIEL = "https://www.google.com/maps?cid=6204411132456829216";

/** Het servicegebied, gelijk aan wat er in het Google Bedrijfsprofiel staat. */
export const SERVICEGEBIED = [
  "Amsterdam",
  "Amstelveen",
  "Diemen",
  "Zaanstad",
  "Haarlem",
  "Hoofddorp",
  "Almere",
  "Weesp",
] as const;

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/* --- Meta-tags ------------------------------------------------------- */

type MetaTag =
  { title: string } | { name: string; content: string } | { property: string; content: string };

/**
 * De volledige set meta-tags voor één pagina.
 *
 * Dit stond eerst per route uitgeschreven, en dan gaat het schuiven: tien van
 * de twaalf pagina's misten `og:url`, de kaartsoort voor Twitter stond overal
 * op `summary` (een postzegel naast de tekst) terwijl er een liggende
 * afbeelding is, en `/afmelden` erfde de omschrijving van de homepage. Eén
 * plek waar dat wordt samengesteld, scheelt dat soort gaten.
 *
 * Let op de volgorde ten opzichte van het hostingplatform: dat vult ontbrekende
 * og-tags na het renderen zelf aan. Door ze hier compleet mee te geven is er
 * niets meer aan te vullen en houden we de regie over wat er gedeeld wordt.
 */
export function paginaMeta(opties: {
  /** Pad vanaf de root, bijvoorbeeld `/ai-scan`. Bepaalt `og:url`. */
  pad: string;
  titel: string;
  beschrijving: string;
  /** Korter en pakkender dan de titel; valt terug op `titel`. */
  ogTitel?: string;
  /** Idem voor de omschrijving; valt terug op `beschrijving`. */
  ogBeschrijving?: string;
  ogType?: "website" | "article";
  /** Zet `noindex` voor pagina's die niet in de zoekresultaten horen. */
  noindex?: boolean;
}): MetaTag[] {
  const ogTitel = opties.ogTitel ?? opties.titel;
  const ogBeschrijving = opties.ogBeschrijving ?? opties.beschrijving;

  const tags: MetaTag[] = [
    { title: opties.titel },
    { name: "description", content: opties.beschrijving },

    { property: "og:title", content: ogTitel },
    { property: "og:description", content: ogBeschrijving },
    { property: "og:type", content: opties.ogType ?? "website" },
    { property: "og:url", content: absoluteUrl(opties.pad) },
    { property: "og:site_name", content: "Zakelijke AI Agents" },
    { property: "og:locale", content: "nl_NL" },
    { property: "og:image", content: OG_AFBEELDING },
    { property: "og:image:width", content: OG_AFBEELDING_BREEDTE },
    { property: "og:image:height", content: OG_AFBEELDING_HOOGTE },
    { property: "og:image:alt", content: "Zakelijke AI Agents — AI-agency voor het MKB" },

    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: ogTitel },
    { name: "twitter:description", content: ogBeschrijving },
    { name: "twitter:image", content: OG_AFBEELDING },
  ];

  if (opties.noindex) tags.push({ name: "robots", content: "noindex" });

  return tags;
}

/** De canonieke verwijzing voor een pagina. Hoort op elke indexeerbare pagina. */
export function canoniek(pad: string) {
  return { rel: "canonical", href: absoluteUrl(pad) };
}

/* --- Structured data -------------------------------------------------- */

/**
 * Het bedrijf en de persoon erachter, als één samenhangende beschrijving.
 *
 * Staat in de root en dus op elke pagina. Dat is met opzet: het is de
 * verklaring van wie deze site is, en die geldt overal. Losse pagina's voegen
 * hun eigen type toe (een dienst, een artikel, een kruimelpad) en verwijzen met
 * `@id` hiernaartoe in plaats van het bedrijf opnieuw te beschrijven.
 */
export function organizationJsonLd() {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfessionalService",
        "@id": ORGANISATIE_ID,
        name: "Zakelijke AI Agents",
        url: SITE_URL,
        email: "wouter@zakelijkeaiagents.nl",
        telephone: "+31614486257",
        // Het KvK-nummer maakt van "een bedrijf met deze naam" een bedrijf dat
        // in een openbaar register staat en dus na te trekken is.
        identifier: {
          "@type": "PropertyValue",
          name: "KvK",
          value: "64493423",
        },
        logo: {
          "@type": "ImageObject",
          "@id": `${SITE_URL}/#logo`,
          url: LOGO_AFBEELDING,
          width: 512,
          height: 512,
          caption: "Zakelijke AI Agents",
        },
        image: { "@id": `${SITE_URL}/#logo` },
        sameAs: [GOOGLE_BEDRIJFSPROFIEL],
        priceRange: "€€",
        currenciesAccepted: "EUR",
        areaServed: SERVICEGEBIED.map((plaats) => ({ "@type": "City", name: plaats })),
        address: {
          "@type": "PostalAddress",
          addressLocality: "Amsterdam",
          addressCountry: "NL",
        },
        founder: { "@id": PERSOON_ID },
        employee: { "@id": PERSOON_ID },
        knowsLanguage: ["nl", "en"],
        description:
          "Zakelijke AI Agents is een AI-agency voor het MKB: AI-scan, projectondersteuning en maatwerk AI-automatiseringen, van eerste verkenning tot een AI-project dat daadwerkelijk rendement oplevert.",
      },
      {
        // De persoon is een eigen entiteit, want de belofte van deze site is
        // dat je de bouwer spreekt en niet een accountmanager. Dan moet die
        // bouwer ook in de gegevens staan, met naam, rol en waar hij van is.
        "@type": "Person",
        "@id": PERSOON_ID,
        name: "Wouter Ransijn",
        jobTitle: "Oprichter & AI-automatisering specialist",
        url: SITE_URL,
        email: "wouter@zakelijkeaiagents.nl",
        worksFor: { "@id": ORGANISATIE_ID },
        knowsAbout: [
          "AI-automatisering",
          "AI-strategie",
          "Procesautomatisering",
          "EU AI Act",
          "n8n",
          "Zapier",
          "Make",
        ],
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: SITE_URL,
        name: "Zakelijke AI Agents",
        inLanguage: "nl-NL",
        publisher: { "@id": ORGANISATIE_ID },
      },
    ],
  });
}

/**
 * Het kruimelpad, machineleesbaar.
 *
 * Elke SEO-pagina toont bovenaan al "Home / <pagina>". Die aanwijzing staat nu
 * alleen in de opmaak; hiermee kan Google hem ook in het zoekresultaat tonen,
 * in plaats van de kale URL.
 */
export function kruimelpadJsonLd(kruimels: ReadonlyArray<{ naam: string; pad: string }>) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: kruimels.map((k, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: k.naam,
      item: absoluteUrl(k.pad),
    })),
  });
}

/**
 * Een dienst die we aanbieden, gekoppeld aan het bedrijf.
 *
 * De dienstenpagina's droegen alleen een FAQ. Daarmee weet een zoekmachine wel
 * welke vragen erop beantwoord worden, maar niet waar de pagina eigenlijk
 * over gaat of wie hem levert.
 */
export function dienstJsonLd(opties: {
  naam: string;
  beschrijving: string;
  pad: string;
  /** Instapbedrag in euro's, als dat op de pagina staat. */
  vanafPrijs?: number;
}) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Service",
    name: opties.naam,
    description: opties.beschrijving,
    url: absoluteUrl(opties.pad),
    serviceType: "AI-automatisering",
    provider: { "@id": ORGANISATIE_ID },
    areaServed: { "@type": "Country", name: "NL" },
    ...(opties.vanafPrijs !== undefined && {
      offers: {
        "@type": "Offer",
        price: opties.vanafPrijs,
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: absoluteUrl(opties.pad),
      },
    }),
  });
}

/**
 * Een artikel met auteur en datum.
 *
 * Voor een stuk dat volledig op geciteerd onderzoek leunt is dat geen detail:
 * auteurschap en datum zijn precies waarop een zoekmachine beoordeelt of een
 * bewering ergens vandaan komt, en zonder die twee blijft het een losse pagina.
 */
export function artikelJsonLd(opties: {
  titel: string;
  beschrijving: string;
  pad: string;
  gepubliceerd: string;
  gewijzigd?: string;
}) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: opties.titel,
    description: opties.beschrijving,
    url: absoluteUrl(opties.pad),
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(opties.pad) },
    datePublished: opties.gepubliceerd,
    dateModified: opties.gewijzigd ?? opties.gepubliceerd,
    inLanguage: "nl-NL",
    author: { "@id": PERSOON_ID },
    publisher: { "@id": ORGANISATIE_ID },
    image: OG_AFBEELDING,
    isPartOf: { "@id": WEBSITE_ID },
  });
}

/**
 * Prijzen machineleesbaar maken. `price` is het bedrag waarmee een klant
 * instapt; de volledige prijsopbouw (eenmalig plus maandelijks) staat in
 * `description`, zodat de tekst nooit iets anders belooft dan de pagina zelf.
 */
export function offerCatalogJsonLd(
  cards: ReadonlyArray<{
    readonly title: string;
    readonly price: string;
    readonly schemaPrice: number;
    readonly note: string;
  }>,
) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "Tarieven Zakelijke AI Agents",
    url: `${SITE_URL}/tarieven`,
    provider: { "@id": ORGANISATIE_ID },
    itemListElement: cards.map((c, i) => ({
      "@type": "Offer",
      position: i + 1,
      name: c.title,
      description: `${c.price}. ${c.note}`,
      price: c.schemaPrice,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      areaServed: { "@type": "Country", name: "NL" },
      itemOffered: { "@type": "Service", name: c.title, serviceType: "AI-automatisering" },
    })),
  });
}
