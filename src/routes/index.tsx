import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";
import { Zap, ShieldCheck, TrendingUp, Rocket, Quote } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { HeroNetwork } from "@/components/hero-network";
import { Reveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zakelijke AI Agents — voor sales & klantenservice" },
      {
        name: "description",
        content:
          "Wij leveren zakelijke AI agents die je sales en klantenservice overnemen: leads kwalificeren, e-mails beantwoorden en automatisch opvolgen via WhatsApp. Plan een gratis demo.",
      },
      { property: "og:title", content: "Zakelijke AI Agents — voor sales & klantenservice" },
      {
        property: "og:description",
        content:
          "AI Sales Assistant, Inbox Draft Assistant en WhatsApp Follow-up — van lead-opvolging tot klantvragen beantwoorden, volledig automatisch.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    scripts: [{ src: "https://studio.pickaxe.co/api/embed/bundle.js", defer: true }],
  }),
  component: Index,
});

const shadowBrand = { boxShadow: "0 12px 26px -12px oklch(0.2 0.04 285 / 0.8)" } as const;

const TIMES = ["09:00", "10:30", "13:00", "14:30", "16:00"];

const PHASES = [
  {
    tag: "Fase 01",
    title: "Begrijpt de lead",
    accent: "indigo" as const,
    steps: [
      { n: "01", title: "Leest nieuwe leads", body: "Monitort elk formulier en aanmelding, 24/7 — niets ontgaat de AI." },
      { n: "02", title: "Bepaalt relevantie", body: "Kwalificeert intentie en fit met jouw ideale klant." },
      { n: "03", title: "Verrijkt de lead", body: "Verzamelt bedrijf, rol en signalen tot één volledig beeld." },
    ],
  },
  {
    tag: "Fase 02",
    title: "Reageert direct",
    accent: "violet" as const,
    steps: [
      { n: "04", title: "Schrijft persoonlijke reactie", body: "In jouw tone-of-voice, afgestemd op elke prospect." },
      { n: "05", title: "Stuurt e-mail & WhatsApp", body: "Direct, dag en nacht — via het kanaal dat past." },
      { n: "06", title: "Zet lead in CRM", body: "Contact direct verrijkt aangemaakt, geen handwerk." },
    ],
  },
  {
    tag: "Fase 03",
    title: "Volgt op & sluit",
    accent: "mint" as const,
    steps: [
      { n: "07", title: "Plant follow-up", body: "Automatisch op het juiste moment ingepland." },
      { n: "08", title: "Herinnert de prospect", body: "Zachte reminders zonder spam — de prospect blijft warm." },
      { n: "09", title: "Boekt afspraak", body: "Agenda-koppeling: alleen warme leads belanden bij sales." },
      { n: "10", title: "Rapporteert dagelijks", body: "Elke dag een helder overzicht voor de eigenaar." },
    ],
  },
];

const USPS = [
  {
    icon: Zap,
    badge: "bg-indigo text-white",
    stat: "±40 sec",
    title: "Razendsnelle reactie",
    body: "Terwijl concurrenten nog een ticket aanmaken, heeft jouw agent de lead al beantwoord en gekwalificeerd.",
  },
  {
    icon: TrendingUp,
    badge: "bg-mint text-brand",
    stat: "3×",
    title: "Meer afspraken, minder ruis",
    body: "Sales praat alleen nog met leads die al gekwalificeerd zijn. Minder tijd verspild, meer deals gesloten.",
  },
  {
    icon: ShieldCheck,
    badge: "bg-violet text-white",
    stat: "0",
    title: "Nooit een gemiste lead",
    body: "Elke aanvraag krijgt een agent toegewezen — geen voicemail, geen weekend-gat, geen genegeerd bericht.",
  },
  {
    icon: Rocket,
    badge: "bg-indigo text-white",
    stat: "1 dag",
    title: "Live binnen een dag",
    body: "Geen implementatietraject van maanden. Wij koppelen je tools en de agent draait deze week al.",
  },
];

