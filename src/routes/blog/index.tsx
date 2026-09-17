import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";
import { ARTIKELEN, datumInWoorden } from "@/content/blog";
import { SITE } from "@/content/site";
import { canoniek, kruimelpadJsonLd, paginaMeta, SITE_URL } from "@/lib/seo";

const PAD = "/blog";
const TITEL = "Blog over AI-automatisering voor het MKB | Zakelijke AI Agents";
const BESCHRIJVING =
  "Wat er in de praktijk misgaat met AI-projecten in het mkb, en wat er wél werkt. Onderbouwd met onderzoek, geschreven door de persoon die het bouwt.";

const shadowBrand = { boxShadow: "0 12px 26px -12px oklch(0.2 0.04 285 / 0.8)" } as const;

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: paginaMeta({
      pad: PAD,
      titel: TITEL,
      beschrijving: BESCHRIJVING,
      ogTitel: "Blog over AI-automatisering voor het MKB",
      ogBeschrijving:
        "Wat er misgaat met AI-projecten in het mkb, en wat er wél werkt. Onderbouwd met onderzoek.",
    }),
    links: [canoniek(PAD)],
    scripts: [
      {
        type: "application/ld+json",
        children: kruimelpadJsonLd([
          { naam: "Home", pad: "/" },
          { naam: "Blog", pad: PAD },
        ]),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          "@id": `${SITE_URL}${PAD}#blog`,
          name: "Blog — Zakelijke AI Agents",
          description: BESCHRIJVING,
          url: `${SITE_URL}${PAD}`,
          inLanguage: "nl-NL",
          publisher: { "@id": `${SITE_URL}/#organisatie` },
          blogPost: ARTIKELEN.map((a) => ({
            "@type": "BlogPosting",
            headline: a.titel,
            description: a.samenvatting,
            url: `${SITE_URL}${a.pad}`,
            datePublished: a.gepubliceerd,
            dateModified: a.gewijzigd ?? a.gepubliceerd,
            author: { "@id": `${SITE_URL}/#wouter-ransijn` },
          })),
        }),
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="theme-dark surface-gradient min-h-screen w-full font-sans text-ink antialiased">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-8 sm:py-8">
        <div
          className="flex items-center justify-between gap-2 rounded-full border border-white/10 px-4 py-2 backdrop-blur-md sm:px-6"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
        >
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <BrandLogo textClassName="hidden text-[15px] sm:inline" />
          </Link>
          <Link
            to="/"
            hash="contact"
            className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full bg-brand px-3 text-[12px] font-semibold text-primary-foreground cta-lift sm:px-4"
            style={shadowBrand}
          >
            <span className="sm:hidden">Gratis verkenning</span>
            <span className="hidden sm:inline">{SITE.ctaPrimary}</span>
          </Link>
        </div>

        <nav aria-label="Kruimelpad" className="mt-6 text-[11px] text-ink/45">
          <Link to="/" className="inline-block py-2.5 -my-2.5 hover:text-ink/70">
            Home
          </Link>
          <span className="px-1.5">/</span>
          <span className="text-ink/70">Blog</span>
        </nav>

        <header className="mt-3">
          <h1 className="font-display text-[30px]/[1.15] font-bold tracking-tight text-brand sm:text-[38px]/[1.1]">
            Blog
          </h1>
          <p className="mt-4 max-w-[62ch] text-[15px]/[1.7] text-ink/65">
            Wat er in de praktijk misgaat met AI-projecten in het mkb, en wat er wél werkt.
            Onderbouwd met onderzoek, geschreven door {SITE.person} — de persoon die het ook
            daadwerkelijk bouwt.
          </p>
        </header>

        <div className="mt-10 grid gap-4">
          {ARTIKELEN.map((artikel) => (
            <article key={artikel.pad} className="card-glass-lg rounded-3xl p-6 sm:p-8">
              <p className="text-[11px] text-ink/45">
                <time dateTime={artikel.gepubliceerd}>{datumInWoorden(artikel.gepubliceerd)}</time>
                <span className="px-1.5">·</span>
                {artikel.leestijd} lezen
              </p>
              <h2 className="mt-2 font-display text-[20px]/[1.25] font-bold tracking-tight text-brand sm:text-[24px]/[1.2]">
                <Link to={artikel.pad} className="hover:underline">
                  {artikel.titel}
                </Link>
              </h2>
              <p className="mt-3 max-w-[70ch] text-[14px]/[1.75] text-ink/65">
                {artikel.samenvatting}
              </p>
              <Link
                to={artikel.pad}
                className="mt-4 inline-flex items-center gap-2 py-2 text-[13px] font-semibold text-violet hover:underline"
              >
                Lees het artikel <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>

        <section className="card-glass-lg mt-6 rounded-3xl p-7 text-center sm:p-10">
          <h2 className="font-display text-[22px] font-bold tracking-tight text-brand sm:text-[26px]">
            Liever het gesprek dan het artikel?
          </h2>
          <p className="mx-auto mt-3 max-w-[52ch] text-[14px]/[1.7] text-ink/65">
            In een half uur kijken we naar één proces waar het bij jullie schuurt, en zeggen we
            eerlijk of AI daar iets oplevert. Ook als het antwoord nee is.
          </p>
          <Link
            to="/"
            hash="contact"
            className="mt-6 inline-flex h-13 items-center gap-2 rounded-full bg-brand px-9 py-3.5 text-[15px] font-semibold text-primary-foreground cta-lift"
            style={shadowBrand}
          >
            {SITE.ctaPrimary}
            <span aria-hidden="true">→</span>
          </Link>
        </section>

        <footer className="mt-10 grid gap-3 pb-6">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link
              to="/privacyverklaring"
              className="inline-block py-2.5 -my-2.5 text-[11px] text-ink/40 hover:text-ink/70"
            >
              Privacyverklaring
            </Link>
            <Link
              to="/algemene-voorwaarden"
              className="inline-block py-2.5 -my-2.5 text-[11px] text-ink/40 hover:text-ink/70"
            >
              Algemene voorwaarden
            </Link>
            <Link
              to="/ai-beleid"
              className="inline-block py-2.5 -my-2.5 text-[11px] text-ink/40 hover:text-ink/70"
            >
              AI-beleid
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-display text-[13px] font-semibold text-brand">{SITE.name}</span>
            <span className="text-[11px] text-ink/40">
              Amsterdam · KvK {SITE.kvk} · © 2026 {SITE.name}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
