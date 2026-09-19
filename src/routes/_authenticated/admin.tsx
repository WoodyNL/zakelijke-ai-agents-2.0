import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  adminListMedewerkers,
  adminNodigMedewerkerUit,
  adminCreateClient,
  adminSaveAgent,
  adminDeleteAgent,
  adminDeleteClient,
  adminSaveStat,
} from "@/lib/dashboard.functions";
import { listLeadRequests, verwijderAanvraag } from "@/lib/leads.functions";
import { startMeekijken } from "@/lib/meekijken.functions";

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
    enabled: meQuery.data?.isStaf === true,
  });
  // Support ziet hetzelfde overzicht en mag meekijken, maar wijzigt niets.
  const isAdmin = meQuery.data?.isAdmin === true;

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

  if (meQuery.data && !meQuery.data.isStaf) {
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
    <DashboardShell isAdmin={isAdmin} userName={meQuery.data?.name ?? ""}>
      <h1 className="font-display text-[24px] font-bold tracking-tight text-brand">Beheer</h1>
      <p className="mt-1.5 text-[13px] text-ink/55">
        {isAdmin
          ? "Klanten, agents en statistieken."
          : "Welke agents er draaien. Als support kun je meekijken, maar niets wijzigen."}
      </p>
      {msg && <p className="mt-3 text-[12px] font-medium text-violet">{msg}</p>}

      <AgentOverzicht clients={clients} laden={clientsQuery.isLoading} />

      {isAdmin && (
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
      )}

      {isAdmin && <LeadRequests enabled />}

      <div className="mt-4 space-y-4">
        {clients.map((c: any) => (
          <ClientBlock
            key={c.id}
            client={c}
            busy={busy}
            magWijzigen={isAdmin}
            onSaveAgent={(payload) => run(() => saveAgentFn({ data: payload }), "Agent opgeslagen")}
            onDeleteAgent={(id) => run(() => deleteAgentFn({ data: { id } }), "Agent verwijderd")}
            onSaveStat={(payload) =>
              run(() => saveStatFn({ data: payload }), "Statistiek opgeslagen")
            }
          />
        ))}
        {clientsQuery.isLoading && <p className="text-[13px] text-ink/55">Laden…</p>}
      </div>

      <Medewerkers magUitnodigen={isAdmin} />
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
  clients: Array<{
    name?: string | null;
    email?: string | null;
    eigen?: boolean;
    agents?: OverzichtAgent[];
  }>;
  laden: boolean;
}) {
  const rijen = clients.flatMap((c) =>
    (c.agents ?? []).map((a) => ({
      klant: c.eigen ? "Zakelijke AI Agents" : c.name || c.email || "",
      agent: a,
    })),
  );
  const telling = (st: string) => rijen.filter((r) => r.agent.status === st).length;

  // Wat aandacht nodig heeft, bovenaan en in woorden: een live agent die een
  // dag niets deed, en een agent die op 80% van zijn fair use zit.
  const aandacht = rijen.flatMap(({ klant, agent: a }) => {
    const punten: string[] = [];
    if (
      a.status === "live" &&
      (!a.laatste_activiteit ||
        Date.now() - new Date(a.laatste_activiteit).getTime() > 24 * 3600 * 1000)
    ) {
      punten.push(
        a.laatste_activiteit
          ? `${a.name} (${klant}) staat live, maar was voor het laatst actief ${sinds(a.laatste_activiteit)}`
          : `${a.name} (${klant}) staat live, maar is nog nooit actief geweest`,
      );
    }
    const grens = a.fair_use_per_month ?? null;
    if (grens && a.verbruik_maand >= grens * 0.8) {
      punten.push(
        `${a.name} (${klant}) zit op ${Math.round((a.verbruik_maand / grens) * 100)}% van de fair use`,
      );
    }
    return punten;
  });

  return (
    <section className="card-glass-lg mt-5 rounded-3xl p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-[15px] font-semibold text-brand">Agents</p>
        <p className="text-[12px] text-ink/50">
          {telling("live")} live · {telling("paused")} gepauzeerd · {telling("setup")} in opbouw
        </p>
      </div>

      {aandacht.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-[12.5px] text-amber-100">
          {aandacht.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

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

/**
 * Meekijken bij een klant, voor als er iets mis is. Een reden is verplicht: die
 * komt in de toegangslog die de klant in zijn portaal ziet. Daarna opent het
 * portaal van de klant, alleen lezen, en zonder kennisbank.
 */
function MeekijkKnop({ clientId, naam }: { clientId: string; naam: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const startFn = useServerFn(startMeekijken);
  const [open, setOpen] = useState(false);
  const [reden, setReden] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function start() {
    setBezig(true);
    setFout(null);
    try {
      await startFn({ data: { clientId, reden } });
      await qc.invalidateQueries();
      navigate({ to: "/dashboard" });
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Meekijken lukte niet");
      setBezig(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-[12px] font-medium text-violet hover:underline"
      >
        Meekijken bij {naam}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-3">
      <label className="block text-[12px] font-medium text-ink/75">
        Waarom kijk je mee? {naam} ziet deze reden in zijn toegangslog.
        <input
          className={`${inputCls} mt-1.5`}
          placeholder="Bijv. Frank meldt dat de campagne niet verstuurt"
          value={reden}
          onChange={(e) => setReden(e.target.value)}
          maxLength={500}
        />
      </label>
      <p className="mt-1.5 text-[11.5px] text-ink/50">
        Een uur lang, alleen lezen, zonder kennisbank. Elk scherm dat je opent wordt vastgelegd.
      </p>
      {fout && <p className="mt-1.5 text-[12px] text-destructive">{fout}</p>}
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          className={btnCls}
          disabled={bezig || reden.trim().length < 10}
          onClick={start}
        >
          {bezig ? "Bezig\u2026" : "Start meekijken"}
        </button>
        <button
          type="button"
          className="rounded-full border border-white/12 px-4 py-2 text-[12px] font-semibold text-ink/70"
          onClick={() => setOpen(false)}
        >
          Annuleren
        </button>
      </div>
    </div>
  );
}

/**
 * Een klant definitief verwijderen. Het zwaarste wat hier kan, dus drie
 * drempels: eerst uitklappen en lezen wat er verdwijnt, dan het e-mailadres
 * van de klant letterlijk intypen, en dan nog een laatste vraag. De server
 * controleert het e-mailadres opnieuw en weigert zolang er een agent live
 * staat.
 */
function VerwijderKlant({
  client,
}: {
  client: { id: string; name?: string | null; email: string; teamleden?: number; agents: any[] };
}) {
  const qc = useQueryClient();
  const fn = useServerFn(adminDeleteClient);
  const [open, setOpen] = useState(false);
  const [getypt, setGetypt] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const naam = client.name || client.email;
  const live = client.agents.filter((a) => a.status === "live");
  const klopt = getypt.trim().toLowerCase() === client.email.trim().toLowerCase();

  async function verwijder() {
    if (!klopt) return;
    const zeker = window.confirm(
      `Laatste vraag: "${naam}" definitief verwijderen?\n\nHet account, ${client.agents.length} agent(s) met hun kennisbank, contacten, berichten, supportmail en verbruik${
        client.teamleden ? `, en ${client.teamleden} teamlid/teamleden` : ""
      } verdwijnen. Dit kan niet ongedaan worden gemaakt.`,
    );
    if (!zeker) return;
    setBezig(true);
    setFout(null);
    try {
      await fn({ data: { clientId: client.id, bevestiging: getypt } });
      await qc.invalidateQueries({ queryKey: ["admin-clients"] });
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Verwijderen lukte niet");
      setBezig(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 ml-4 text-[12px] font-medium text-ink/40 transition-colors hover:text-destructive"
      >
        Klant verwijderen
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-destructive/40 bg-destructive/[0.06] p-4">
      <p className="text-[13px] font-semibold text-ink/90">{naam} definitief verwijderen</p>
      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[12.5px]/[1.6] text-ink/70">
        <li>Het account en de inlog van {client.email}</li>
        <li>
          {client.agents.length === 0
            ? "Geen agents"
            : `${client.agents.length} agent(s): ${client.agents.map((a) => a.name).join(", ")}, met kennisbank, contacten, berichten, supportmail en verbruik`}
        </li>
        {!!client.teamleden && <li>{client.teamleden} teamlid/teamleden en hun inlog</li>}
      </ul>
      <p className="mt-2 text-[12.5px] font-semibold text-destructive">
        Dit kan niet ongedaan worden gemaakt.
      </p>

      {live.length > 0 ? (
        <p className="mt-3 text-[12.5px] text-ink/75">
          {live.map((a) => a.name).join(", ")} staat nog live. Zet die eerst op pauze; een klant
          waar nog verkeer op loopt, verwijder je niet.
        </p>
      ) : (
        <label className="mt-3 block text-[12.5px] text-ink/75">
          Typ <strong className="font-semibold text-ink/90">{client.email}</strong> om te bevestigen
          <input
            className={`${inputCls} mt-1.5`}
            value={getypt}
            onChange={(e) => setGetypt(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
      )}
      {fout && <p className="mt-2 text-[12px] text-destructive">{fout}</p>}

      <div className="mt-3 flex gap-2">
        {live.length === 0 && (
          <button
            type="button"
            disabled={!klopt || bezig}
            onClick={verwijder}
            className="rounded-full bg-destructive px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-40"
          >
            {bezig ? "Bezig\u2026" : "Definitief verwijderen"}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setGetypt("");
            setFout(null);
          }}
          className="rounded-full border border-white/12 px-4 py-2 text-[12px] font-semibold text-ink/70"
        >
          Annuleren
        </button>
      </div>
    </div>
  );
}

function LeadRequests({ enabled }: { enabled: boolean }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listLeadRequests);
  const verwijderFn = useServerFn(verwijderAanvraag);
  const { data, isLoading } = useQuery({
    queryKey: ["lead-requests"],
    queryFn: () => listFn(),
    enabled,
  });
  const leads = data ?? [];
  const [bezig, setBezig] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  // Definitief weg, dus eerst vragen, met de naam erin: je moet lezen wát je
  // weggooit. Echte aanvragen bewaren we twaalf maanden (privacyverklaring);
  // testaanvragen en spam horen hier niet te blijven staan.
  async function verwijder(id: string, naam: string) {
    if (
      !window.confirm(
        `De aanvraag van "${naam}" verwijderen? Dit kan niet ongedaan worden gemaakt.`,
      )
    ) {
      return;
    }
    setBezig(id);
    setFout(null);
    try {
      await verwijderFn({ data: { id } });
      await qc.invalidateQueries({ queryKey: ["lead-requests"] });
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Verwijderen lukte niet");
    } finally {
      setBezig(null);
    }
  }

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
      {fout && <p className="mt-3 text-[12px] text-destructive">{fout}</p>}

      <div className="mt-3 space-y-2">
        {leads.map((l) => (
          <div key={l.id} className="rounded-2xl border border-white/12 bg-white/5 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13px] font-semibold text-brand">
                {l.name} — {l.company}
              </p>
              <div className="flex items-center gap-3">
                <p className="text-[11px] text-ink/50">
                  {new Date(l.created_at).toLocaleString("nl-NL", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <button
                  type="button"
                  disabled={bezig === l.id}
                  onClick={() => verwijder(l.id, l.name)}
                  className="text-[11.5px] font-medium text-ink/45 transition-colors hover:text-destructive disabled:opacity-50"
                >
                  {bezig === l.id ? "Bezig\u2026" : "Verwijderen"}
                </button>
              </div>
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
  magWijzigen,
  onSaveAgent,
  onDeleteAgent,
  onSaveStat,
}: {
  client: any;
  busy: boolean;
  magWijzigen: boolean;
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
          {client.eigen ? "Eigen agents" : client.name || "(geen naam)"}
        </p>
        <p className="text-[12px] text-ink/50">
          {client.email}
          {client.teamleden > 0
            ? ` · ${client.teamleden} teamlid${client.teamleden === 1 ? "" : "en"}`
            : ""}
        </p>
      </div>

      {client.agents.length > 0 && !client.eigen && (
        <MeekijkKnop clientId={client.id} naam={client.name || client.email} />
      )}

      {magWijzigen && !client.eigen && <VerwijderKlant client={client} />}

      {magWijzigen && (
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
      )}

      {magWijzigen && (
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
      )}
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
  const [statusUitkomst, setStatusUitkomst] = useState<{ ok: boolean; melding: string } | null>(
    null,
  );
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
          onClick={async () => {
            setStatusUitkomst(null);
            const r = await onSaveAgent({
              id: agent.id,
              clientId: agent.client_id,
              name: agent.name,
              description: agent.description,
              metricLabel: agent.metric_label,
              scoreLabel: agent.score_label,
              status,
            });
            // Naast de knop en met de status erin: de melding bovenaan de
            // pagina zie je niet als je hier bezig bent.
            setStatusUitkomst(
              r.ok
                ? { ok: true, melding: `Opgeslagen: ${STATUS_META[status]?.label ?? status}` }
                : r,
            );
          }}
        >
          Status opslaan
        </button>
        {statusUitkomst && (
          <span
            role="status"
            className={`text-[12px] font-medium ${statusUitkomst.ok ? "text-mint" : "text-destructive"}`}
          >
            {statusUitkomst.melding}
          </span>
        )}
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
  modules?: string[] | null;
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
    modules: (agent.modules as Aannamewaarden["modules"]) ?? null,
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
                  modules: waarden.modules,
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

/**
 * Wie er bij ons werkt. De beheerder kan een support-medewerker uitnodigen:
 * die ziet dit overzicht en mag meekijken, maar wijzigt niets.
 */
function Medewerkers({ magUitnodigen }: { magUitnodigen: boolean }) {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListMedewerkers);
  const uitnodigFn = useServerFn(adminNodigMedewerkerUit);
  const query = useQuery({ queryKey: ["medewerkers"], queryFn: () => listFn() });
  const [nieuw, setNieuw] = useState({ naam: "", email: "" });
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  async function uitnodigen() {
    setBezig(true);
    setMelding(null);
    try {
      await uitnodigFn({ data: nieuw });
      setMelding(`Uitnodiging verstuurd naar ${nieuw.email}.`);
      setNieuw({ naam: "", email: "" });
      await qc.invalidateQueries({ queryKey: ["medewerkers"] });
    } catch (err) {
      setMelding(err instanceof Error ? err.message : "Uitnodigen lukte niet");
    } finally {
      setBezig(false);
    }
  }

  return (
    <section className="card-glass-lg mt-5 rounded-3xl p-5">
      <p className="font-display text-[15px] font-semibold text-brand">Medewerkers</p>
      <ul className="mt-3 space-y-1.5">
        {(query.data ?? []).map((m) => (
          <li
            key={m.id}
            className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]"
          >
            <span className="text-ink/85">{m.name || m.email}</span>
            <span className="text-[12px] text-ink/50">
              {m.email} · {m.rol}
            </span>
          </li>
        ))}
      </ul>

      {magUitnodigen && (
        <div className="mt-4">
          <p className="text-[12px] text-ink/55">
            Support-medewerker uitnodigen. Die ziet dit overzicht en kan meekijken, maar maakt geen
            klanten aan en wijzigt geen agents.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              className={inputCls}
              placeholder="Naam"
              value={nieuw.naam}
              onChange={(e) => setNieuw({ ...nieuw, naam: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="E-mail"
              value={nieuw.email}
              onChange={(e) => setNieuw({ ...nieuw, email: e.target.value })}
            />
            <button
              className={btnCls}
              disabled={bezig || !nieuw.naam.trim() || !nieuw.email.includes("@")}
              onClick={uitnodigen}
            >
              {bezig ? "Bezig\u2026" : "Uitnodigen"}
            </button>
          </div>
          {melding && <p className="mt-2 text-[12px] text-ink/70">{melding}</p>}
        </div>
      )}
    </section>
  );
}
