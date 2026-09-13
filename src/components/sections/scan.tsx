import {
  ArrowRight,
  Briefcase,
  HardHat,
  Home,
  ShoppingCart,
  Stethoscope,
  Truck,
} from "lucide-react";
import { BRANCHES, SCAN, SITE } from "@/content/site";
import { Reveal } from "@/hooks/use-reveal";
import { Check, Container, CtaButton, Eyebrow, H2, Lead, Section } from "./ui";

const ICONS = {
  hardhat: HardHat,
  briefcase: Briefcase,
  stethoscope: Stethoscope,
  home: Home,
  truck: Truck,
  cart: ShoppingCart,
} as const;

export function ScanSection() {
  return (
    <Section id="ai-scan" labelledBy="scan-titel">
      <Container>
        <Reveal>
          <div className="relative">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-6 rounded-[40px] opacity-70 blur-2xl"
              style={{
                background:
                  "radial-gradient(50% 60% at 30% 20%, rgba(120,110,255,.22), transparent 70%), radial-gradient(45% 55% at 80% 80%, rgba(174,143,247,.18), transparent 70%)",
              }}
            />
            <div className="card-glass-lg relative rounded-[32px] border-violet/40 p-6 sm:p-10">
              <Eyebrow>{SCAN.eyebrow}</Eyebrow>
              <H2 id="scan-titel">{SCAN.h2}</H2>

              <div className="mt-7 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
                <div>
                  {SCAN.body.map((p) => (
                    <p key={p} className="mt-3 max-w-[62ch] text-[14px]/[1.75] text-ink/70">
                      {p}
                    </p>
                  ))}
                  <p className="mt-7 font-display text-[15px] font-semibold text-brand">
                    {SCAN.listTitle}
                  </p>
                  <ul className="mt-3 grid gap-2.5">
                    {SCAN.items.map((it) => (
                      <li key={it} className="flex gap-2 text-[13px]/[1.65] text-ink/75">
                        <Check />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-3xl border border-white/12 bg-white/5 p-6 sm:p-7">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-ink/45">
                    {SCAN.priceLabel}
                  </p>
                  <p className="mt-3 font-display text-[42px] font-bold leading-none text-brand">
                    {SITE.scanPrice}
                    <span className="ml-2 align-middle text-[13px] font-medium text-ink/45">
                      ex. btw
                    </span>
                  </p>
                  <p className="mt-4 text-[13px]/[1.6] font-medium text-mint">{SCAN.priceNote}</p>
                  <CtaButton href="#contact" className="mt-6 w-full">
                    {SITE.ctaPrimary}
                  </CtaButton>
                  <p className="mt-3 text-center text-[11px]/[1.5] text-ink/45">
                    {SCAN.priceFooter}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}

export function BranchesSection() {
  return (
    <Section id="branches" tinted labelledBy="branches-titel">
      <Container>
        <Reveal>
          <Eyebrow>{BRANCHES.eyebrow}</Eyebrow>
          <H2 id="branches-titel">{BRANCHES.h2}</H2>
          <Lead>{BRANCHES.intro}</Lead>
          <p className="mt-2 text-[11px] text-ink/40">{BRANCHES.introSource}</p>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {BRANCHES.cards.map((c, i) => {
            const Icon = ICONS[c.icon as keyof typeof ICONS];
            return (
              <Reveal key={c.title} delay={i * 50}>
                <article className="card-glass-lg card-lift h-full rounded-2xl p-6">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo/15 text-violet">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-display text-[16px] font-bold tracking-tight text-brand">
                    {c.title}
                  </h3>
                  <p className="mt-2 text-[13px]/[1.65] text-ink/65">{c.body}</p>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal>
          <p className="mt-8 text-center text-[13px]/[1.7] text-ink/55">
            {BRANCHES.footer}{" "}
            <a
              href="#contact"
              className="inline-flex items-center gap-1 font-semibold text-violet hover:text-ink"
            >
              {BRANCHES.footerLink}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </p>
        </Reveal>
      </Container>
    </Section>
  );
}
