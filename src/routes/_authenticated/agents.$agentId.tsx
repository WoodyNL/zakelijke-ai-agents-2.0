import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { DashboardShell, STATUS_META } from "@/components/dashboard-shell";
import { getMe, getAgent } from "@/lib/dashboard.functions";

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

  const agent = query.data?.agent;
  const stats = query.data?.stats ?? [];
  const total = stats.reduce((s: number, r: any) => s + (r.output_count ?? 0), 0);
  const scored = stats.filter((r: any) => r.performance_score != null);
  const score = scored.length
    ? scored.reduce((s: number, r: any) => s + Number(r.performance_score), 0) / scored.length
    : null;
  const st = STATUS_META[agent?.status ?? "setup"] ?? STATUS_META["setup"]!;

  return (
    <DashboardShell isAdmin={meQuery.data?.isAdmin ?? false} userName={meQuery.data?.name ?? ""}>
      <Link to="/dashboard" className="text-[12px] font-medium text-ink/55 hover:text-indigo">
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
              <h1 className="font-display text-[24px] font-bold tracking-tight text-brand">
                {agent.name}
              </h1>
              <p className="mt-1.5 max-w-[60ch] text-[13px]/[1.6] text-ink/55">
                {agent.description}
              </p>
            </div>
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${st.chip}`}
            >
              <span className={`size-1.5 rounded-full ${st.dot}`} />
              {st.label}
            </span>
          </div>

          <div className="mt-5 flex gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition ${
                  days === r.days
                    ? "bg-brand text-primary-foreground"
                    : "border border-white/60 bg-white/60 text-ink/70 hover:bg-white/80"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat value={String(total)} label={agent.metric_label} />
            <Stat
              value={score != null ? `${score.toFixed(0)}%` : "—"}
              label={agent.score_label}
            />
            <Stat value={String(stats.length)} label="dagen met activiteit" />
          </div>

          <div className="card-glass-lg mt-3 rounded-3xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">
              Activiteit
            </p>
            <div className="mt-3 h-56">
              {stats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.map((s: any) => ({ date: s.date.slice(5), v: s.output_count }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.05 281 / 0.08)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="oklch(0.28 0.05 281 / 0.4)" />
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
                      <p className="text-[11px] text-indigo">
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
