/** Canonical production domain. Update here when the domain changes. */
export const SITE_URL = "https://zakelijkeaiagents.nl";

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

/** Site-wide Organization schema. Rendered once from the root route. */
export function organizationJsonLd() {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Zakelijke AI Agents",
    url: SITE_URL,
    email: "wouter@zakelijkeaiagents.nl",
    telephone: "+31 6 14486257",
    sameAs: [GOOGLE_BEDRIJFSPROFIEL],
    areaServed: SERVICEGEBIED.map((plaats) => ({ "@type": "City", name: plaats })),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Amsterdam",
      addressCountry: "NL",
    },
    description:
      "Zakelijke AI Agents is een AI-agency voor het MKB: AI-scan, projectondersteuning en maatwerk AI-automatiseringen, van eerste verkenning tot een AI-project dat daadwerkelijk rendement oplevert.",
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
    url: `${SITE_URL}#tarieven`,
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
