import { Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";
import { TekstMetLinks } from "@/components/tekst-met-links";
import { SITE } from "@/content/site";

const shadowBrand = { boxShadow: "0 12px 26px -12px oklch(0.2 0.04 285 / 0.8)" } as const;

/**
 * Een blok in een juridische tekst: een kop met daaronder alinea's, en
 * eventueel een opsomming. Meer structuur heeft zo'n tekst niet nodig, en
 * minder maakt hem onleesbaar.
 */
export type JuridischBlok = {
  kop: string;
  alineas?: string[];
  lijst?: string[];
  /** Een tabelachtige opsomming, bijvoorbeeld "wie" → "waarvoor". */
  paren?: Array<{ naam: string; toelichting: string }>;
};

export function JuridischePagina({
  titel,
  intro,
  bijgewerkt,
  blokken,
}: {
  titel: string;
  intro: string;
  /** Datum in de vorm die een lezer verwacht, bijvoorbeeld "18 september 2026". */
  bijgewerkt: string;
  blokken: JuridischBlok[];
}) {
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
          <span className="text-ink/70">{titel}</span>
        </nav>

        <header className="mt-3">
          <h1 className="font-display text-[30px]/[1.15] font-bold tracking-tight text-brand sm:text-[38px]/[1.1]">
            {titel}
          </h1>
          <p className="mt-4 max-w-[62ch] text-[15px]/[1.7] text-ink/65">{intro}</p>
          <p className="mt-4 text-[12px] text-ink/45">Laatst bijgewerkt: {bijgewerkt}</p>
        </header>

        <div className="mt-10 grid gap-4">
          {blokken.map((blok) => (
            <section key={blok.kop} className="card-glass-lg rounded-3xl p-6 sm:p-8">
              <h2 className="font-display text-[18px] font-bold tracking-tight text-brand sm:text-[21px]">
                {blok.kop}
              </h2>

              {blok.alineas?.map((alinea) => (
                <p key={alinea} className="mt-3 max-w-[70ch] text-[14px]/[1.75] text-ink/65">
                  <TekstMetLinks tekst={alinea} />
                </p>
              ))}

              {blok.lijst && (
                <ul className="mt-4 grid gap-2">
                  {blok.lijst.map((regel) => (
                    <li
                      key={regel}
                      className="flex gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[13px]/[1.6] text-ink/70"
                    >
                      <span aria-hidden="true" className="text-mint">
                        ✓
                      </span>
                      <span>
                        <TekstMetLinks tekst={regel} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {blok.paren && (
                <dl className="mt-4 grid gap-2">
                  {blok.paren.map((paar) => (
                    <div
                      key={paar.naam}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:grid sm:grid-cols-[13rem_1fr] sm:gap-4"
                    >
                      <dt className="text-[13px] font-semibold text-ink/85">{paar.naam}</dt>
                      <dd className="mt-1 text-[13px]/[1.6] text-ink/60 sm:mt-0">
                        <TekstMetLinks tekst={paar.toelichting} />
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          ))}
        </div>

        <section className="card-glass-lg mt-6 rounded-3xl p-6 sm:p-8">
          <h2 className="font-display text-[18px] font-bold tracking-tight text-brand">
            Vragen hierover?
          </h2>
          <p className="mt-3 text-[14px]/[1.75] text-ink/65">
            Mail naar{" "}
            <a href={`mailto:${SITE.email}`} className="text-violet hover:underline">
              {SITE.email}
            </a>{" "}
            of bel{" "}
            <a
              href={`tel:${SITE.phone.replace(/\s/g, "")}`}
              className="text-violet hover:underline"
            >
              {SITE.phone}
            </a>
            . We reageren binnen één werkdag.
          </p>
        </section>

        <nav aria-label="Juridische pagina's" className="mt-8 flex flex-wrap gap-2 text-[12px]">
          <JuridischeLink to="/privacyverklaring" label="Privacyverklaring" />
          <JuridischeLink to="/algemene-voorwaarden" label="Algemene voorwaarden" />
          <JuridischeLink to="/ai-beleid" label="AI-beleid" />
          <JuridischeLink to="/tarieven" label="Tarieven" />
        </nav>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 pb-6">
          <span className="font-display text-[13px] font-semibold text-brand">{SITE.name}</span>
          <span className="text-[11px] text-ink/40">
            Amsterdam · KvK {SITE.kvk} · © 2026 {SITE.name}
          </span>
        </footer>
      </div>
    </div>
  );
}

function JuridischeLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-full border border-white/12 bg-white/5 px-4 py-2 font-semibold text-ink/70 hover:bg-white/10 hover:text-ink"
    >
      {label}
    </Link>
  );
}
