import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { DashboardShell, STATUS_META } from "@/components/dashboard-shell";
import { TrechterPaneel } from "@/components/trechter-paneel";
import { VerbruikPaneel } from "@/components/verbruik-paneel";
import { useMeekijken } from "@/hooks/use-meekijken";
import {
  haalGebeurtenissen,
  haalKerncijfers,
  haalSupportKerncijfers,
  pauzeerAgent,
} from "@/lib/agent.functions";
import { haalTrechter, type Trechter } from "@/lib/campagne.functions";
import { soortVan } from "@/lib/agent-soorten";
import { getMe, getAgent, getAgentUsage } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/agents/$agentId")({
  head: () => ({
    meta: [
      { title: "Agent-details — Zakelijke AI Agents klantportaal" },
      { name: "description", content: "Statistieken en activiteitenlog van je AI-agent." },
      { property: "og:title", content: "Agent-details — Zakelijke AI Agents klantportaal" },
      { property: "og:description", content: "Statistieken en activiteitenlog van je AI-agent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgentDetail,
});

const RANGES = [
  { label: "7 dagen", days: 7 },
  { label: "30 dagen", days: 30 },
  { label: "Alles", days: 0 },
];

function AgentDetail() {
  const { agentId } = useParams({ from: "/_authenticated/agents/$agentId" });
  const [days, setDays] = useState(30);
  const meFn = useServerFn(getMe);
  const agentFn = useServerFn(getAgent);
  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const query = useQuery({
    queryKey: ["agent", agentId, days],
    queryFn: () => agentFn({ data: { agentId, days } }),
  });

  const usageFn = useServerFn(getAgentUsage);
  const verbruikQuery = useQuery({
    queryKey: ["agent-verbruik", agentId, days],
    queryFn: () => usageFn({ data: { agentId, days } }),
  });

  const agent = query.data?.agent;
  const soort = soortVan(agent?.kind);
  const meekijken = useMeekijken();

  // "Alles" is 0 dagen voor de metingen; voor de kerncijfers betekent het tien jaar.
  const kernFn = useServerFn(haalKerncijfers);
  const kernQuery = useQuery({
    queryKey: ["kerncijfers", agentId, days],
    queryFn: () => kernFn({ data: { agentId, dagen: days || 3650 } }),
    enabled: !!agent,
  });
  const supportFn = useServerFn(haalSupportKerncijfers);
  const supportQuery = useQuery({
    queryKey: ["support-kerncijfers", agentId, days],
    queryFn: () => supportFn({ data: { agentId, dagen: days || 3650 } }),
    enabled: soort.bronnen.includes("support"),
  });
  const trechterFn = useServerFn(haalTrechter);
  const trechterQuery = useQuery({
    queryKey: ["trechter", agentId],
    queryFn: () => trechterFn({ data: { agentId } }) as Promise<Trechter>,
    enabled: soort.bronnen.includes("trechter"),
  });
  const stats = query.data?.stats ?? [];
  const total = stats.reduce((s: number, r: any) => s + (r.output_count ?? 0), 0);
  const scored = stats.filter((r: any) => r.performance_score != null);
  const score = scored.length
    ? scored.reduce((s: number, r: any) => s + Number(r.performance_score), 0) / scored.length
    : null;
  const st = STATUS_META[agent?.status ?? "setup"] ?? STATUS_META["setup"]!;

  return (
    <DashboardShell isAdmin={meQuery.data?.isAdmin ?? false} userName={meQuery.data?.name ?? ""}>
      <Link to="/dashboard" className="text-[12px] font-medium text-ink/55 hover:text-violet">
        ← Terug naar dashboard
      </Link>

      {query.isLoading && <p className="mt-6 text-[13px] text-ink/55">Laden…</p>}
      {query.error && (
        <p className="mt-6 text-[13px] text-destructive">Deze agent kon niet worden geladen.</p>
      )}

      {agent && (
        <>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-3 animate-rise">
            <div>
              <p className="font-mono text-[10.5px] tracking-[0.12em] text-violet/80 uppercase">
                {soortVan(agent.kind).label}
              </p>
              <h1 className="mt-1 font-display text-[24px] font-bold tracking-tight text-brand">
                {agent.name}
              </h1>
              <p className="mt-1.5 max-w-[60ch] text-[13px]/[1.6] text-ink/55">
                {agent.description}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${st.chip}`}
              >
                <span className={`size-1.5 rounded-full ${st.dot}`} />
                {st.label}
              </span>
              {!meekijken.data && (agent.status === "live" || agent.status === "paused") && (
                <PauzeKnop agentId={agent.id} status={agent.status} kind={agent.kind} />
              )}
            </div>
          </div>

          <div className="mt-5 flex gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition ${
                  days === r.days
                    ? "bg-brand text-primary-foreground"
                    : "border border-white/12 bg-white/5 text-ink/70 hover:border-violet/40 hover:bg-violet/10 hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Wat er op dit dashboard staat, hangt af van de soort agent (zie
              agent-soorten.ts). Alleen cijfers die we echt meten; wat eraan
              komt staat eronder, in plaats van een leeg vak. */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {soort.bronnen.includes("gesprekken") && (
              <Stat
                value={kernQuery.data ? String(kernQuery.data.gesprekken) : "—"}
                label="gesprekken"
              />
            )}
            {soort.bronnen.includes("leads") && (
              <Stat
                value={kernQuery.data ? String(kernQuery.data.leads) : "—"}
                label="leads binnengehaald"
              />
            )}
            {soort.bronnen.includes("support") && (
              <>
                <Stat
                  value={supportQuery.data ? String(supportQuery.data.binnen) : "—"}
                  label="supportmails binnen"
                />
                <Stat
                  value={
                    supportQuery.data
                      ? String(supportQuery.data.automatisch + supportQuery.data.via_concept)
                      : "—"
                  }
                  label={
                    supportQuery.data
                      ? `beantwoord (${supportQuery.data.automatisch} zelf, ${supportQuery.data.via_concept} via concept)`
                      : "beantwoord"
                  }
                />
                <Stat
                  value={supportQuery.data ? String(supportQuery.data.mens_nodig) : "—"}
                  label="naar jou doorgezet"
                />
                <Stat
                  value={
                    supportQuery.data?.reactie_minuten != null
                      ? `${supportQuery.data.reactie_minuten} min`
                      : "—"
                  }
                  label="gemiddelde reactietijd"
                />
              </>
            )}
            {soort.bronnen.includes("metingen") && (
              <>
                <Stat value={String(total)} label={agent.metric_label} />
                <Stat
                  value={score != null ? `${score.toFixed(0)}%` : "—"}
                  label={agent.score_label}
                />
              </>
            )}
            <Stat
              value={
                kernQuery.data?.laatste_activiteit
                  ? new Date(kernQuery.data.laatste_activiteit).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "short",
                    })
                  : "—"
              }
              label="laatst actief"
            />
          </div>

          {soort.bronnen.includes("trechter") &&
            trechterQuery.data &&
            trechterQuery.data.contacten > 0 && (
              <div className="mt-3">
                <TrechterPaneel t={trechterQuery.data} />
              </div>
            )}

          {soort.binnenkort.length > 0 && (
            <div className="mt-3 rounded-3xl border border-dashed border-white/12 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45">
                Binnenkort op dit dashboard
              </p>
              <p className="mt-1.5 text-[12.5px]/[1.6] text-ink/55">
                {soort.binnenkort.join(" · ")}
              </p>
            </div>
          )}

          <div className="card-glass-lg mt-3 rounded-3xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">
              Activiteit
            </p>
            <div className="mt-3 h-56">
              {stats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.map((s: any) => ({ date: s.date.slice(5), v: s.output_count }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.05 281 / 0.08)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      stroke="oklch(0.28 0.05 281 / 0.4)"
                    />
                    <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.28 0.05 281 / 0.4)" width={30} />
                    <Tooltip />
                    <Bar dataKey="v" fill="oklch(0.63 0.22 281)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="pt-6 text-[12px] text-ink/45">Nog geen data in deze periode.</p>
              )}
            </div>
          </div>

          <div className="card-glass-lg mt-3 rounded-3xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">
              Activiteitenlog
            </p>
            <ul className="mt-3 divide-y divide-white/50">
              {[...stats].reverse().map((s: any) => (
                <li key={s.id} className="flex items-start justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-brand">
                      {new Date(s.date).toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="mt-0.5 text-[11px]/[1.5] text-ink/55">
                      {s.notes || `${s.output_count} ${agent.metric_label}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[12px] font-semibold text-brand">{s.output_count}</p>
                    {s.performance_score != null && (
                      <p className="text-[11px] text-violet">
                        {Number(s.performance_score).toFixed(0)}%
                      </p>
                    )}
                  </div>
                </li>
              ))}
              {stats.length === 0 && (
                <li className="py-3 text-[12px] text-ink/45">Nog geen activiteit vastgelegd.</li>
              )}
            </ul>
          </div>
        </>
      )}
      {agent && <Gebeurtenissen agentId={agentId} />}

      <div className="mt-4">
        <VerbruikPaneel
          dagen={verbruikQuery.data?.dagen ?? []}
          minutenPerActie={verbruikQuery.data?.minutenPerActie ?? null}
          grondslag={verbruikQuery.data?.grondslag ?? null}
          periodeLabel={`laatste ${days} dagen`}
        />
      </div>
    </DashboardShell>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="card-glass-lg rounded-3xl p-5">
      <p className="font-display text-[26px] font-bold leading-none text-brand">{value}</p>
      <p className="mt-1.5 text-[11px] text-ink/50">{label}</p>
    </div>
  );
}

