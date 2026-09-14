import { ArrowRight, Compass, Users, Workflow } from "lucide-react";
import { METHOD, SERVICES } from "@/content/site";
import { Reveal } from "@/hooks/use-reveal";
import { Check, Container, Eyebrow, H2, Lead, Section } from "./ui";

const ICONS = { compass: Compass, users: Users, workflow: Workflow } as const;

export function ServicesSection() {
  return (
    <Section id="diensten" tinted labelledBy="diensten-titel">
      <Container>
        <Reveal>
          <Eyebrow>{SERVICES.eyebrow}</Eyebrow>
          <H2 id="diensten-titel">{SERVICES.h2}</H2>
          <Lead>{SERVICES.intro}</Lead>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {SERVICES.cards.map((c, i) => {
            const Icon = ICONS[c.icon as keyof typeof ICONS];
            return (
              <Reveal key={c.title} delay={i * 70}>
                <article
                  className={`card-glass-lg card-lift group flex h-full flex-col rounded-3xl p-6 sm:p-7 ${
                    c.highlight ? "border-violet/40" : ""
                  }`}
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet/15 text-violet transition-all duration-300 group-hover:scale-110 group-hover:bg-violet/25">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-display text-[19px] font-bold tracking-tight text-brand">
                    {c.title}
                  </h3>
                  <p className="mt-2 text-[13.5px]/[1.65] text-ink/70">{c.subtitle}</p>
                  <ul className="mt-5 grid gap-2.5">
                    {c.items.map((it) => (
                      <li key={it} className="flex gap-2 text-[13.5px]/[1.65] text-ink/85">
                        <Check />
                        {it}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={c.link.href}
                    className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-violet transition-colors hover:text-ink"
                  >
                    {c.link.label}
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </a>
                </article>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}

export function MethodSection() {
  return (
    <Section id="werkwijze" labelledBy="werkwijze-titel">
      <Container>
        <Reveal>
          <Eyebrow>{METHOD.eyebrow}</Eyebrow>
          <H2 id="werkwijze-titel">{METHOD.h2}</H2>
          <Lead>{METHOD.intro}</Lead>
        </Reveal>

        <div className="relative mt-10 grid gap-4 lg:grid-cols-4">
          <div
            aria-hidden="true"
            className="absolute left-[18px] top-4 bottom-4 w-px bg-white/10 lg:left-8 lg:right-8 lg:top-[26px] lg:bottom-auto lg:h-px lg:w-auto"
          />
          {METHOD.phases.map((p, i) => (
            <Reveal key={p.n} delay={i * 70}>
              <article className="card-glass-lg card-lift group relative ml-10 h-full rounded-3xl p-6 lg:ml-0">
                <div className="flex items-center gap-3">
                  <span className="font-display text-[22px] font-bold leading-none text-violet transition-transform duration-300 group-hover:scale-110">
                    {p.n}
                  </span>
                  <h3 className="font-display text-[17px] font-bold tracking-tight text-brand">
                    {p.title}
                  </h3>
                </div>
                <span className="mt-3 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11.5px] font-semibold text-ink/80 transition-colors duration-300 group-hover:border-violet/40 group-hover:bg-violet/10">
                  {p.badge}
                </span>
                <p className="mt-4 text-[13.5px]/[1.75] text-ink/80">{p.body}</p>
                <p className="mt-4 text-[13.5px]/[1.75] text-ink/70">
                  <span className="font-semibold text-ink">Wat je krijgt: </span>
                  {p.result}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
