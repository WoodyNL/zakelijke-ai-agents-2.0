import { Link } from "@tanstack/react-router";

export const PRICING_TIERS = [
  {
    name: "Start",
    setup: "€795",
    monthly: "€495",
    tagline: "Je eerste agent, deze week live",
    features: [
      "1 AI agent naar keuze",
      "1 kanaal (e-mail of WhatsApp)",
      "Tot 300 leads per maand",
      "Koppeling met je formulier of inbox",
    ],
    highlight: false,
  },
  {
    name: "Groei",
    setup: "€1.295",
    monthly: "€895",
    tagline: "Meest gekozen — beste prijs per agent",
    features: [
      "2 AI agents: Sales + WhatsApp Follow-up",
      "CRM- en agendakoppeling inbegrepen",
      "Tot 750 leads per maand",
      "Persoonlijke opvolging op beide kanalen",
    ],
    highlight: true,
  },
  {
    name: "Compleet",
    setup: "€1.795",
    monthly: "€1.395",
    tagline: "Alle agents, alle kanalen, 24/7",
    features: [
      "Alle 3 agents inbegrepen",
      "Onbeperkte kanalen, 2.000+ leads p/m",
      "Priority support",
      "Kwartaalreview van je strategie",
    ],
    highlight: false,
  },
] as const;

/** Pricing grid, gedeeld door de homepage en de /prijzen-pagina. */
export function PricingTiers({ onBook }: { onBook?: () => void }) {
  return (
    <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
      {PRICING_TIERS.map((t) => {
        const cta = onBook ? (
          <button
            onClick={onBook}
            className={
              t.highlight
                ? "mt-4 inline-flex h-9 w-full items-center justify-center rounded-full bg-brand text-[12px] font-semibold text-primary-foreground cta-lift"
                : "mt-4 inline-flex h-9 w-full items-center justify-center rounded-full border border-white/15 bg-white/5 text-[12px] font-semibold text-brand hover:bg-white/10"
            }
          >
            Plan een demo
          </button>
        ) : (
          <Link
            to="/"
            hash="demo"
            className={
              t.highlight
                ? "mt-4 inline-flex h-9 w-full items-center justify-center rounded-full bg-brand text-[12px] font-semibold text-primary-foreground cta-lift"
                : "mt-4 inline-flex h-9 w-full items-center justify-center rounded-full border border-white/15 bg-white/5 text-[12px] font-semibold text-brand hover:bg-white/10"
            }
          >
            Plan een demo
          </Link>
        );

        return (
          <div
            key={t.name}
            className={
              t.highlight
                ? "card-glass-lg card-lift relative rounded-3xl p-4 ring-1 ring-indigo/40"
                : "card-glass card-lift sheen rounded-3xl p-4"
            }
          >
            {t.highlight && (
              <span className="absolute -top-2.5 right-4 rounded-full bg-indigo px-2.5 py-1 text-[10px] font-semibold text-white">
                Aanbevolen
              </span>
            )}
            <p className="font-display text-[14px] font-semibold text-brand">{t.name}</p>
            <p className="mt-2 font-display text-[24px] leading-none font-bold text-brand">
              {t.monthly}
              <span className="text-[11px] font-medium text-ink/45">/mnd</span>
            </p>
            <p className="mt-1 text-[10px] text-ink/45">+ {t.setup} eenmalige setup</p>
            <p className="mt-2 text-[11px] font-medium text-ink/60">{t.tagline}</p>
            <ul className="mt-3 space-y-1.5">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-[11px]/[1.5] text-ink/55">
                  <span className="mt-1 block size-1 shrink-0 rounded-full bg-mint" />
                  {f}
                </li>
              ))}
            </ul>
            {cta}
          </div>
        );
      })}
    </div>
  );
}
