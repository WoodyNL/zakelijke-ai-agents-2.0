import { Mail, MessageCircle, Zap } from "lucide-react";
import { AGENTS, PRICING } from "@/content/site";
import { Reveal } from "@/hooks/use-reveal";
import { Check, Container, CtaButton, Eyebrow, H2, Lead, Section } from "./ui";

const ICONS = { zap: Zap, mail: Mail, message: MessageCircle } as const;

export function AgentsSection() {
  return (
    <Section id="agents" labelledBy="agents-titel">
      <Container>
        <Reveal>
          <Eyebrow>{AGENTS.eyebrow}</Eyebrow>
          <H2 id="agents-titel">{AGENTS.h2}</H2>
          <Lead>{AGENTS.intro}</Lead>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {AGENTS.cards.map((c, i) => {
            const Icon = ICONS[c.icon as keyof typeof ICONS];
            return (
              <Reveal key={c.title} delay={i * 70}>
                <article className="card-glass-lg card-lift flex h-full flex-col rounded-3xl p-6 sm:p-7">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet/15 text-violet">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-display text-[18px] font-bold tracking-tight text-brand">
                    {c.title}
                  </h3>
                  <p className="mt-3 text-[13px]/[1.7] text-ink/70">{c.body}</p>
                  <span className="mt-5 inline-flex w-fit rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-ink/65">
                    {c.badge}
                  </span>
                </article>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}

export function PricingSection() {
  return (
    <Section id="tarieven" tinted labelledBy="tarieven-titel">
      <Container>
        <Reveal>
          <Eyebrow>{PRICING.eyebrow}</Eyebrow>
          <H2 id="tarieven-titel">{PRICING.h2}</H2>
          <Lead>{PRICING.intro}</Lead>
        </Reveal>

        <div className="mt-10 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PRICING.cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 60}>
              <article
                className={`card-glass-lg flex h-full flex-col rounded-3xl p-6 ${
                  c.featured ? "border-violet/45 xl:-mt-4" : "card-lift"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-[17px] font-bold tracking-tight text-brand">
                    {c.title}
                  </h3>
                  {"badge" in c && c.badge ? (
                    <span className="rounded-full bg-violet px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                      {c.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-[15px]/[1.5] font-semibold text-ink/85">{c.price}</p>
                <ul className="mt-5 grid flex-1 gap-2.5">
                  {c.items.map((it) => (
                    <li key={it} className="flex gap-2 text-[13px]/[1.6] text-ink/70">
                      <Check />
                      {it}
                    </li>
                  ))}
                </ul>
                <CtaButton
                  href="#contact"
                  variant={c.featured ? "primary" : "outline"}
                  className="mt-6 w-full"
                >
                  {PRICING.buttonLabel}
                </CtaButton>
              </article>
            </Reveal>
          ))}
        </div>

        <div className="mt-8 grid gap-2">
          {PRICING.notes.map((n) => (
            <p key={n} className="text-[13px]/[1.7] text-ink/50">
              {n}
            </p>
          ))}
        </div>
      </Container>
    </Section>
  );
}
