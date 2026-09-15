import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Download, Sparkles } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { DashboardShell, STATUS_META } from "@/components/dashboard-shell";
import { SITE } from "@/content/site";
import { getMe, listAgents } from "@/lib/dashboard.functions";
import { downloadRapport } from "@/lib/rapport";

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

  const agents = (agentsQuery.data ?? []) as any[];
  const live = agents.filter((a) => a.status === "live");

  // Eén totaal over alle agents. Een klant met drie agents wil eerst weten wat
  // ze samen doen, en pas daarna per stuk.
  const totaal = agents.reduce((som, a) => som + (a.total30 ?? 0), 0);
  const scores = agents.map((a) => a.score30).filter((s) => s != null) as number[];
  const gemiddeldeScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  return (
    <DashboardShell
      isAdmin={meQuery.data?.isAdmin}
      userName={meQuery.data?.name || meQuery.data?.email}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[26px] font-bold tracking-tight text-brand sm:text-[30px]">
            {meQuery.data?.name ? `Welkom terug, ${meQuery.data.name.split(" ")[0]}` : "Jouw AI-agents"}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-ink/60">
            Live status en resultaten over de laatste 30 dagen.
          </p>
        </div>

        {agents.length > 0 && (
          <button
            type="button"
            onClick={() => downloadRapport(agents)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 text-[12.5px] font-semibold text-ink/85 transition-colors hover:border-violet/45 hover:bg-violet/10 hover:text-ink"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Rapport downloaden
          </button>
        )}
      </div>

      {agents.length > 0 && (
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <Kerncijfer waarde={String(totaal)} label="acties in 30 dagen" nadruk />
          <Kerncijfer
            waarde={`${live.length}/${agents.length}`}
            label={live.length === 1 ? "agent live" : "agents live"}
          />
          <Kerncijfer
            waarde={gemiddeldeScore != null ? `${gemiddeldeScore}%` : "—"}
            label="gemiddelde prestatiescore"
          />
        </div>
      )}

      {agentsQuery.isLoading && (
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-[228px] animate-pulse rounded-3xl bg-white/[0.04]" />
          ))}
        </div>
      )}

      {agentsQuery.error && (
        <p className="mt-7 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-[13px] text-ink/80">
          Je agents konden niet worden geladen. Ververs de pagina, of mail{" "}
          <a href={`mailto:${SITE.email}`} className="underline underline-offset-2">
            {SITE.email}
          </a>{" "}
          als dit blijft gebeuren.
        </p>
      )}

      {!agentsQuery.isLoading && !agentsQuery.error && agents.length === 0 && (
        <div className="card-glass-lg mt-7 rounded-3xl p-8 text-center sm:p-12">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet/15 text-violet">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-4 font-display text-[18px] font-semibold text-brand">
            Er staat nog geen agent klaar
          </p>
          <p className="mx-auto mt-2 max-w-[46ch] text-[13px]/[1.7] text-ink/60">
            Zodra je eerste agent is ingericht, zie je hier wat hij doet: hoeveel gesprekken hij
            voert, hoe hij presteert, en welke aanvragen hij oplevert.
          </p>
          <a
            href={`mailto:${SITE.email}`}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-violet px-6 text-[13.5px] font-semibold text-white transition-colors hover:bg-violet/85"
          >
            Neem contact op
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {agents.map((a, i) => {
          const st = STATUS_META[a.status] ?? STATUS_META["setup"]!;
          const reeks = (a.series ?? []).map((s: any) => ({ v: s.output_count ?? 0 }));
          return (
            <Link
              key={a.id}
              to="/agents/$agentId"
              params={{ agentId: a.id }}
              className="card-glass-lg group animate-rise flex flex-col rounded-3xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet/35"
              style={{ animationDelay: `${60 + i * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-[15.5px] leading-tight font-semibold text-brand">
                    {a.name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[12.5px]/[1.55] text-ink/60">
                    {a.description}
                  </p>
                </div>
                <span
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${st.chip}`}
                >
                  <span className={`size-1.5 rounded-full ${st.dot}`} />
                  {st.label}
                </span>
              </div>

              <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                  <p className="font-display text-[28px] leading-none font-bold text-brand tabular-nums">
                    {a.total30}
                  </p>
                  <p className="mt-1.5 text-[11px] text-ink/50">{a.metric_label} · 30 dagen</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-[19px] leading-none font-semibold text-violet tabular-nums">
                    {a.score30 != null ? `${Number(a.score30).toFixed(0)}%` : "—"}
                  </p>
                  <p className="mt-1.5 text-[11px] text-ink/50">{a.score_label}</p>
                </div>
              </div>

              <div className="mt-3 h-14">
                {reeks.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reeks} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id={`g-${a.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="oklch(0.68 0.19 296)" stopOpacity={0.55} />
                          <stop offset="100%" stopColor="oklch(0.68 0.19 296)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke="oklch(0.68 0.19 296)"
                        strokeWidth={2}
                        fill={`url(#g-${a.id})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="pt-4 text-[11px] text-ink/40">
                    Nog te weinig metingen voor een grafiek
                  </p>
                )}
              </div>

              <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-ink/50 transition-colors group-hover:text-violet">
                Bekijk details
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          );
        })}
      </div>
    </DashboardShell>
  );
}

function Kerncijfer({
  waarde,
  label,
  nadruk = false,
}: {
  waarde: string;
  label: string;
  nadruk?: boolean;
}) {
  return (
    <div
      className={`card-glass rounded-2xl px-5 py-4 ${nadruk ? "border-violet/30 bg-violet/[0.07]" : ""}`}
    >
      <p
        className={`font-display text-[26px] leading-none font-bold tabular-nums ${
          nadruk ? "text-violet" : "text-brand"
        }`}
      >
        {waarde}
      </p>
      <p className="mt-1.5 text-[11.5px] text-ink/55">{label}</p>
    </div>
  );
}