const STATS = [
  { value: 40, prefix: "±", suffix: "s", label: "tot eerste reactie" },
  { value: 3, prefix: "", suffix: "×", label: "sneller opgevolgd" },
  { value: 0, prefix: "", suffix: "", label: "berichten gemist" },
] as const;

/** Telt op naar `value` zodra het cijfer in beeld komt; toont direct de eindwaarde bij reduced motion. */
function AnimatedNumber({ value, duration = 1.4 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  return <span ref={ref}>{display}</span>;
}

const accent = (a: string) =>
  a === "mint"
    ? { bar: "bg-mint", badge: "bg-mint text-brand" }
    : a === "violet"
      ? { bar: "bg-violet", badge: "bg-violet text-white" }
      : { bar: "bg-indigo", badge: "bg-indigo text-white" };

type AgentPhase = {
  tag: string;
  title: string;
  accent: "indigo" | "violet" | "mint";
  steps: { n: string; title: string; body: string }[];
};
type Agent = {
  eyebrow: string;
  badge: string;
  headerName: string;
  headerSub: string;
  phases: AgentPhase[];
  outcome: { headline: string; cells: { title: string; sub: string }[] };
};

const AGENTS: Agent[] = [
  {
    eyebrow: "Wat de AI Sales Assistant doet",
    badge: "10 stappen · automatisch",
    headerName: "AI Sales Assistant",
    headerSub: "van lead tot afspraak",
    phases: PHASES,
    outcome: {
      headline: "Sales krijgt alleen warme leads.",
      cells: [
        { title: "Ja · Geboekt", sub: "→ agenda" },
        { title: "Nee · Follow-up", sub: "→ automatisch via mail + WhatsApp" },
      ],
    },
  },
  {
    eyebrow: "Wat de Inbox Draft Assistant doet",
    badge: "6 stappen · jij keurt goed",
    headerName: "Inbox Draft Assistant",
    headerSub: "concept antwoorden, jij verstuurt",
    phases: [
      {
        tag: "Fase 01",
        title: "Leest je inbox",
        accent: "indigo",
        steps: [
          { n: "01", title: "Leest inkomende mail", body: "Verbindt met Gmail/Outlook en leest elke nieuwe sales-mail." },
          { n: "02", title: "Bepaalt intentie", body: "Sorteert vragen, offertes en support uit elkaar." },
          { n: "03", title: "Verzamelt context", body: "Vat de hele thread samen tot één beeld." },
        ],
      },
      {
        tag: "Fase 02",
        title: "Schrijft een concept",
        accent: "violet",
        steps: [
          { n: "04", title: "Schrijft persoonlijk concept", body: "In jouw tone-of-voice, klaar om te versturen." },
          { n: "05", title: "Wacht op jouw akkoord", body: "Geen autosend — jij reviewet voordat het weggaat." },
          { n: "06", title: "Leert van je wijzigingen", body: "Elke aanpassing maakt het volgende concept beter." },
        ],
      },
    ],
    outcome: {
      headline: "Jij stuurt alleen, als je tevreden bent.",
      cells: [
        { title: "Concept", sub: "klaar voor review" },
        { title: "Akkoord", sub: "jij drukt op send" },
      ],
    },
  },
  {
    eyebrow: "Wat de WhatsApp Follow-up Agent doet",
    badge: "5 stappen · één brein, meerdere deuren",
    headerName: "WhatsApp Follow-up Agent",
    headerSub: "automatische opvolging op WhatsApp",
    phases: [
      {
        tag: "Fase 01",
        title: "Neemt contact op",
        accent: "indigo",
        steps: [
          { n: "01", title: "Wacht het juiste moment", body: "Stuurt een bericht na een ingestelde delay — nooit te pushy." },
          { n: "02", title: "Hergebruikt de kwalificatie", body: "Dezelfde logica als de Sales AI, alleen op een nieuw kanaal." },
          { n: "03", title: "Houdt gesprek gaande", body: "Beantwoordt vragen en houdt de lead warm." },
        ],
      },
      {
        tag: "Fase 02",
        title: "Schakelt over als het lastig wordt",
        accent: "mint",
        steps: [
          { n: "04", title: "Herkent complexe reacties", body: "Detecteert wanneer menselijke hulp nodig is." },
          { n: "05", title: "Handt over aan medewerker", body: "Direct route naar een teamlid — geen wachttijd." },
        ],
      },
    ],
    outcome: {
      headline: "Eén brein, meerdere deuren — dezelfde logiek, nieuw kanaal.",
      cells: [
        { title: "Eenvoudig", sub: "AI houdt warm" },
        { title: "Complex", sub: "→ naar mens" },
      ],
    },
  },
];

function AgentSection({ agent, index }: { agent: Agent; index: number }) {
  const total = agent.phases.reduce((n, p) => n + p.steps.length, 0);
  return (
    <Reveal as="section" className="group/agent mt-14" delay={40}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55">
          {agent.eyebrow}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink/55">
          <span className="size-1.5 rounded-full bg-mint animate-pulse-dot" />
          {agent.badge}
        </span>
      </div>

      <div
        className="sheen cta-lift flex items-center justify-between rounded-3xl bg-gradient-to-r from-[#786eff] to-[#ae8ff7] px-5 py-4 text-white"
        style={shadowBrand}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-white/15 font-display text-[13px] font-bold">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <p className="font-display text-[15px] leading-tight font-semibold text-white sm:text-[17px]">
              {agent.headerName}
            </p>
            <p className="text-[11px] leading-tight text-white/60">{agent.headerSub}</p>
          </div>
        </div>
        <span className="hidden rounded-full border border-white/20 px-3 py-1 text-[10px] font-medium text-white/70 sm:inline">
          {total} stappen
        </span>
      </div>

      <div
        className={`relative mt-4 grid gap-3 sm:grid-cols-2 ${agent.phases.length === 3 ? "lg:grid-cols-3" : ""}`}
      >
        {agent.phases.map((phase, pi) => {
          const ac = accent(phase.accent);
          return (
            <Reveal
              key={phase.tag}
              delay={pi * 90}
              className="card-glass-lg card-lift relative flex h-full flex-col overflow-hidden rounded-3xl p-5"
            >
              <span className={`absolute inset-x-0 top-0 h-1 ${ac.bar}`} />
              <div className="flex items-baseline justify-between">
                <span className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-ink/40">
                  {phase.tag}
                </span>
                <span className="text-[10px] font-medium text-ink/35">
                  {phase.steps.length} taken
                </span>
              </div>
              <p className="mt-1.5 font-display text-[16px] font-semibold leading-tight text-brand">
                {phase.title}
              </p>
              <ul className="mt-4 space-y-1">
                {phase.steps.map((s) => (
                  <li key={s.n} className="step-row flex items-start gap-3 p-2">
                    <span
                      className={`glow-badge mt-0.5 grid size-7 shrink-0 place-items-center rounded-xl font-display text-[11px] font-bold ${ac.badge}`}
                    >
                      {s.n}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-brand">{s.title}</p>
                      <p className="mt-0.5 text-[11px]/[1.55] text-ink/55">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>
          );
        })}
      </div>

      <Reveal
        delay={140}
        className="sheen cta-lift mt-3 rounded-3xl bg-gradient-to-br from-indigo to-violet p-5 text-white"
        style={{ boxShadow: "0 20px 44px -22px oklch(0.63 0.22 281 / 0.73)" }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
          Uitkomst
        </p>
        <p className="mt-1.5 font-display text-[17px] font-semibold leading-tight sm:text-[19px]">
          {agent.outcome.headline}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {agent.outcome.cells.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-white/25 bg-white/15 px-3 py-2.5 transition-colors duration-300 hover:bg-white/25"
            >
              <p className="text-[11px] font-semibold">{c.title}</p>
              <p className="text-[10px] text-white/70">{c.sub}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </Reveal>
  );
}


function ChatbotEmbed() {
  return (
    <div
      id="deployment-76877bbe-77c7-483a-966c-e31250ff4c45"
      suppressHydrationWarning
    />
  );
}

function nextDays(count: number) {
  const days: { label: string; date: string }[] = [];
  const d = new Date();
  while (days.length < count) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    days.push({
      label: d.toLocaleDateString("nl-NL", { weekday: "short" }),
      date: d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
    });
  }
  return days;
}

function BookingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [day, setDay] = useState<number | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [phone, setPhone] = useState("");
  const days = nextDays(7);

  useEffect(() => {
    if (open) {
      setStep(0);
      setDay(null);
      setTime(null);
      setName("");
      setEmail("");
      setChannel("email");
      setPhone("");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Demo boeken"
    >
      <div
        className="card-glass-lg max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[#111119]/95 p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-indigo font-display text-[11px] font-bold text-white">
              C
            </div>
            <div>
              <p className="font-display text-[14px] font-semibold text-brand">Demo boeken</p>
              <p className="text-[10px] text-ink/50">30 min · videogesprek · gratis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Sluiten"
            className="grid size-8 place-items-center rounded-full bg-ink/5 text-[13px] text-ink/60 transition-colors hover:bg-ink/10"
          >
            ✕
          </button>
        </div>

        {step === 0 && (
          <div className="mt-5 animate-rise">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">
              Kies een dag
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {days.map((d, i) => (
                <button
                  key={d.date}
                  onClick={() => setDay(i)}
                  className={`rounded-xl border px-2 py-3 text-center transition-all ${
                    day === i
                      ? "border-indigo bg-indigo text-white"
                      : "border-white/12 bg-white/5 text-ink hover:border-indigo/40"
                  }`}
                >
                  <span className="block text-[10px] font-medium opacity-70">{d.label}</span>
                  <span className="block text-[12px] font-semibold">{d.date}</span>
                </button>
              ))}
            </div>
            {day !== null && (
              <>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50 animate-rise">
                  Kies een tijd
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 animate-rise">
                  {TIMES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTime(t)}
                      className={`rounded-xl border px-2 py-2.5 text-[13px] font-semibold transition-all ${
                        time === t
                          ? "border-indigo bg-indigo text-white"
                          : "border-white/12 bg-white/5 text-ink hover:border-indigo/40"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button
              disabled={day === null || !time}
              onClick={() => setStep(1)}
              className="mt-5 w-full rounded-full bg-brand py-3 text-[13px] font-semibold text-primary-foreground transition-opacity disabled:opacity-30"
              style={shadowBrand}
            >
              Verder
            </button>
          </div>
        )}

        {step === 1 && day !== null && (
          <div className="mt-5 animate-rise">
            <div className="rounded-2xl border border-indigo/20 bg-indigo/5 px-4 py-3 text-[12px] font-medium text-brand">
              {days[day]?.label} {days[day]?.date} · {time} · 30 minuten
            </div>
            <div className="mt-4 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Je naam"
                className="w-full rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-[13px] text-ink outline-none placeholder:text-ink/40 focus:border-indigo focus:ring-2 focus:ring-indigo/40"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Zakelijk e-mailadres"
                className="w-full rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-[13px] text-ink outline-none placeholder:text-ink/40 focus:border-indigo focus:ring-2 focus:ring-indigo/40"
              />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">
                  Bevestiging via
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "email", label: "E-mail" },
                      { id: "whatsapp", label: "WhatsApp" },
                    ] as const
                  ).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setChannel(c.id)}
                      className={`rounded-xl border px-2 py-2.5 text-[13px] font-semibold transition-all ${
                        channel === c.id
                          ? "border-indigo bg-indigo text-white"
                          : "border-white/12 bg-white/5 text-ink hover:border-indigo/40"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              {channel === "whatsapp" && (
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder="Mobiel nummer (WhatsApp)"
                  className="w-full rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-[13px] text-ink outline-none placeholder:text-ink/40 focus:border-indigo focus:ring-2 focus:ring-indigo/40 animate-rise"
                />
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setStep(0)}
                className="rounded-full border border-ink/10 px-5 py-3 text-[13px] font-semibold text-ink"
              >
                Terug
              </button>
              <button
                disabled={
                  !name.trim() ||
                  !email.includes("@") ||
                  (channel === "whatsapp" && phone.trim().length < 8)
                }
                onClick={() => setStep(2)}
                className="flex-1 rounded-full bg-brand py-3 text-[13px] font-semibold text-primary-foreground transition-opacity disabled:opacity-30"
                style={shadowBrand}
              >
                Bevestig afspraak
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 pb-2 text-center animate-rise">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-mint/15">
              <span className="text-[18px] text-mint">✓</span>
            </div>
            <p className="mt-4 font-display text-[18px] font-bold text-brand">Demo geboekt!</p>
            <p className="mx-auto mt-2 max-w-[30ch] text-[12px]/[1.6] text-ink/55">
              {day !== null ? `${days[day]?.label} ${days[day]?.date}` : ""} om {time}.{" "}
              {channel === "whatsapp"
                ? `Je ontvangt zo een bevestiging via WhatsApp op ${phone}.`
                : `Je ontvangt zo een bevestiging op ${email}.`}
            </p>
            <button
              onClick={onClose}
              className="mt-5 rounded-full bg-brand px-6 py-3 text-[13px] font-semibold text-primary-foreground"
              style={shadowBrand}
            >
              Klaar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Index() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const openBooking = () => setBookingOpen(true);

  useEffect(() => {
    if (window.location.hash === "#demo") {
      setBookingOpen(true);
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  return (
    <div className="theme-dark surface-gradient min-h-screen w-full font-sans text-ink antialiased">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-8 sm:py-8">
        {/* Top bar */}
        <div
          role="banner"
          className="flex items-center justify-between rounded-full border border-white/10 px-4 py-2 backdrop-blur-md animate-rise sm:px-6"
          style={{
            backgroundImage: "none",
            backgroundColor: "rgba(255,255,255,0.05)",
            boxShadow: "0 14px 30px -24px rgba(120,110,255,.5)",
          }}
        >
          <div className="flex items-center gap-2">
            <BrandLogo />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/auth"
              className="inline-flex h-9 items-center whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-3 text-[12px] font-semibold tracking-tight text-white hover:bg-white/20 sm:px-4"
            >
              <span className="sm:hidden">Login</span>
              <span className="hidden sm:inline">Klantlogin</span>
            </Link>
            <button
              onClick={openBooking}
              className="inline-flex h-9 items-center whitespace-nowrap rounded-full bg-brand px-3 text-[12px] font-semibold tracking-tight text-primary-foreground cta-lift sm:px-4"
              style={{ boxShadow: "0 10px 22px -8px oklch(0.2 0.04 285 / 0.67)" }}
            >
              <span className="sm:hidden">Demo</span>
              <span className="hidden sm:inline">Plan een demo</span>
            </button>
          </div>
        </div>

        {/* Hero — donker netwerk-diagram */}
        <HeroNetwork onBook={openBooking} />


        {/* Agent showcase — Sales, Inbox Draft, WhatsApp Follow-up */}
        {AGENTS.map((agent, i) => (
          <AgentSection key={agent.headerName} agent={agent} index={i} />
        ))}

        {/* Mid-page CTA — vang bezoekers die hier al overtuigd zijn */}
        <Reveal as="section" className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 px-5 py-4 sm:px-7">
          <p className="font-display text-[14px] font-semibold text-brand sm:text-[15px]">
            Wil je dit voor jouw sales of klantenservice zien?
          </p>
          <button
            onClick={openBooking}
            className="inline-flex h-10 shrink-0 items-center rounded-full bg-brand px-5 text-[13px] font-semibold tracking-tight text-primary-foreground cta-lift"
            style={shadowBrand}
          >
            Plan een gratis demo
          </button>
        </Reveal>

        {/* Benefits + social proof — bento van harde, meetbare resultaten */}
        <Reveal as="section" className="mt-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo">
            // Resultaat
          </p>
          <h2 className="mt-2 font-display text-[24px] font-bold tracking-tight text-brand sm:text-[28px]">
            Dit merk je binnen de eerste week
          </h2>
          <p className="mt-2 max-w-[52ch] text-[13px]/[1.6] text-ink/55">
            Geen vage belofte over "efficiëntie" — een meetbaar verschil in reactietijd, pipeline
            en omzet.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
            <div className="card-glass-lg card-lift sheen relative flex flex-col justify-between overflow-hidden rounded-3xl p-6 sm:col-span-2 lg:col-span-2 lg:row-span-2">
              <Quote
                aria-hidden="true"
                strokeWidth={1}
                className="pointer-events-none absolute -top-3 -right-2 size-24 text-brand/[0.06]"
              />
              <p className="relative font-display text-[18px]/[1.4] font-semibold text-brand sm:text-[22px]/[1.35]">
                “Onze responstijd ging van dagen naar seconden. Sales praat nu alleen nog met
                leads die er toe doen.”
              </p>
              <div className="relative mt-5 flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-brand">Lotte van Dijk</p>
                  <p className="text-[11px] text-ink/50">Head of Sales · B2B-software</p>
                </div>
                <span className="rounded-full bg-mint/15 px-3 py-1.5 text-[11px] font-semibold text-brand">
                  3× meer afspraken
                </span>
              </div>
            </div>

            {USPS.map((u) => (
              <div key={u.title} className="card-glass card-lift sheen flex flex-col rounded-3xl p-4">
                <span className={`grid size-9 shrink-0 place-items-center rounded-2xl ${u.badge}`}>
                  <u.icon aria-hidden="true" strokeWidth={2} className="size-[18px]" />
                </span>
                <p className="mt-3 font-display text-[20px] font-bold leading-none text-brand">
                  {u.stat}
                </p>
                <p className="mt-1.5 text-[12.5px] font-semibold text-brand">{u.title}</p>
                <p className="mt-1 text-[11px]/[1.55] text-ink/55">{u.body}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Proces — Hoe het werkt */}
        <Reveal as="section" className="mt-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo">
            // Proces
          </p>
          <h2 className="mt-2 font-display text-[24px] font-bold tracking-tight text-brand sm:text-[28px]">
            Hoe het werkt
          </h2>
          <p className="mt-2 max-w-[46ch] text-[13px]/[1.6] text-ink/55">
            Van intake tot live agent — wij regelen alles. Jij houdt de regie, wij doen het werk.
          </p>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
            {[
              {
                nr: "01",
                accent: "text-indigo",
                bar: "bg-indigo",
                title: "Intake gesprek",
                body: "Wij leren je processen kennen. Welke taken kosten jullie de meeste tijd? Waar liggen de grootste winstmogelijkheden?",
              },
              {
                nr: "02",
                accent: "text-violet",
                bar: "bg-violet",
                title: "Bouwen & integreren",
                body: "Wij bouwen een op maat gemaakte AI agent en integreren deze in jullie bestaande tools — CRM, e-mail, agenda of eigen software.",
              },
              {
                nr: "03",
                accent: "text-mint",
                bar: "bg-mint",
                title: "Live & schalen",
                body: "De agent gaat live — vandaag geboekt, deze week live. Wij monitoren, optimaliseren en schalen mee naarmate jouw bedrijf groeit.",
              },
            ].map((s, i) => (
              <Reveal key={s.nr} delay={i * 70}>
                <div className="card-glass card-lift sheen group relative h-full overflow-hidden rounded-3xl p-5">
                  <span className="pointer-events-none absolute -top-2 right-3 font-display text-[64px] font-bold tracking-tight text-brand/[0.06] transition-colors duration-300 group-hover:text-brand/[0.12]">
                    {s.nr}
                  </span>
                  <span className={`block h-1 w-8 rounded-full ${s.bar}`} />
                  <p className="mt-4 font-display text-[15px] font-semibold text-brand">
                    <span className={`mr-2 text-[12px] font-bold ${s.accent}`}>{s.nr}</span>
                    {s.title}
                  </p>
                  <p className="mt-2 text-[12px]/[1.6] text-ink/55">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={openBooking}
              className="inline-flex h-12 items-center rounded-full bg-brand px-6 text-[14px] font-semibold tracking-tight text-primary-foreground cta-lift"
              style={shadowBrand}
            >
              Plan een gratis demo
            </button>
            <span className="text-[11px] font-medium text-ink/45">
              Vandaag geboekt, deze week live
            </span>
          </div>
        </Reveal>

        {/* Pricing */}
        <Reveal as="section" className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-display text-[20px] font-bold tracking-tight text-brand">
              Duidelijke pakketten, geen jaarcontract
            </h2>
            <p className="text-[11px] text-ink/45">
              3 maanden minimum, daarna maandelijks opzegbaar · prijzen ex. btw
            </p>
          </div>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {[
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
            ].map((t) => (
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
                <button
                  onClick={openBooking}
                  className={
                    t.highlight
                      ? "mt-4 inline-flex h-9 w-full items-center justify-center rounded-full bg-brand text-[12px] font-semibold text-primary-foreground cta-lift"
                      : "mt-4 inline-flex h-9 w-full items-center justify-center rounded-full border border-white/15 bg-white/5 text-[12px] font-semibold text-brand hover:bg-white/10"
                  }
                >
                  Plan een demo
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px]/[1.6] text-ink/55">
            Extra leads of WhatsApp-gesprekken boven je bundel: €1,00 per stuk. WhatsApp-gesprekskosten
            van Meta rekenen we kosteloos door. Elke agent staat binnen een dag live — terwijl
            vergelijkbare AI-agents €1.500+ setup en een jaarcontract vragen.
          </p>
        </Reveal>

        {/* FAQ */}
        <Reveal as="section" className="mt-10">
          <h2 className="font-display text-[20px] font-bold tracking-tight text-brand">
            Veelgestelde vragen
          </h2>
          <div className="mt-4 grid gap-2.5 lg:grid-cols-2">
            {[
              {
                q: "Welke agents leveren jullie?",
                a: "Drie: de AI Sales Assistant (leads kwalificeren en afspraken boeken), de Inbox Draft Assistant (concept-reacties op sales- én klantvragen) en de WhatsApp Follow-up Agent (automatische opvolging met menselijke overname).",
              },
              {
                q: "Zijn de agents alleen voor sales?",
                a: "Nee. Dezelfde agents werken ook voor klantenservice: veelgestelde klantvragen beantwoorden, verzoeken routeren naar de juiste afdeling en klanten op de hoogte houden via e-mail of WhatsApp.",
              },
              {
                q: "Hoe snel staat een agent live?",
                a: "Binnen een dag per agent. We koppelen je formulier, inbox, CRM en agenda — geen technisch team nodig.",
              },
              {
                q: "Stuurt de Inbox Draft Assistant zelfstandig mails?",
                a: "Nee, niet in het begin. Elke reactie staat als concept klaar; jij keurt goed en verstuurt. Zo bouw je vertrouwen op in de kwaliteit.",
              },
              {
                q: "Wat gebeurt er bij twijfelgevallen of complexe vragen?",
                a: "Die worden automatisch aan een medewerker aangeboden — via e-mail of WhatsApp, jij bepaalt de regels. Simpelere follow-up en klantvragen lopen automatisch door.",
              },
              {
                q: "Zit ik vast aan een contract?",
                a: "Nee. Na een minimum van 3 maanden zeg je maandelijks op met één maand opzegtermijn. Ter vergelijking: vergelijkbare AI-agentplatforms vragen vrijwel altijd een jaarcontract.",
              },
            ].map((f) => (
              <div key={f.q} className="card-glass card-lift rounded-2xl px-4 py-3.5">
                <p className="text-[13px] font-semibold text-brand">{f.q}</p>
                <p className="mt-1.5 text-[12px]/[1.55] text-ink/55">{f.a}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Stats + final CTA — grand finale */}
        <Reveal
          as="section"
          id="cta"
          className="relative mt-10 overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0a0f] px-6 py-14 text-center sm:px-12 sm:py-20"
        >
          {/* grid-patroon, zelfde sfeer als de hero */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.14) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="pointer-events-none absolute inset-0 cta-aurora" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 -left-16 size-72 rounded-full bg-indigo/30 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -bottom-10 size-80 rounded-full bg-violet/25 blur-3xl"
          />

          <div className="relative mx-auto flex max-w-2xl flex-col items-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo/25 bg-indigo/10 px-3.5 py-1.5 text-[11px] font-semibold tracking-tight text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse-dot" />
              Live resultaten van onze agents
            </span>

            <div className="mt-9 grid w-full grid-cols-3 gap-3 sm:gap-6">
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className="stat-pop rounded-2xl border border-white/10 bg-white/5 px-3 py-5 sm:py-6"
                >
                  <p className="font-display text-[30px] leading-none font-bold tracking-tight text-brand sm:text-[42px]">
                    {s.prefix}
                    <AnimatedNumber value={s.value} />
                    {s.suffix}
                  </p>
                  <p className="mt-2 text-[10px] leading-tight text-ink/50 sm:text-[11px]">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            <h2 className="mx-auto mt-10 max-w-[26ch] font-display text-[28px]/[1.15] font-bold tracking-tight text-brand sm:text-[40px]/[1.08]">
              Zie in 30 minuten hoe de agents je{" "}
              <span className="bg-gradient-to-r from-[#786eff] to-[#ae8ff7] bg-clip-text text-transparent">
                sales én support
              </span>{" "}
              overnemen.
            </h2>

            <div className="relative mt-8">
              <span
                aria-hidden="true"
                className="absolute -inset-2 rounded-full bg-gradient-to-r from-[#786eff] to-[#ae8ff7] opacity-40 blur-xl animate-pulse-dot"
              />
              <button
                onClick={openBooking}
                className="sheen relative inline-flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-[#786eff] to-[#ae8ff7] px-10 text-[15px] font-semibold tracking-tight text-white cta-lift"
                style={{ boxShadow: "0 20px 45px -12px rgba(120,110,255,.85)" }}
              >
                Plan een gratis demo
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <p className="mt-4 text-[12px] text-ink/45">Vandaag geboekt, deze week live.</p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {["Geen jaarcontract", "Live binnen 1 dag", "Nederlandse support"].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-ink/60"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Probeer de chatbot */}
        <Reveal as="section" className="mt-10">
          <div className="flex flex-col items-center text-center">
            <h2 className="font-display text-[20px] font-bold tracking-tight text-brand">
              Probeer het zelf — stel een vraag
            </h2>
            <p className="mt-1 text-[11px] text-ink/45">Dit is zo’n agent, live op onze eigen site</p>
          </div>
          <div className="chatbot-card card-glass-lg mt-4 overflow-hidden rounded-3xl p-6">
            <div className="chatbot-host mx-auto w-full max-w-2xl">
              <ChatbotEmbed />
            </div>
          </div>
        </Reveal>

        <footer className="mt-8 pb-4">
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-ink/50">
            <Link to="/ai-agents-amsterdam" className="hover:text-ink/80">
              AI agents Amsterdam
            </Link>
            <Link to="/ai-lead-opvolging" className="hover:text-ink/80">
              AI lead opvolging
            </Link>
            <Link to="/whatsapp-follow-up-automatiseren" className="hover:text-ink/80">
              WhatsApp follow-up automatiseren
            </Link>
            <Link to="/ai-klantenservice-automatiseren" className="hover:text-ink/80">
              AI klantenservice automatiseren
            </Link>
          </nav>
          <div className="mt-3 flex items-center justify-between">
            <span className="font-display text-[13px] font-semibold text-brand">Zakelijke AI Agents</span>
            <span className="text-[11px] text-ink/40">Amsterdam · © 2026 Zakelijke AI Agents</span>
          </div>
        </footer>
      </div>

      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </div>
  );
}
