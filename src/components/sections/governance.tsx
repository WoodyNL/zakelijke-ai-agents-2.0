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

import wouterAsset from "@/assets/wouter-ransijn.jpg.asset.json";

export function PersonSection() {
  return (
    <Section labelledBy="persoon-titel">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[auto_1fr] lg:gap-14 lg:items-center">
          {/* Foto met hover-effect en animatie */}
          <Reveal>
            <div className="group relative mx-auto w-[240px] sm:w-[280px]">
              {/* Gloed achter de kaart */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-3 rounded-[28px] bg-gradient-to-br from-violet/30 via-violet/5 to-transparent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
              />
              <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/5 shadow-[0_24px_60px_-20px_oklch(0.2_0.04_285/0.9)] transition-transform duration-500 ease-out group-hover:-translate-y-1.5 group-hover:scale-[1.02]">
                <img
                  src={wouterAsset.url}
                  alt={`Portret van ${PERSON.name}`}
                  className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
                {/* Naam-overlay die omhoog schuift bij hover */}
                <div className="absolute inset-x-0 bottom-0 translate-y-0 bg-gradient-to-t from-white/95 via-white/70 to-transparent p-4 transition-all duration-500 group-hover:translate-y-0">
                  <p className="font-display text-[18px] font-bold text-black">
                    {PERSON.name}
                  </p>
                  <p className="text-[12px] text-black/70">{PERSON.role}</p>
                </div>
                {/* Violette rand-gloed bij hover */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-violet/0 transition-all duration-500 group-hover:ring-2 group-hover:ring-violet/60"
                />
              </div>
            </div>
          </Reveal>

          {/* Tekst + bio */}
          <Reveal delay={100}>
            <Eyebrow>WIE JE KRIJGT</Eyebrow>
            <H2 id="persoon-titel">{PERSON.h2}</H2>
            {PERSON.body.map((p) => (
              <p key={p} className="mt-4 text-[14px]/[1.75] text-ink/70">
                {p}
              </p>
            ))}
            <div className="mt-6 grid gap-3">
              {PERSON.bio.map((p) => (
                <p key={p} className="text-[14px]/[1.7] text-ink/60">
                  {p}
                </p>
              ))}
            </div>
            <ul className="mt-6 flex flex-wrap gap-2">
              {PERSON.skills.map((s) => (
                <li
                  key={s}
                  className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[12px] font-medium text-ink/75 transition-colors duration-300 hover:border-violet/50 hover:text-violet"
                >
                  {s}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
