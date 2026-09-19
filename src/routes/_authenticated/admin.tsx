import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { DashboardShell, STATUS_META } from "@/components/dashboard-shell";
import { AgentAannames } from "@/components/agent-aannames";
import { LEGE_AANNAMES, alsGetal, alsTekst, type Aannamewaarden } from "@/lib/agent-aannames";
import { soortVan } from "@/lib/agent-soorten";
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
  "w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-[13px] text-brand outline-none placeholder:text-ink/35 focus:border-violet/55";
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

  /**
   * Voert een actie uit en meldt de uitkomst bovenaan de pagina. Geeft die
   * uitkomst ook terug, want de melding bovenaan is onzichtbaar voor wie
   * verderop in de lijst met een agent bezig is.
   */
  async function run(fn: () => Promise<unknown>, okMsg: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg(okMsg);
      await refresh();
      return { ok: true as const, melding: okMsg };
    } catch (err) {
      const melding = err instanceof Error ? err.message : "Er ging iets mis";
      setMsg(melding);
      return { ok: false as const, melding };
    } finally {
      setBusy(false);
    }
  }

  if (meQuery.data && !meQuery.data.isAdmin) {
    return (
      <DashboardShell isAdmin={false} userName={meQuery.data.name}>
        <p className="text-[13px] text-ink/60">
          Je hebt geen toegang tot deze pagina.{" "}
          <Link to="/dashboard" className="text-violet">
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
      {msg && <p className="mt-3 text-[12px] font-medium text-violet">{msg}</p>}

      <AgentOverzicht clients={clients} laden={clientsQuery.isLoading} />

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
              const res = (await createClientFn({ data: nc })) as
                { ok: true; id?: string } | { ok: false; error: string };
              if (!res.ok) throw new Error(res.error);
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
            onSaveStat={(payload) =>
              run(() => saveStatFn({ data: payload }), "Statistiek opgeslagen")
            }
          />
        ))}
        {clientsQuery.isLoading && <p className="text-[13px] text-ink/55">Laden…</p>}
      </div>
    </DashboardShell>
  );
}

type OverzichtAgent = {
  id: string;
  name: string;
  kind?: string | null;
  status: string;
  fair_use_per_month?: number | null;
  laatste_activiteit: string | null;
  verbruik_maand: number;
};

/**
 * Alle agents van alle klanten op één plek: draait hij, wanneer deed hij voor
 * het laatst iets, en hoe staat het verbruik ervoor tegenover de fair use.
 *
 * Bewust alleen aantallen. De inhoud (contacten, berichten, kennisbank) is van
 * de klant en is voor een beheerder niet te zien.
 */
