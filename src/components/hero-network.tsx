import * as React from "react";
import { motion } from "framer-motion";
import { Mail, Headphones, Users, CalendarClock } from "lucide-react";

type Node = {
  icon: React.ElementType;
  text: string;
  /** relatieve positie in de container (0-1) */
  fx: number;
  fy: number;
  tasks: string[];
};

const NODES: Node[] = [
  {
    icon: Mail,
    text: "E-mail",
    fx: 0.09,
    fy: 0.13,
    tasks: [
      "Nieuwe lead gelezen",
      "Relevantie bepaald",
      "Lead verrijkt",
      "Persoonlijke reactie geschreven",
      "E-mail verstuurd",
    ],
  },
  {
    icon: Headphones,
    text: "Klantenservice",
    fx: 0.08,
    fy: 0.8,
    tasks: [
      "Klantvraag geclassificeerd",
      "Context uit historie gehaald",
      "Concept-antwoord opgesteld",
      "Klaargezet ter goedkeuring",
      "Complexe vraag doorgezet",
    ],
  },
  {
    icon: Users,
    text: "CRM & Sales",
    fx: 0.9,
    fy: 0.8,
    tasks: [
      "Lead aangemaakt in CRM",
      "Kwalificatie vastgelegd",
      "Eigenaar toegewezen",
      "Follow-up ingepland",
      "Dagrapport naar eigenaar",
    ],
  },
  {
    icon: CalendarClock,
    text: "Planning",
    fx: 0.91,
    fy: 0.1,
    tasks: [
      "Beschikbaarheid gecheckt",
      "Voorstel gestuurd via WhatsApp",
      "Herinnering automatisch verstuurd",
      "Afspraak geboekt in agenda",
      "Bevestiging naar beide partijen",
    ],
  },
];

const STEP = 0.42;
const CHECK_DELAY = 0.3;
const LINE_START = 5 * STEP + 0.3;
const CYCLE_MS = (LINE_START + 0.9 + 1.2) * 1000;

type Box = { w: number; h: number; l: number; t: number; r: number; b: number };

/** Snijpunt van de lijn (van kaartmidden naar het label) met de kaartrand. */
function edgePoint(box: Box, px: number, py: number, gap: number) {
  const cx = (box.l + box.r) / 2;
  const cy = (box.t + box.b) / 2;
  const dx = px - cx;
  const dy = py - cy;
  const hw = (box.r - box.l) / 2 + gap;
  const hh = (box.b - box.t) / 2 + gap;
  if (dx === 0 && dy === 0) return [cx, cy] as const;
  const tx = dx === 0 ? Infinity : hw / Math.abs(dx);
  const ty = dy === 0 ? Infinity : hh / Math.abs(dy);
  const t = Math.min(tx, ty);
  return [cx + dx * t, cy + dy * t] as const;
}