/**
 * De klant zet zijn agent zelf stil (fase 3). Bij een e-mailagent trekt de
 * server daarna in wat al bij Resend klaarstaat; dat staat in de vraag, want
 * het is niet terug te draaien.
 */
function PauzeKnop({
  agentId,
  status,
  kind,
}: {
  agentId: string;
  status: string;
  kind: string | null;
}) {
  const qc = useQueryClient();
  const fn = useServerFn(pauzeerAgent);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);
  const pauze = status === "live";

  async function klik() {
    if (pauze) {
      const vraag =
        kind === "uitgaande_email"
          ? "Deze agent stilzetten?\n\nBerichten die al zijn ingepland, trekken we in. Die gaan niet meer de deur uit, ook niet als je hem later weer aanzet."
          : "Deze agent stilzetten? Hij doet niets tot je hem weer aanzet.";
      if (!window.confirm(vraag)) return;
    }
    setBezig(true);
    setMelding(null);
    try {
      const r = await fn({ data: { agentId, pauze } });
      if (r.nietGelukt > 0) {
        setMelding(
          `${r.nietGelukt} ingepland bericht${r.nietGelukt === 1 ? "" : "en"} kon niet worden ingetrokken en gaat mogelijk toch weg. Mail ons als je dat wilt voorkomen.`,
        );
      } else if (r.ingetrokken > 0) {
        setMelding(`${r.ingetrokken} ingeplande berichten ingetrokken.`);
      }
      await qc.invalidateQueries();
    } catch (err) {
      setMelding(err instanceof Error ? err.message : "Dat lukte niet");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={klik}
        disabled={bezig}
        className="rounded-full border border-white/12 bg-white/5 px-3.5 py-1.5 text-[12px] font-semibold text-ink/80 transition-colors hover:border-violet/40 hover:text-ink disabled:opacity-50"
      >
        {bezig ? "Bezig\u2026" : pauze ? "Pauzeren" : "Weer aanzetten"}
      </button>
      {melding && <p className="max-w-[40ch] text-right text-[11.5px] text-ink/60">{melding}</p>}
    </div>
  );
}

/** Wanneer de agent live ging of werd stilgezet, en door wie. */
function Gebeurtenissen({ agentId }: { agentId: string }) {
  const fn = useServerFn(haalGebeurtenissen);
  const query = useQuery({
    queryKey: ["gebeurtenissen", agentId],
    queryFn: () => fn({ data: { agentId } }),
  });
  const rijen = query.data ?? [];
  if (rijen.length === 0) return null;

  const label = (s: string | null) => (s ? (STATUS_META[s]?.label ?? s) : "—");

  return (
    <div className="card-glass-lg mt-3 rounded-3xl p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">
        Statuswijzigingen
      </p>
      <ul className="mt-3 divide-y divide-white/[0.06]">
        {rijen.map((g) => (
          <li key={g.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
            <p className="text-[12.5px] text-ink/80">
              {label(g.van)} → <span className="font-semibold">{label(g.naar)}</span>
              <span className="text-ink/50"> · {g.door}</span>
            </p>
            <p className="text-[11.5px] text-ink/45">
              {new Date(g.op).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
