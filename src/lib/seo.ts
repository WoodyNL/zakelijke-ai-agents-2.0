/** Canonical production domain. Update here when the domain changes. */
export const SITE_URL = "https://zakelijkeaiagents.nl";

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
    areaServed: {
      "@type": "City",
      name: "Amsterdam",
    },
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
