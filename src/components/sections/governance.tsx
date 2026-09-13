import { GOVERNANCE, PERSON, PROOF } from "@/content/site";
import { Reveal } from "@/hooks/use-reveal";
import { Check, Container, CountUp, Eyebrow, H2, Section } from "./ui";

export function GovernanceSection() {
  return (
    <Section labelledBy="governance-titel">
      <Container>
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <Reveal>
            <Eyebrow>{GOVERNANCE.eyebrow}</Eyebrow>
            <H2 id="governance-titel">{GOVERNANCE.h2}</H2>
            {GOVERNANCE.body.map((p) => (
              <p key={p} className="mt-4 max-w-[62ch] text-[14px]/[1.75] text-ink/70">
                {p}
              </p>
            ))}
            <ul className="mt-6 grid gap-2.5">
              {GOVERNANCE.points.map((p) => (
                <li key={p} className="flex gap-2 text-[13px]/[1.65] text-ink/75">
                  <Check />
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={80}>
            <div className="card-glass-lg rounded-3xl p-6 sm:p-7">
              <p className="font-display text-[16px] font-bold text-brand">
                {GOVERNANCE.timelineTitle}
              </p>
              <ol className="mt-5 grid gap-5">
                {GOVERNANCE.timeline.map((t) => (
                  <li key={t.date} className="border-l-2 border-violet/50 pl-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-ink/70">
                        {t.date}
                      </span>
                      {"now" in t && t.now ? (
                        <span className="rounded-full bg-mint/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-mint">
                          {t.now}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[14px] font-semibold text-ink/85">{t.title}</p>
                    <p className="mt-1 text-[13px]/[1.65] text-ink/60">{t.body}</p>
                  </li>
                ))}
              </ol>
            </div>
            <p className="mt-3 text-[11px]/[1.6] text-ink/40">{GOVERNANCE.footnote}</p>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}

export function ProofSection() {
  return (
    <Section tinted labelledBy="bewijs-titel">
      <Container>
        <Reveal>
          <H2 id="bewijs-titel">{PROOF.h2}</H2>
        </Reveal>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PROOF.stats.map((s, i) => (
            <Reveal key={s.text} delay={i * 60}>
              <div className="card-glass-lg stat-pop h-full rounded-2xl p-6 text-center">
                <p className="font-display text-[34px] font-bold leading-none text-mint">
                  <CountUp
                    value={s.value}
                    {...("prefix" in s && s.prefix ? { prefix: s.prefix } : {})}
                    {...("suffix" in s && s.suffix ? { suffix: s.suffix } : {})}
                  />
                </p>
                <p className="mt-3 text-[13px]/[1.6] text-ink/65">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <figure className="card-glass-lg mt-6 rounded-3xl p-7 sm:p-9">
            <span aria-hidden="true" className="font-display text-[44px] leading-none text-violet">
              “
            </span>
            <blockquote className="mt-2 max-w-[60ch] font-display text-[18px]/[1.5] font-semibold text-brand sm:text-[22px]/[1.45]">
              {PROOF.quote}
            </blockquote>
            <figcaption className="mt-4 text-[13px] text-ink/55">
              <span className="font-semibold text-ink/80">{PROOF.quoteName}</span> — {PROOF.quoteRole}
            </figcaption>
          </figure>
        </Reveal>

        <Reveal>
          <div className="mt-4 rounded-2xl border border-dashed border-white/20 p-6 text-center text-[12px] tracking-wide text-ink/40">
            {PROOF.placeholder}
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}

export function PersonSection() {
  return (
    <Section labelledBy="persoon-titel">
      <Container>
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <h2
              id="persoon-titel"
              className="font-display text-[28px]/[1.15] font-bold tracking-tight text-brand sm:text-[36px]/[1.1]"
            >
              {PERSON.h2}
            </h2>

            {PERSON.body.map((p) => (
              <p key={p} className="mt-4 text-[14px]/[1.75] text-ink/70">
                {p}
              </p>
            ))}
            <div className="mt-7 rounded-2xl border border-dashed border-white/20 p-6 text-[12px] tracking-wide text-ink/40">
              {PERSON.placeholder}
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
