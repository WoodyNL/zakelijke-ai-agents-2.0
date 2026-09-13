import * as React from "react";
import { PROBLEM, REASONS } from "@/content/site";
import { Reveal } from "@/hooks/use-reveal";
import { Container, CountUp, Eyebrow, H2, Lead, Section, Source } from "./ui";

export function ProblemSection() {
  return (
    <Section tinted labelledBy="probleem-titel">
      <Container>
        <Reveal>
          <Eyebrow>{PROBLEM.eyebrow}</Eyebrow>
          <H2 id="probleem-titel">{PROBLEM.h2}</H2>
          <Lead>{PROBLEM.intro}</Lead>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PROBLEM.stats.map((s, i) => (
            <Reveal key={s.text} delay={i * 60}>
              <div className="card-glass-lg card-lift h-full rounded-2xl p-6">
                <p className="font-display text-[38px] font-bold leading-none text-warn">
                  <CountUp
                    value={s.value}
                    {...(s.suffix ? { suffix: s.suffix } : {})}
                  />
                </p>
                <p className="mt-3 text-[14px]/[1.65] text-ink/75">{s.text}</p>
                <p className="mt-3 text-[11px] text-ink/40">{s.source}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-10 border-t border-white/10 pt-10 text-center">
            <p className="mx-auto max-w-[60ch] text-[17px]/[1.6] font-medium text-mint md:text-[19px]/[1.6]">
              {PROBLEM.kicker}
            </p>
            <p className="mt-2 text-[11px] text-ink/40">{PROBLEM.kickerSource}</p>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}

export function ReasonsSection() {
  return (
    <Section labelledBy="redenen-titel">
      <Container>
        <Reveal>
          <Eyebrow>{REASONS.eyebrow}</Eyebrow>
          <H2 id="redenen-titel">{REASONS.h2}</H2>
          <Lead>{REASONS.intro}</Lead>
        </Reveal>

        <div className="mt-10 grid gap-4">
          {REASONS.rows.map((r, i) => (
            <Reveal key={r.n} delay={i * 50}>
              <ReasonRow row={r} />
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}

type Row = (typeof REASONS.rows)[number];

function ReasonRow({ row }: { row: Row }) {
  const [open, setOpen] = React.useState(false);
  return (
    <article className="card-glass-lg card-lift relative overflow-hidden rounded-3xl p-6 sm:p-8">
      <span className="absolute right-6 top-5 font-display text-[34px] font-bold leading-none text-ink/10 sm:left-6 sm:right-auto sm:text-[28px]">
        {row.n}
      </span>
      <div className="grid gap-6 md:grid-cols-2 md:gap-10 md:divide-x md:divide-white/10">
        <div className="sm:pl-14 md:pr-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-warn">
            Het probleem
          </p>
          <p className="mt-3 text-[14px]/[1.7] text-ink/75">{row.problem}</p>
          {"problemSource" in row && row.problemSource ? (
            <Source>{row.problemSource}</Source>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-4 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-semibold text-ink/75 md:hidden"
          >
            {open ? "Verberg onze aanpak" : "Bekijk onze aanpak"}
            <span aria-hidden="true">{open ? "↑" : "↓"}</span>
          </button>
        </div>
        <div className={`${open ? "block" : "hidden"} md:block md:pl-8`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mint">
            Onze aanpak
          </p>
          <p className="mt-3 text-[14px]/[1.7] text-ink/75">{row.approach}</p>
        </div>
      </div>
    </article>
  );
}
