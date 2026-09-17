import * as React from "react";
import {
  Blocks,
  CalendarDays,
  Check as CheckIcon,
  Database,
  Mail,
  MessageCircle,
  Network,
  PlugZap,
  Workflow,
} from "lucide-react";
import { HeroNetwork } from "@/components/hero-network";
import { HERO, SITE, TRUSTBAR } from "@/content/site";
import { Container, CountUp, CtaButton } from "./ui";

const ROTATING_SERVICES = ["Agents", "Projecten", "Consultancy", "Ondersteuning"] as const;

const INTEGRATION_ICONS = {
  crm: Network,
  mail: Mail,
  message: MessageCircle,
  team: Blocks,
  database: Database,
  workspace: PlugZap,
  workflow: Workflow,
  calendar: CalendarDays,
} as const;

function RotatingService() {
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % ROTATING_SERVICES.length);
    }, 2000);

    return () => window.clearInterval(interval);
  }, []);

  // De breedte van het langste woord wordt gereserveerd door `roterende-dienst`
  // in styles.css, via pseudo-inhoud. Hier stond eerst een tweede, onzichtbaar
  // <span> met "Ondersteuning" erin. Dat hield de kop netjes stil, maar het
  // woord stond wél in de tekst van de pagina: een zoekmachine las de H1 als
  // "Zakelijke AI OndersteuningAgents". Pseudo-inhoud staat niet in de DOM en
  // telt dus niet mee in wat er gelezen wordt.
  return (
    <span
      className="roterende-dienst relative inline-grid max-w-full align-bottom text-violet"
      aria-hidden="true"
    >
      <span
        key={ROTATING_SERVICES[activeIndex]}
        className="animate-word-swap col-start-1 row-start-1"
      >
        {ROTATING_SERVICES[activeIndex]}
      </span>
    </span>
  );
}

export function Hero() {
  return (
    <section className="pt-10 pb-6 md:pt-16 md:pb-10">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <div className="font-display text-[15px] font-semibold uppercase tracking-[0.14em] text-violet sm:text-[18px]">
              {HERO.eyebrow}
            </div>
            <h1
              aria-label="Zakelijke AI Agents"
              className="mt-4 max-w-[14ch] font-display text-[42px]/[1.02] font-bold tracking-tight text-brand sm:text-[60px]/[1] lg:text-[72px]/[0.98]"
            >
              <span aria-hidden="true">Zakelijke AI </span>
              <RotatingService />
            </h1>
            <p className="mt-6 font-display text-[20px]/[1.25] font-semibold text-brand sm:text-[24px]/[1.2]">
              {HERO.h1}
            </p>
            <p className="mt-3 max-w-[58ch] text-[16px]/[1.75] text-ink/70 md:text-[18px]/[1.7]">
              {HERO.sub}
            </p>

            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1">
              <CtaButton href="#contact" className="min-h-12 h-auto py-3 text-center leading-5">
                {SITE.ctaPrimary}
              </CtaButton>
              <CtaButton
                href="#ai-scan"
                variant="outline"
                className="min-h-12 h-auto py-3 text-center leading-5"
              >
                {HERO.secondaryCta}
              </CtaButton>
              <CtaButton
                href={SITE.calendlyUrl}
                variant="outline"
                className="min-h-12 h-auto border-violet/50 px-6 py-3 text-center leading-5 text-violet hover:bg-violet/10 hover:text-violet"
              >
                {HERO.tertiaryCta}
              </CtaButton>
            </div>

            <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink/50">
              {HERO.assurances.map((a) => (
                <li key={a} className="flex items-center gap-1.5">
                  <CheckIcon className="h-3.5 w-3.5 text-mint" aria-hidden="true" />
                  {a}
                </li>
              ))}
            </ul>
          </div>

          <div className="card-glass-lg rounded-3xl p-6 sm:p-7">
            <p className="font-display text-[15px] font-semibold text-brand">{HERO.cardTitle}</p>
            <div className="mt-5 grid gap-5">
              {HERO.cardStats.map((s) => (
                <div key={s.text} className="border-l-2 border-violet/60 pl-4">
                  <p className="font-display text-[28px] font-bold leading-none text-violet">
                    <CountUp
                      value={s.value}
                      {...(s.prefix ? { prefix: s.prefix } : {})}
                      {...(s.suffix ? { suffix: s.suffix } : {})}
                      {...(s.display ? { display: s.display } : {})}
                    />
                  </p>
                  <p className="mt-2 text-[13px]/[1.6] text-ink/70">{s.text}</p>
                  <p className="mt-1 text-[11px] text-ink/40">{s.source}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 md:mt-16">
          <HeroNetwork />
        </div>
      </Container>
    </section>
  );
}

export function TrustBar() {
  return (
    <section className="border-y border-white/10 py-10" aria-labelledby="integraties-titel">
      <Container>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet">
              Integraties
            </p>
            <h2
              id="integraties-titel"
              className="mt-2 font-display text-[22px] font-bold text-brand sm:text-[26px]"
            >
              AI die aansluit op wat je al gebruikt
            </h2>
          </div>
          <p className="max-w-[46ch] text-[13px]/[1.65] text-ink/60 md:text-right">
            Van inbox en CRM tot planning en administratie. Wij verbinden je systemen tot één
            werkend proces.
          </p>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {TRUSTBAR.map((integration) => {
            const Icon = INTEGRATION_ICONS[integration.icon];
            return (
              <div
                key={integration.name}
                className="integration-tile group flex min-h-[76px] items-center gap-3 rounded-xl border border-white/10 bg-white/4 px-3.5 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet/20 bg-violet/10 text-violet transition-all duration-300 group-hover:border-violet/45 group-hover:bg-violet/20">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold leading-tight text-ink/85 transition-colors group-hover:text-ink">
                    {integration.name}
                  </span>
                  <span className="mt-1 block text-[10px] uppercase tracking-[0.1em] text-ink/35 transition-colors group-hover:text-violet/80">
                    {integration.category}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-center gap-2 text-[12px] text-ink/50">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
          </span>
          Staat jouw systeem er niet bij? In de meeste gevallen kunnen we het alsnog koppelen.
        </div>
      </Container>
    </section>
  );
}