function AgentOverzicht({
  clients,
  laden,
}: {
  clients: Array<{ name?: string | null; email?: string | null; agents?: OverzichtAgent[] }>;
  laden: boolean;
}) {
  const rijen = clients.flatMap((c) =>
    (c.agents ?? []).map((a) => ({ klant: c.name || c.email || "", agent: a })),
  );
  const telling = (st: string) => rijen.filter((r) => r.agent.status === st).length;

  return (
    <section className="card-glass-lg mt-5 rounded-3xl p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-[15px] font-semibold text-brand">Agents</p>
        <p className="text-[12px] text-ink/50">
          {telling("live")} live · {telling("paused")} gepauzeerd · {telling("setup")} in opbouw
        </p>
      </div>

      {laden && <p className="mt-3 text-[13px] text-ink/55">Laden…</p>}
      {!laden && rijen.length === 0 && (
        <p className="mt-3 text-[13px] text-ink/55">Nog geen agents.</p>
      )}

      <div className="mt-3 space-y-2">
        {rijen.map(({ klant, agent: a }) => {
          const st = STATUS_META[a.status] ?? STATUS_META["setup"]!;
          const stil =
            a.status === "live" &&
            (!a.laatste_activiteit ||
              Date.now() - new Date(a.laatste_activiteit).getTime() > 24 * 3600 * 1000);
          const grens = a.fair_use_per_month ?? null;
          const aandeel = grens ? a.verbruik_maand / grens : null;
          return (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 rounded-2xl border border-white/12 bg-white/5 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-brand">{a.name}</p>
                <p className="text-[11.5px] text-ink/55">
                  {klant} · {soortVan(a.kind).label}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink/60">
                <span className={stil ? "text-amber-300" : undefined}>
                  {a.laatste_activiteit
                    ? `actief ${sinds(a.laatste_activiteit)}`
                    : "nog nooit actief"}
                  {stil ? " · stil" : ""}
                </span>
                <span className={aandeel != null && aandeel >= 0.8 ? "text-amber-300" : undefined}>
                  {a.verbruik_maand.toLocaleString("nl-NL")}
                  {grens ? ` / ${grens.toLocaleString("nl-NL")}` : ""} deze maand
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.chip}`}>
                  {st.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** "3 min geleden", "5 uur geleden", "2 dagen geleden". Per uur geteld, dus grof. */
function sinds(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return "dit uur";
  const uur = Math.round(min / 60);
  if (uur < 24) return `${uur} uur geleden`;
  const dagen = Math.round(uur / 24);
  return dagen === 1 ? "gisteren" : `${dagen} dagen geleden`;
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
          <div key={l.id} className="rounded-2xl border border-white/12 bg-white/5 p-4">
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
              <a href={`mailto:${l.email}`} className="text-violet">
                {l.email}
              </a>
              {l.phone ? (
                <>
                  {" · "}
                  <a href={`tel:${l.phone.replace(/\s/g, "")}`} className="text-violet">
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
  onSaveAgent: (p: Record<string, unknown>) => Promise<{ ok: boolean; melding: string }>;
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
        <summary className="cursor-pointer text-[12px] font-medium text-violet">
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
  onSaveAgent: (p: Record<string, unknown>) => Promise<{ ok: boolean; melding: string }>;
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
    <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-brand">{agent.name}</p>
          <p className="text-[11px] text-ink/50">{agent.description}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.chip}`}>
          {st.label}
        </span>
      </div>

      <AannamesBlok agent={agent} busy={busy} onSaveAgent={onSaveAgent} />

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
        {/* Een agent verwijderen neemt zijn kennisbank, zijn verbruik en zijn
            hele geschiedenis mee: die hangen er met ON DELETE CASCADE aan. Dat
            is niet terug te draaien, en het is precies wat er is gebeurd met de
            website-assistent — één klik zonder tussenstap.
            
            Daarom staat de naam nu in de vraag: je moet lezen wát je weggooit
            voordat je ja zegt. */}
        <button
          className="rounded-full border border-destructive/40 px-4 py-2 text-[12px] font-semibold text-destructive"
          disabled={busy}
          onClick={() => {
            const zeker = window.confirm(
              `"${agent.name}" definitief verwijderen?\n\n` +
                "Hiermee verdwijnt ook zijn hele kennisbank, zijn verbruiksgeschiedenis " +
                "en alles wat eraan hangt. Dit kan niet ongedaan worden gemaakt.\n\n" +
                "Wil je hem alleen tijdelijk uitzetten, kies dan Gepauzeerd bij de status.",
            );
            if (zeker) onDeleteAgent(agent.id);
          }}
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

/**
 * De afspraken met de klant, uitklapbaar zodat de agentlijst overzichtelijk
 * blijft. Wat hier staat bepaalt wat er op het dashboard van de klant komt.
 */
type AgentRij = {
  id: string;
  client_id: string;
  name: string;
  description: string;
  metric_label: string;
  score_label: string;
  status: string;
  kind?: string | null;
  minutes_saved_per_action?: number | null;
  minutes_saved_basis?: string | null;
  hourly_rate?: number | null;
  hourly_rate_basis?: string | null;
  fair_use_per_month?: number | null;
  overage_price?: number | null;
  inbound_local?: string | null;
  slug?: string | null;
};

function AannamesBlok({
  agent,
  busy,
  onSaveAgent,
}: {
  agent: AgentRij;
  busy: boolean;
  onSaveAgent: (payload: Record<string, unknown>) => Promise<{ ok: boolean; melding: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [waarden, setWaarden] = useState<Aannamewaarden>({
    ...LEGE_AANNAMES,
    kind: (agent.kind ?? "overig") as Aannamewaarden["kind"],
    minutesSavedPerAction: agent.minutes_saved_per_action?.toString() ?? "",
    minutesSavedBasis: agent.minutes_saved_basis ?? "",
    hourlyRate: agent.hourly_rate?.toString() ?? "",
    hourlyRateBasis: agent.hourly_rate_basis ?? "",
    fairUsePerMonth: agent.fair_use_per_month?.toString() ?? "",
    overagePrice: agent.overage_price?.toString() ?? "1",
    inboundLocal: agent.inbound_local ?? "",
    slug: agent.slug ?? "",
  });

  const ingevuld = agent.minutes_saved_per_action != null || agent.hourly_rate != null;
  const [uitkomst, setUitkomst] = useState<{ ok: boolean; melding: string } | null>(null);

  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-[12.5px] font-semibold text-ink/80">
          Afspraken over tijd en tarief
        </span>
        <span className={`text-[11px] ${ingevuld ? "text-mint" : "text-amber-300"}`}>
          {ingevuld ? "ingevuld" : "nog niet afgesproken"} · {open ? "verbergen" : "tonen"}
        </span>
      </button>

      {open && (
        <div className="mt-4">
          <AgentAannames waarden={waarden} onWijzig={setWaarden} />

          <button
            className={`${btnCls} mt-4`}
            disabled={busy}
            onClick={async () => {
              setUitkomst(null);
              setUitkomst(
                await onSaveAgent({
                  id: agent.id,
                  clientId: agent.client_id,
                  name: agent.name,
                  description: agent.description,
                  metricLabel: agent.metric_label,
                  scoreLabel: agent.score_label,
                  status: agent.status,
                  kind: waarden.kind,
                  minutesSavedPerAction: alsGetal(waarden.minutesSavedPerAction),
                  minutesSavedBasis: alsTekst(waarden.minutesSavedBasis),
                  hourlyRate: alsGetal(waarden.hourlyRate),
                  hourlyRateBasis: alsTekst(waarden.hourlyRateBasis),
                  fairUsePerMonth: alsGetal(waarden.fairUsePerMonth),
                  overagePrice: alsGetal(waarden.overagePrice) ?? 1,
                  inboundLocal: alsTekst(waarden.inboundLocal),
                  slug: alsTekst(waarden.slug),
                }),
              );
            }}
          >
            {busy ? "Bezig\u2026" : "Afspraken opslaan"}
          </button>

          {uitkomst && (
            <p
              role="status"
              className={`mt-3 rounded-xl border px-3.5 py-2.5 text-[12.5px] ${
                uitkomst.ok
                  ? "border-mint/30 bg-mint/10 text-ink/85"
                  : "border-warn/30 bg-warn/10 text-ink/85"
              }`}
            >
              {uitkomst.melding}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