/** Donkere hero met netwerk-diagram; elk kanaal rondt zijn eigen vijf taken af. */
export function HeroNetwork({ onBook }: { onBook: () => void }) {
  const [active, setActive] = React.useState(0);
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [box, setBox] = React.useState<Box | null>(null);

  React.useEffect(() => {
    const id = setInterval(() => setActive((c) => (c + 1) % NODES.length), CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    const measure = () => {
      const c = canvasRef.current;
      const k = cardRef.current;
      if (!c || !k) return;
      const cr = c.getBoundingClientRect();
      const kr = k.getBoundingClientRect();
      setBox({
        w: cr.width,
        h: cr.height,
        l: kr.left - cr.left,
        t: kr.top - cr.top,
        r: kr.right - cr.left,
        b: kr.bottom - cr.top,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (canvasRef.current) ro.observe(canvasRef.current);
    if (cardRef.current) ro.observe(cardRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const paths = React.useMemo(() => {
    if (!box) return null;
    return NODES.map((n) => {
      const ax = n.fx * box.w;
      const ay = n.fy * box.h;
      const [ex, ey] = edgePoint(box, ax, ay, 4);
      // start net buiten het label, niet op het icoon zelf
      const len = Math.hypot(ex - ax, ey - ay) || 1;
      const sx = ax + ((ex - ax) / len) * 26;
      const sy = ay + ((ey - ay) / len) * 26;
      const c1x = sx + (ex - sx) * 0.35;
      const c1y = sy + (ey - sy) * 0.1;
      const c2x = sx + (ex - sx) * 0.72;
      const c2y = sy + (ey - sy) * 0.85;
      return {
        d: `M${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`,
        anchor: [ax, ay] as const,
      };
    });
  }, [box]);

  const node = NODES[active]!;
  const hx = paths ? paths[active]!.anchor[0] : 0;
  const hy = paths ? paths[active]!.anchor[1] : 0;

  return (
    <section className="relative mt-8 overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0a0f] sm:mt-12">
      {/* grid-patroon */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.14) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      {/* zachte indigo/violet gloed */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(48% 55% at 62% 50%, rgba(120,110,255,.16), transparent 70%), radial-gradient(40% 45% at 30% 20%, rgba(174,143,247,.10), transparent 70%)",
        }}
      />

      <div className="relative grid gap-8 px-5 py-10 sm:px-10 sm:py-14 lg:grid-cols-2 lg:items-center lg:gap-6">
        {/* Copy */}
        <div className="min-w-0">
          <h1 className="mt-4 max-w-[19ch] font-display text-[34px]/[1.05] font-bold tracking-tight text-white sm:text-[50px]/[1.02]">
            Drie AI agents die je sales én klantenservice{" "}
            <span className="bg-gradient-to-r from-[#786eff] to-[#ae8ff7] bg-clip-text text-transparent">
              draaien
            </span>
            .
          </h1>
          <p className="mt-4 max-w-[50ch] text-[14px]/[1.6] text-white/55 sm:text-[16px]">
            Onze agents kwalificeren je leads, schrijven antwoorden op klantvragen en volgen op via
            e-mail en WhatsApp — automatisch, 24/7. Zie in 30 minuten hoe het werkt.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={onBook}
              className="cta-lift inline-flex h-12 items-center rounded-full bg-gradient-to-r from-[#786eff] to-[#ae8ff7] px-6 text-[14px] font-semibold tracking-tight text-white"
              style={{ boxShadow: "0 16px 34px -12px rgba(120,110,255,.75)" }}
            >
              Plan een gratis demo
            </button>
            <span className="text-[11px] font-medium text-white/40">
              30 min · geen verplichtingen · direct inzicht
            </span>
          </div>
        </div>

        {/* Netwerk-canvas */}
        <div ref={canvasRef} className="relative h-[300px] w-full min-w-0 md:h-[480px]">
          <svg
            viewBox={box ? `0 0 ${box.w} ${box.h}` : "0 0 1000 620"}
            className="absolute inset-0 hidden h-full w-full md:block"
            aria-hidden
          >
            <defs>
              <linearGradient id="hotgrad" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#786eff" />
                <stop offset="100%" stopColor="#ae8ff7" />
              </linearGradient>
              <radialGradient id="hotglow">
                <stop offset="0%" stopColor="#ae8ff7" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#786eff" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* rustige verbindingslijnen */}
            {paths?.map((p, i) =>
              i === active ? null : (
                <path
                  key={NODES[i]!.text}
                  d={p.d}
                  fill="none"
                  stroke="#8b85b8"
                  strokeOpacity="0.25"
                  strokeWidth="1.2"
                />
              ),
            )}

            {/* losse nodes */}
            {box &&
              [
                [0.18, 0.11],
                [0.3, 0.9],
                [0.82, 0.21],
                [0.7, 0.92],
                [0.06, 0.35],
                [0.95, 0.69],
              ].map(([fx, fy]) => (
                <circle
                  key={`${fx}-${fy}`}
                  cx={fx! * box.w}
                  cy={fy! * box.h}
                  r="2.6"
                  fill="#8b85b8"
                  fillOpacity="0.35"
                />
              ))}

            {/* actieve hot path — stroomt van het kanaal naar de agent */}
            {paths && (
              <>
                <path
                  d={paths[active]!.d}
                  fill="none"
                  stroke="url(#hotgrad)"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
                <motion.path
                  key={`flow-${active}-${box?.w}`}
                  d={paths[active]!.d}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeDasharray="10 320"
                  animate={{ strokeDashoffset: [0, -330] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                  opacity="0.85"
                />
                <motion.circle
                  cx={hx}
                  cy={hy}
                  r="34"
                  fill="url(#hotglow)"
                  animate={{ opacity: [0.35, 0.8, 0.35], scale: [0.9, 1.08, 0.9] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  style={{ transformOrigin: `${hx}px ${hy}px` }}
                />
                {[18, 27].map((r, i) => (
                  <motion.circle
                    key={r}
                    cx={hx}
                    cy={hy}
                    r={r}
                    fill="none"
                    stroke="#ae8ff7"
                    strokeWidth="1"
                    animate={{ opacity: [0.5, 0, 0.5], scale: [0.85, 1.15, 0.85] }}
                    transition={{
                      duration: 2.6,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.4,
                    }}
                    style={{ transformOrigin: `${hx}px ${hy}px` }}
                  />
                ))}
                <circle cx={hx} cy={hy} r="5" fill="url(#hotgrad)" />
              </>
            )}
          </svg>

          {/* randlabels */}
          {NODES.map((n, i) => (
            <div
              key={n.text}
              className="absolute hidden -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center md:block"
              style={{ left: `${n.fx * 100}%`, top: `${n.fy * 100}%` }}
            >
              <n.icon
                className={`mx-auto mb-1 size-4 ${i === active ? "text-[#ae8ff7]" : "text-white/35"}`}
                strokeWidth={1.5}
              />
              <span
                className={
                  i === active
                    ? "font-display text-[12px] font-bold tracking-tight bg-gradient-to-r from-[#786eff] to-[#ae8ff7] bg-clip-text text-transparent"
                    : "font-display text-[11px] font-medium tracking-tight text-white/45"
                }
              >
                {n.text}
              </span>
            </div>
          ))}

          {/* Terminal-kaart */}
          <div
            ref={cardRef}
            className="absolute left-0 right-0 top-1/2 mx-auto w-full max-w-[340px] rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
            style={{
              transform: "translateY(-50%)",
              boxShadow: "0 30px 60px -30px rgba(120,110,255,.8)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex gap-1.5">
                  <span className="size-2 rounded-full bg-[#ff5f57]" />
                  <span className="size-2 rounded-full bg-[#febc2e]" />
                  <span className="size-2 rounded-full bg-[#28c840]" />
                </span>
                <span className="font-sans text-[11px] text-white/45">// agent · {node.text}</span>
              </div>
              <motion.span
                key={`badge-${active}`}
                initial={{ opacity: 0.25 }}
                animate={{ opacity: 1 }}
                transition={{ delay: LINE_START + 0.6, duration: 0.3 }}
                className="rounded-full border border-[#ae8ff7]/40 bg-white/5 px-2.5 py-1 text-[9.5px] font-semibold tracking-[0.14em] text-white/80 backdrop-blur-xl"
                style={{ boxShadow: "0 0 18px -4px rgba(174,143,247,.7) inset" }}
              >
                VOLTOOID
              </motion.span>
            </div>

            <ul key={active} className="mt-4 space-y-2.5">
              {node.tasks.map((t, i) => (
                <motion.li
                  key={t}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * STEP, duration: 0.35, ease: "easeOut" }}
                  className="flex items-center gap-2 text-[12px] text-white/75"
                >
                  <span className="text-[#786eff]">→</span>
                  <span className="min-w-0 flex-1 truncate">{t}</span>
                  <motion.span
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: i * STEP + CHECK_DELAY,
                      type: "spring",
                      stiffness: 380,
                      damping: 16,
                    }}
                    className="grid size-4 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#786eff] to-[#ae8ff7] text-[9px] font-bold text-white"
                  >
                    ✓
                  </motion.span>
                </motion.li>
              ))}
            </ul>

            <motion.div
              key={`rule-${active}`}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ delay: LINE_START, duration: 0.9, ease: "easeInOut" }}
              className="mt-4 h-px rounded-full bg-gradient-to-r from-[#786eff] to-[#ae8ff7]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
