import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { DashboardShell, STATUS_META } from "@/components/dashboard-shell";
import {
  getMe,
  adminListClients,
  adminCreateClient,
  adminSaveAgent,
  adminDeleteAgent,
  adminSaveStat,
} from "@/lib/dashboard.functions";
import { listLeadRequests } from "@/lib/leads.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Beheer — Zakelijke AI Agents klantportaal" },
      { name: "description", content: "Beheer klanten, agents en statistieken." },
      { property: "og:title", content: "Beheer — Zakelijke AI Agents klantportaal" },
      { property: "og:description", content: "Beheer klanten, agents en statistieken." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPanel,
});

const inputCls =
  "w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-[13px] text-brand outline-none placeholder:text-ink/35 focus:border-indigo";
const btnCls =
  "rounded-full bg-brand px-4 py-2 text-[12px] font-semibold text-primary-foreground disabled:opacity-50";

function AdminPanel() {
  const qc = useQueryClient();
  const meFn = useServerFn(getMe);
  const listFn = useServerFn(adminListClients);
  const createClientFn = useServerFn(adminCreateClient);
  const saveAgentFn = useServerFn(adminSaveAgent);
  const deleteAgentFn = useServerFn(adminDeleteAgent);
  const saveStatFn = useServerFn(adminSaveStat);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const clientsQuery = useQuery({
    queryKey: ["admin-clients"],
    queryFn: () => listFn(),
    enabled: meQuery.data?.isAdmin === true,
  });

  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nc, setNc] = useState({ name: "", email: "", password: "" });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-clients"] });

  async function run(fn: () => Promise<unknown>, okMsg: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg(okMsg);
      await refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setBusy(false);
    }
  }

  if (meQuery.data && !meQuery.data.isAdmin) {
    return (
      <DashboardShell isAdmin={false} userName={meQuery.data.name}>
        <p className="text-[13px] text-ink/60">
          Je hebt geen toegang tot deze pagina.{" "}
          <Link to="/dashboard" className="text-indigo">
            Terug naar dashboard
          </Link>
        </p>
      </DashboardShell>
    );
  }

  const clients = clientsQuery.data ?? [];

  return (
    <DashboardShell isAdmin userName={meQuery.data?.name ?? ""}>
      <h1 className="font-display text-[24px] font-bold tracking-tight text-brand">Beheer</h1>
      <p className="mt-1.5 text-[13px] text-ink/55">Klanten, agents en statistieken.</p>
      {msg && <p className="mt-3 text-[12px] font-medium text-indigo">{msg}</p>}

      <section className="card-glass-lg mt-5 rounded-3xl p-5">
        <p className="font-display text-[15px] font-semibold text-brand">Nieuwe klant</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input
            className={inputCls}
            placeholder="Naam"
            value={nc.name}
            onChange={(e) => setNc({ ...nc, name: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="E-mail"
            value={nc.email}
            onChange={(e) => setNc({ ...nc, email: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="Wachtwoord (min. 8)"
            value={nc.password}
            onChange={(e) => setNc({ ...nc, password: e.target.value })}
          />
        </div>
        <button
          className={`${btnCls} mt-3`}
          disabled={busy || !nc.name || !nc.email || nc.password.length < 8}
          onClick={() =>
            run(async () => {
              await createClientFn({ data: nc });
              setNc({ name: "", email: "", password: "" });
            }, "Klant aangemaakt")
          }
        >
          Klant aanmaken
        </button>
      </section>

      <LeadRequests enabled={meQuery.data?.isAdmin === true} />

      <div className="mt-4 space-y-4">
        {clients.map((c: any) => (
          <ClientBlock
            key={c.id}
            client={c}
            busy={busy}
            onSaveAgent={(payload) => run(() => saveAgentFn({ data: payload }), "Agent opgeslagen")}
            onDeleteAgent={(id) => run(() => deleteAgentFn({ data: { id } }), "Agent verwijderd")}
            onSaveStat={(payload) => run(() => saveStatFn({ data: payload }), "Statistiek opgeslagen")}
          />
        ))}
        {clientsQuery.isLoading && <p className="text-[13px] text-ink/55">Laden…</p>}
      </div>
    </DashboardShell>
  );
}

function LeadRequests({ enabled }: { enabled: boolean }) {
  const listFn = useServerFn(listLeadRequests);
  const { data, isLoading } = useQuery({
    queryKey: ["lead-requests"],
    queryFn: () => listFn(),
    enabled,
  });
  const leads = data ?? [];

  return (
    <section className="card-glass-lg mt-4 rounded-3xl p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-[15px] font-semibold text-brand">Aanvragen</p>
        <p className="text-[12px] text-ink/50">{leads.length} totaal</p>
      </div>

      {isLoading && <p className="mt-3 text-[13px] text-ink/55">Laden…</p>}
      {!isLoading && leads.length === 0 && (
        <p className="mt-3 text-[13px] text-ink/55">Nog geen aanvragen binnengekomen.</p>
      )}

      <div className="mt-3 space-y-2">
        {leads.map((l) => (
          <div key={l.id} className="rounded-2xl border border-white/60 bg-white/50 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13px] font-semibold text-brand">
                {l.name} — {l.company}
              </p>
              <p className="text-[11px] text-ink/50">
                {new Date(l.created_at).toLocaleString("nl-NL", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <p className="mt-1 text-[12px] text-ink/60">
              <a href={`mailto:${l.email}`} className="text-indigo">
                {l.email}
              </a>
              {l.phone ? (
                <>
                  {" · "}
                  <a href={`tel:${l.phone.replace(/\s/g, "")}`} className="text-indigo">
                    {l.phone}
                  </a>
                </>
              ) : null}
              {l.stage ? ` · ${l.stage}` : ""}
            </p>
            {l.message && (
              <p className="mt-2 whitespace-pre-line text-[12px] text-ink/70">{l.message}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ClientBlock({
  client,
  busy,
  onSaveAgent,
  onDeleteAgent,
  onSaveStat,
}: {
  client: any;
  busy: boolean;
  onSaveAgent: (p: any) => void;
  onDeleteAgent: (id: string) => void;
  onSaveStat: (p: any) => void;
}) {
  const [newAgent, setNewAgent] = useState({
    name: "",
    description: "",
    metricLabel: "leads gekwalificeerd",
    scoreLabel: "nauwkeurigheid",
    status: "setup" as "live" | "paused" | "setup",
  });

  return (
    <section className="card-glass-lg rounded-3xl p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-[15px] font-semibold text-brand">
          {client.name || "(geen naam)"}
        </p>
        <p className="text-[12px] text-ink/50">{client.email}</p>
      </div>

      <div className="mt-3 space-y-3">
        {client.agents.map((a: any) => (
          <AgentRow
            key={a.id}
            agent={a}
            busy={busy}
            onSaveAgent={onSaveAgent}
            onDeleteAgent={onDeleteAgent}
            onSaveStat={onSaveStat}
          />
        ))}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-[12px] font-medium text-indigo">
          + Agent toevoegen
        </summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input
            className={inputCls}
            placeholder="Naam (bijv. Lead Qualification Assistant)"
            value={newAgent.name}
            onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="Korte omschrijving"
            value={newAgent.description}
            onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="Label output (bijv. leads gekwalificeerd)"
            value={newAgent.metricLabel}
            onChange={(e) => setNewAgent({ ...newAgent, metricLabel: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="Label score (bijv. nauwkeurigheid)"
            value={newAgent.scoreLabel}
            onChange={(e) => setNewAgent({ ...newAgent, scoreLabel: e.target.value })}
          />
          <select
            className={inputCls}
            value={newAgent.status}
            onChange={(e) => setNewAgent({ ...newAgent, status: e.target.value as any })}
          >
            <option value="live">Live</option>
            <option value="paused">Gepauzeerd</option>
            <option value="setup">In opbouw</option>
          </select>
          <button
            className={btnCls}
            disabled={busy || !newAgent.name}
            onClick={() => {
              onSaveAgent({ ...newAgent, clientId: client.id });
              setNewAgent({ ...newAgent, name: "", description: "" });
            }}
          >
            Opslaan
          </button>
        </div>
      </details>
    </section>
  );
}

function AgentRow({
  agent,
  busy,
  onSaveAgent,
  onDeleteAgent,
  onSaveStat,
}: {
  agent: any;
  busy: boolean;
  onSaveAgent: (p: any) => void;
  onDeleteAgent: (id: string) => void;
  onSaveStat: (p: any) => void;
}) {
  const [status, setStatus] = useState<string>(agent.status);
  const [stat, setStat] = useState({
    date: new Date().toISOString().slice(0, 10),
    outputCount: "0",
    performanceScore: "",
    notes: "",
  });
  const st = STATUS_META[agent.status] ?? STATUS_META["setup"]!;

  return (
    <div className="rounded-2xl border border-white/60 bg-white/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-brand">{agent.name}</p>
          <p className="text-[11px] text-ink/50">{agent.description}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.chip}`}>
          {st.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          className={`${inputCls} max-w-[170px]`}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="live">Live</option>
          <option value="paused">Gepauzeerd</option>
          <option value="setup">In opbouw</option>
        </select>
        <button
          className={btnCls}
          disabled={busy}
          onClick={() =>
            onSaveAgent({
              id: agent.id,
              clientId: agent.client_id,
              name: agent.name,
              description: agent.description,
              metricLabel: agent.metric_label,
              scoreLabel: agent.score_label,
              status,
            })
          }
        >
          Status opslaan
        </button>
        <button
          className="rounded-full border border-destructive/40 px-4 py-2 text-[12px] font-semibold text-destructive"
          disabled={busy}
          onClick={() => onDeleteAgent(agent.id)}
        >
          Verwijderen
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-5">
        <input
          type="date"
          className={inputCls}
          value={stat.date}
          onChange={(e) => setStat({ ...stat, date: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="Output"
          value={stat.outputCount}
          onChange={(e) => setStat({ ...stat, outputCount: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="Score %"
          value={stat.performanceScore}
          onChange={(e) => setStat({ ...stat, performanceScore: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="Notitie"
          value={stat.notes}
          onChange={(e) => setStat({ ...stat, notes: e.target.value })}
        />
        <button
          className={btnCls}
          disabled={busy}
          onClick={() =>
            onSaveStat({
              agentId: agent.id,
              date: stat.date,
              outputCount: Number(stat.outputCount) || 0,
              performanceScore: stat.performanceScore === "" ? null : Number(stat.performanceScore),
              notes: stat.notes === "" ? null : stat.notes,
            })
          }
        >
          Stat opslaan
        </button>
      </div>
    </div>
  );
}
