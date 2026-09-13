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
      "Zakelijke AI Agents levert AI agents die sales en klantenservice overnemen: leads kwalificeren, e-mails beantwoorden en automatisch opvolgen via WhatsApp.",
  });
}
