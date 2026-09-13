import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Reveal } from "@/hooks/use-reveal";
import { SITE } from "@/content/site";

const shadowBrand = { boxShadow: "0 12px 26px -12px oklch(0.2 0.04 285 / 0.8)" } as const;

export type SeoSection = { heading: string; body: string; bullets?: string[] };

export function SeoPage({
  kicker,
  title,
  intro,
  sections,
  faqs,
  children,
}: {
  kicker: string;
  title: string;
  intro: string;
  sections: SeoSection[];
  faqs: { q: string; a: string }[];
  children?: ReactNode;
}) {
  return (
    <div className="theme-dark surface-gradient min-h-screen w-full font-sans text-ink antialiased">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-8 sm:py-8">
        <div
          className="flex items-center justify-between rounded-full border border-white/10 px-4 py-2 backdrop-blur-md sm:px-6"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
        >
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="inline-flex h-9 items-center rounded-full border border-white/15 bg-white/10 px-4 text-[12px] font-semibold text-white hover:bg-white/20"
            >
              Klantlogin
            </Link>
            <Link
              to="/"
              hash="contact"
              className="inline-flex h-9 items-center whitespace-nowrap rounded-full bg-brand px-4 text-[12px] font-semibold text-primary-foreground cta-lift"
              style={shadowBrand}
            >
              {SITE.ctaPrimary}
            </Link>
          </div>
        </div>

        <nav aria-label="Kruimelpad" className="mt-6 text-[11px] text-ink/45">
          <Link to="/" className="hover:text-ink/70">
            Home
          </Link>
          <span className="px-1.5">/</span>
          <span className="text-ink/70">{kicker}</span>
        </nav>

        <header className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet">{kicker}</p>
          <h1 className="mt-2 font-display text-[30px]/[1.15] font-bold tracking-tight text-brand sm:text-[40px]/[1.1]">
            {title}
          </h1>
          <p className="mt-4 max-w-[62ch] text-[15px]/[1.7] text-ink/65">{intro}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/"
              hash="contact"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-7 text-[14px] font-semibold text-primary-foreground cta-lift"
              style={shadowBrand}
            >
              {SITE.ctaPrimary}
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              to="/"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 text-[13px] font-semibold text-ink/80 hover:bg-white/10 hover:text-ink"
            >
              <span aria-hidden="true">←</span> Terug naar home
            </Link>
            <span className="text-[12px] text-ink/45">
              Online of persoonlijk bij je op kantoor in Amsterdam.
            </span>
          </div>
        </header>

        {children}

        {sections.map((s) => (
          <Reveal as="section" key={s.heading} className="mt-10">
            <div className="card-glass-lg rounded-3xl p-6 sm:p-8">
              <h2 className="font-display text-[20px] font-bold tracking-tight text-brand sm:text-[24px]">
                {s.heading}
              </h2>
              <p className="mt-3 max-w-[70ch] text-[14px]/[1.75] text-ink/65">{s.body}</p>
              {s.bullets && (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {s.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[13px]/[1.6] text-ink/70"
                    >
                      <span aria-hidden="true" className="text-mint">
                        ✓
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Reveal>
        ))}

        <Reveal as="section" className="mt-10">
          <h2 className="font-display text-[20px] font-bold tracking-tight text-brand sm:text-[24px]">
            Veelgestelde vragen
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {faqs.map((f) => (
              <div key={f.q} className="card-glass-lg rounded-2xl p-5">
                <h3 className="font-display text-[15px] font-semibold text-brand">{f.q}</h3>
                <p className="mt-2 text-[13px]/[1.7] text-ink/65">{f.a}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal as="section" className="mt-10">
          <div className="card-glass-lg rounded-3xl p-7 text-center sm:p-10">
            <h2 className="font-display text-[22px] font-bold tracking-tight text-brand sm:text-[28px]">
              Liever even persoonlijk kennismaken in Amsterdam?
            </h2>
            <p className="mx-auto mt-3 max-w-[52ch] text-[14px]/[1.7] text-ink/65">
              We komen langs bij je op kantoor in Amsterdam of omgeving, of we doen het online — wat jou
              het beste uitkomt. In 30 minuten weet je precies wat een agent voor jouw bedrijf oplevert.
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
            <p className="mt-3 text-[12px] text-ink/45">Reactie binnen één werkdag.</p>
          </div>
        </Reveal>

        <Reveal as="section" className="mt-10">
          <h2 className="font-display text-[16px] font-bold tracking-tight text-brand">
            Meer over Zakelijke AI Agents
          </h2>
          <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
            <SeoLink to="/ai-scan" label="AI-scan" />
            <SeoLink to="/ai-voor-het-mkb-amsterdam" label="AI voor het MKB in Amsterdam" />
            <SeoLink to="/ai-automatisering-op-maat" label="Maatwerk AI-automatisering" />
            <SeoLink to="/ai-project-vastgelopen" label="AI-project vastgelopen?" />
            <SeoLink to="/ai-consultancy-mkb" label="AI-consultancy & strategie" />
            <SeoLink to="/ai-agents-amsterdam" label="AI agents in Amsterdam" />
            <SeoLink to="/ai-lead-opvolging" label="AI lead opvolging" />
            <SeoLink to="/whatsapp-follow-up-automatiseren" label="WhatsApp follow-up automatiseren" />
            <SeoLink to="/ai-klantenservice-automatiseren" label="AI klantenservice automatiseren" />
            <SeoLink to="/blog/waarom-ai-pilots-mislukken" label="Waarom AI-pilots mislukken" />
          </div>
        </Reveal>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 pb-6">
          <span className="font-display text-[13px] font-semibold text-brand">Zakelijke AI Agents</span>
          <span className="text-[11px] text-ink/40">Amsterdam · © 2026 Zakelijke AI Agents</span>
        </footer>
      </div>
    </div>
  );
}

function SeoLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-full border border-white/12 bg-white/5 px-4 py-2 font-semibold text-ink/70 hover:bg-white/10 hover:text-ink"
    >
      {label}
    </Link>
  );
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  });
}
