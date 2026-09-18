import {
  BarChart3,
  Clock,
  Download,
  Euro,
  Filter,
  Gauge,
  Layers,
  Lock,
  Mail,
  MessageSquare,
  Send,
  Zap,
} from "lucide-react";
import { PORTAL } from "@/content/site";
import { Reveal } from "@/hooks/use-reveal";
import { Check, Container, CtaButton, Eyebrow, H2, Lead, Section } from "./ui";

const USP_ICONS = {
  lock: Lock,
  layers: Layers,
  barChart: BarChart3,
  clock: Clock,
  euro: Euro,
  gauge: Gauge,
  trechter: Filter,
  fileDown: Download,
} as const;

const TILE_ICONS = {
  message: MessageSquare,
  clock: Clock,
  euro: Euro,
} as const;

const VARIANT_ICONS = {
  zap: Zap,
  mail: Mail,
  message: MessageSquare,
  send: Send,
} as const;

export function PortalSection() {
  return (
    <Section id="portaal" labelledBy="portaal-titel">
      <Container>
        <Reveal>
          <Eyebrow>{PORTAL.eyebrow}</Eyebrow>
          <H2 id="portaal-titel">{PORTAL.h2}</H2>
          <Lead>{PORTAL.intro}</Lead>
        </Reveal>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
          {/* USP-lijst */}
          <div className="grid gap-3 sm:grid-cols-2">
            {PORTAL.usps.map((u, i) => {
              const Icon = USP_ICONS[u.icon as keyof typeof USP_ICONS];
              return (
                <Reveal key={u.title} delay={i * 45}>
                  <article className="card-glass-lg card-lift group flex h-full flex-col rounded-2xl p-5">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet/15 text-violet transition-all duration-300 group-hover:scale-110 group-hover:bg-violet/25">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-3.5 font-display text-[15px] font-bold tracking-tight text-brand">
                      {u.title}
                    </h3>
                    <p className="mt-1.5 text-[12.5px]/[1.65] text-ink/70">{u.body}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>

          {/* Mock dashboard-voorbeeld */}
          <Reveal delay={120}>
            <div className="card-glass-lg relative overflow-hidden rounded-[28px] border-violet/30 p-5 sm:p-6 lg:sticky lg:top-24">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-4 opacity-60 blur-2xl"
                style={{
                  background:
                    "radial-gradient(50% 60% at 30% 0%, rgba(120,110,255,.18), transparent 70%)",
                }}
              />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet/15 text-violet">
                      <Gauge className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <p className="font-display text-[14px] font-semibold text-brand">Dashboard</p>
                  </div>
                  <span className="rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[10.5px] font-semibold tracking-wide text-ink/55 uppercase">
                    {PORTAL.preview.badge}
                  </span>
                </div>

                <p className="mt-5 text-[11px] font-semibold tracking-wide text-ink/50 uppercase">
                  {PORTAL.preview.title}
                </p>
                <span className="mt-1 block text-[11px] text-ink/40">{PORTAL.preview.month}</span>

                <div className="mt-3 grid grid-cols-3 gap-2.5">
                  {PORTAL.preview.tiles.map((t) => {
                    const Icon = TILE_ICONS[t.icon as keyof typeof TILE_ICONS];
                    return (
                      <div
                        key={t.label}
                        className={`rounded-2xl border px-3 py-3 ${
                          t.nadruk
                            ? "border-violet/30 bg-violet/[0.07]"
                            : "border-white/10 bg-white/[0.03]"
                        }`}
                      >
                        <span className={`inline-flex ${t.nadruk ? "text-violet" : "text-ink/40"}`}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <p
                          className={`mt-1.5 font-display text-[18px] leading-none font-bold tabular-nums ${
                            t.nadruk ? "text-violet" : "text-brand"
                          }`}
                        >
                          {t.value}
                        </p>
                        <p className="mt-1.5 text-[10px] leading-tight text-ink/55">{t.label}</p>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-3 text-[10.5px]/[1.55] text-ink/45">{PORTAL.preview.verantwoording}</p>

                {/* Fair use */}
                <div className="mt-5">
                  <p className="text-[11px] font-semibold tracking-wide text-ink/50 uppercase">
                    Fair use
                  </p>
                  <div className="mt-2.5">
                    <div className="flex items-baseline justify-between text-[11.5px]">
                      <span className="text-ink/75">{PORTAL.preview.fairUse.agent}</span>
                      <span className="font-semibold text-amber-300">
                        {PORTAL.preview.fairUse.used} van {PORTAL.preview.fairUse.total}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{
                          width: `${Math.round(
                            (PORTAL.preview.fairUse.used / PORTAL.preview.fairUse.total) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Trechter */}
                <div className="mt-5">
                  <p className="text-[11px] font-semibold tracking-wide text-ink/50 uppercase">
                    {PORTAL.preview.trechterTitle}
                  </p>
                  <ul className="mt-3 grid gap-2">
                    {PORTAL.preview.trechter.map((t) => (
                      <li key={t.label}>
                        <div className="flex items-baseline justify-between text-[11.5px]">
                          <span className="text-ink/75">{t.label}</span>
                          <span className="font-semibold text-ink/85">{t.value}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet to-indigo"
                            style={{ width: `${Math.max(t.pct, 2)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Per agent anders */}
        <Reveal>
          <p className="mt-14 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-violet">
            {PORTAL.variantLabel}
          </p>
        </Reveal>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PORTAL.variants.map((v, i) => {
            const Icon = VARIANT_ICONS[v.icon as keyof typeof VARIANT_ICONS];
            return (
              <Reveal key={v.kind} delay={i * 50}>
                <article className="card-glass-lg card-lift group flex h-full flex-col rounded-3xl p-5 sm:p-6">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet/15 text-violet transition-all duration-300 group-hover:scale-110 group-hover:bg-violet/25">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="mt-4 font-mono text-[10.5px] tracking-[0.12em] text-ink/45 uppercase">
                    {v.kind}
                  </p>
                  <h3 className="mt-1 font-display text-[16px] font-bold tracking-tight text-brand">
                    {v.title}
                  </h3>
                  <ul className="mt-3.5 grid gap-1.5">
                    {v.points.map((p) => (
                      <li key={p} className="flex gap-2 text-[12.5px]/[1.6] text-ink/80">
                        <Check />
                        {p}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal>
          <div className="mt-10 flex justify-center">
            <CtaButton href="#contact">{PORTAL.cta?.label ?? "Plan een gratis AI-verkenning"}</CtaButton>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
