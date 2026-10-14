import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { MessageSquare, Trash2, UserPlus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { useMeekijken } from "@/hooks/use-meekijken";
import { getMe, listAgents } from "@/lib/dashboard.functions";
import {
  haalGesprek,
  haalGesprekken,
  verwijderGesprek,
  type GesprekRegel,
} from "@/lib/gesprekken.functions";

export const Route = createFileRoute("/_authenticated/gesprekken")({
  head: () => ({
    meta: [
      { title: "Gesprekken — Zakelijke AI Agents klantportaal" },
      { name: "description", content: "Teruglezen wat je chat-assistent met bezoekers besprak." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GesprekkenPagina,
});

const veld =
  "w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-[13px] text-ink outline-none focus:border-violet/55";

const wanneer = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function GesprekkenPagina() {
  const qc = useQueryClient();
  const meFn = useServerFn(getMe);
  const agentsFn = useServerFn(listAgents);
  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: () => agentsFn() });

  // Meekijken toont hier niets. Dat is geen storing maar de afspraak: de
  // inhoud van een gesprek is van de klant, net als zijn kennisbank.
  const meekijken = useMeekijken();
  const meekijkt = !!meekijken.data;

  const agents = (
    (agentsQuery.data ?? []) as Array<{ id: string; name: string; kind: string }>
  ).filter((a) => a.kind === "chat_assistent");
  const [gekozen, setGekozen] = useState<string | null>(null);
  const agentId = gekozen ?? agents[0]?.id ?? null;

  const lijstFn = useServerFn(haalGesprekken);
  const lijst = useQuery({
    queryKey: ["gesprekken", agentId],
    queryFn: () => lijstFn({ data: { agentId: agentId! } }),
    enabled: agentId !== null && !meekijkt,
  });

  const [open, setOpen] = useState<string | null>(null);
  const detailFn = useServerFn(haalGesprek);
  const detail = useQuery({
    queryKey: ["gesprek", open],
    queryFn: () => detailFn({ data: { id: open! } }),
    enabled: open !== null,
  });

  const wisFn = useServerFn(verwijderGesprek);
  const [bezig, setBezig] = useState(false);
  async function wis(id: string) {
    if (!agentId) return;
    if (!window.confirm("Dit gesprek verwijderen? Dat kan niet ongedaan gemaakt worden.")) return;
    setBezig(true);
    try {
      await wisFn({ data: { id, agentId } });
      if (open === id) setOpen(null);
      await qc.invalidateQueries({ queryKey: ["gesprekken", agentId] });
    } finally {
      setBezig(false);
    }
  }

  const gesprekken = lijst.data?.gesprekken ?? [];

  return (
    <DashboardShell isAdmin={meQuery.data?.isAdmin === true} userName={meQuery.data?.name}>
      <div className="grid gap-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[22px] font-bold text-brand">Gesprekken</h1>
            <p className="mt-1.5 max-w-[70ch] text-[13px]/[1.7] text-ink/60">
              Wat je assistent met bezoekers besprak. Handig om te zien welke vragen steeds
              terugkomen — wat je daar leest, hoort vaak in je{" "}
              <Link to="/knowledge" className="text-violet underline-offset-2 hover:underline">
                kennisbank
              </Link>
              .
            </p>
          </div>
          {agents.length > 1 && (
            <select
              className={`${veld} max-w-[240px]`}
              value={agentId ?? ""}
              onChange={(e) => {
                setGekozen(e.target.value);
                setOpen(null);
              }}
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id} className="bg-[#12121a]">
                  {a.name}
                </option>
              ))}
            </select>
          )}
        </header>

        {meekijkt && (
          <div className="card-glass-lg rounded-3xl p-6 text-[13px]/[1.7] text-ink/60">
            Tijdens meekijken laten we geen gesprekken zien. De inhoud is van de klant; wij komen
            er niet bij, ook niet vanaf hier.
          </div>
        )}

        {!meekijkt && !agentsQuery.isLoading && agents.length === 0 && (
          <div className="card-glass-lg rounded-3xl p-6 text-[13px] text-ink/60">
            Je hebt nog geen chat-assistent.
          </div>
        )}

        {!meekijkt && lijst.data && !lijst.data.bewaren && (
          <div className="card-glass-lg rounded-3xl p-6 text-[13px]/[1.7] text-ink/60">
            Gesprekken bewaren staat uit voor deze agent, dus er is niets terug te lezen. Je kunt
            het aanzetten bij de instellingen van de agent.
          </div>
        )}

        {!meekijkt && lijst.data?.bewaren && (
          <section className="card-glass-lg rounded-3xl p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-[15px] font-semibold text-brand">
                {gesprekken.length === 0
                  ? "Nog geen gesprekken"
                  : `${gesprekken.length} ${gesprekken.length === 1 ? "gesprek" : "gesprekken"}`}
              </p>
              <p className="text-[12px] text-ink/50">
                Blijven {lijst.data.bewaartermijn} dagen staan, daarna verdwijnen ze vanzelf
              </p>
            </div>

            {gesprekken.length === 0 && (
              <p className="mt-3 text-[13px]/[1.7] text-ink/55">
                Zodra een bezoeker iets vraagt, staat het hier.
              </p>
            )}

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
              {gesprekken.length > 0 && (
                <ul className="grid max-h-[560px] gap-1.5 overflow-y-auto pr-1">
                  {gesprekken.map((g) => (
                    <Regel
                      key={g.id}
                      gesprek={g}
                      actief={open === g.id}
                      onKies={() => setOpen(open === g.id ? null : g.id)}
                    />
                  ))}
                </ul>
              )}

              {open && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink/50">
                      Het gesprek
                    </p>
                    <button
                      type="button"
                      disabled={bezig}
                      onClick={() => wis(open)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[12px] font-medium text-ink/70 transition hover:border-warn/40 hover:text-ink disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                      Verwijderen
                    </button>
                  </div>
                  {detail.isLoading && <p className="text-[13px] text-ink/55">Laden…</p>}
                  <div className="grid gap-2.5">
                    {(detail.data ?? []).map((b) => (
                      <div
                        key={b.id}
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px]/[1.65] ${
                          b.rol === "bezoeker"
                            ? "bg-white/[0.06] text-ink/85"
                            : "ml-auto bg-violet/15 text-ink"
                        }`}
                      >
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/40">
                          {b.rol === "bezoeker" ? "Bezoeker" : "Assistent"}
                        </p>
                        {b.tekst}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}

function Regel({
  gesprek,
  actief,
  onKies,
}: {
  gesprek: GesprekRegel;
  actief: boolean;
  onKies: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onKies}
        className={`w-full rounded-2xl border px-3.5 py-3 text-left transition ${
          actief
            ? "border-violet/45 bg-violet/10"
            : "border-white/10 bg-white/[0.02] hover:border-white/20"
        }`}
      >
        <p className="line-clamp-2 text-[13px]/[1.5] text-ink/85">
          {gesprek.opening || "Gesprek zonder vraag"}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink/45">
          <span>{wanneer(gesprek.laatste_op)}</span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3" />
            {gesprek.beurten}
          </span>
          {gesprek.pagina && <span className="truncate">{gesprek.pagina}</span>}
          {gesprek.lead_vastgelegd && (
            <span className="inline-flex items-center gap-1 rounded-full border border-mint/30 bg-mint/12 px-2 py-0.5 text-mint">
              <UserPlus className="size-3" />
              lead
            </span>
          )}
        </p>
      </button>
    </li>
  );
}
