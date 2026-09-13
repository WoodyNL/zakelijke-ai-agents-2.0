import * as React from "react";
import { Check as CheckIcon } from "lucide-react";
import { HeroNetwork } from "@/components/hero-network";
import { HERO, SITE, TRUSTBAR } from "@/content/site";
import { Container, CountUp, CtaButton } from "./ui";

const ROTATING_SERVICES = ["Agents", "Projecten", "Consultancy", "Ondersteuning"] as const;

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

  return (
    <span className="relative inline-grid max-w-full align-bottom text-violet" aria-hidden="true">
      <span className="invisible col-start-1 row-start-1">Ondersteuning</span>
      <span key={ROTATING_SERVICES[activeIndex]} className="animate-word-swap col-start-1 row-start-1">
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
    <div className="border-y border-white/10 py-8">
      <Container className="flex flex-col gap-3 md:flex-row md:items-center md:gap-8">
        <span className="text-[12px] text-ink/40">Werkt met:</span>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {TRUSTBAR.map((t) => (
            <span key={t} className="text-[13px] font-medium text-ink/55">
              {t}
            </span>
          ))}
        </div>
      </Container>
    </div>
  );
}
