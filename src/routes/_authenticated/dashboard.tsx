import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { DashboardShell, STATUS_META } from "@/components/dashboard-shell";
import { getMe, listAgents } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Zakelijke AI Agents klantportaal" },
      { name: "description", content: "Bekijk status en resultaten van je AI-agents." },
      { property: "og:title", content: "Dashboard — Zakelijke AI Agents klantportaal" },
      { property: "og:description", content: "Status en resultaten van je AI-agents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const me = useServerFn(getMe);
  const agentsFn = useServerFn(listAgents);
  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => me() });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: () => agentsFn() });

  const agents = agentsQuery.data ?? [];

  return (
    <DashboardShell isAdmin={meQuery.data?.isAdmin} userName={meQuery.data?.name || meQuery.data?.email}>
      <div className="animate-rise">
        <h1 className="font-display text-[24px] font-bold tracking-tight text-brand">
          Jouw AI-agents
        </h1>
        <p className="mt-1.5 text-[13px] text-ink/55">
          Live status en resultaten van de laatste 30 dagen.
        </p>
      </div>

      {agentsQuery.isLoading && <p className="mt-6 text-[13px] text-ink/55">Laden…</p>}
      {agentsQuery.error && (
        <p className="mt-6 text-[13px] text-destructive">
          Kon de agents niet laden. Probeer het later opnieuw.
        </p>
      )}

      {!agentsQuery.isLoading && agents.length === 0 && (
        <div className="card-glass-lg mt-6 rounded-3xl p-6 text-center">
          <p className="font-display text-[16px] font-semibold text-brand">Nog geen agents</p>
          <p className="mx-auto mt-1.5 max-w-[42ch] text-[12px]/[1.6] text-ink/55">
            Zodra er een agent aan je account is gekoppeld, verschijnt die hier met live status en
            resultaten.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {agents.map((a: any, i: number) => {
          const st = STATUS_META[a.status] ?? STATUS_META["setup"]!;
          const series = (a.series ?? []).map((s: any) => ({ v: s.output_count ?? 0 }));
          return (
            <Link
              key={a.id}
              to="/agents/$agentId"
              params={{ agentId: a.id }}
              className="card-glass-lg animate-rise rounded-3xl p-5 transition hover:-translate-y-0.5"
              style={{ animationDelay: `${60 + i * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-[15px] font-semibold leading-tight text-brand">
                    {a.name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[12px]/[1.5] text-ink/55">{a.description}</p>
                </div>
                <span
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.chip}`}
                >
                  <span className={`size-1.5 rounded-full ${st.dot}`} />
                  {st.label}
                </span>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="font-display text-[26px] font-bold leading-none text-brand">
                    {a.total30}
                  </p>
                  <p className="mt-1 text-[11px] text-ink/50">
                    {a.metric_label} · 30 dagen
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-[18px] font-semibold leading-none text-indigo">
                    {a.score30 != null ? `${Number(a.score30).toFixed(0)}%` : "—"}
                  </p>
                  <p className="mt-1 text-[11px] text-ink/50">{a.score_label}</p>
                </div>
              </div>

              <div className="mt-3 h-14">
                {series.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id={`g-${a.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="oklch(0.63 0.22 281)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="oklch(0.63 0.22 281)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke="oklch(0.63 0.22 281)"
                        strokeWidth={2}
                        fill={`url(#g-${a.id})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="pt-4 text-[11px] text-ink/40">Nog te weinig data voor een grafiek</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </DashboardShell>
  );
}
