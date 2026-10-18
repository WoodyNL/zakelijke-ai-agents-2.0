import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Archive, Bot, Hand, MessageCircle, Send } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { useMeekijken } from "@/hooks/use-meekijken";
import { getMe, listAgents } from "@/lib/dashboard.functions";
import {
  haalWaBerichten,
  haalWhatsApp,
  stuurWaBericht,
  volgLeadOpViaWhatsApp,
  zetWaStatus,
  type WaCijfers,
  type WaGesprek,
} from "@/lib/whatsapp.functions";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  head: () => ({
    meta: [
      { title: "WhatsApp — Zakelijke AI Agents klantportaal" },
      { name: "description", content: "Gesprekken via WhatsApp, beantwoord door de agent." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WhatsAppPagina,
});

const veld =
  "w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink/35 focus:border-violet/55";
const knopHoofd =
  "inline-flex items-center gap-1.5 rounded-full bg-violet px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-violet/85 disabled:opacity-50";
const knopRand =
  "inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-ink/80 transition hover:border-violet/40 hover:text-ink disabled:opacity-50";
const wanneer = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const STATUS: Record<WaGesprek["status"], { label: string; kleur: string }> = {
  open: { label: "Agent antwoordt", kleur: "border-mint/30 bg-mint/12 text-mint" },
  overgedragen: {
    label: "Jij bent aan zet",
    kleur: "border-amber-400/35 bg-amber-400/12 text-amber-300",
  },
  gesloten: { label: "Gesloten", kleur: "border-white/15 bg-white/5 text-ink/50" },
};
type Tab = "overgedragen" | "open" | "leads" | "gesloten";

function WhatsAppPagina() {
  const meFn = useServerFn(getMe);
  const agentsFn = useServerFn(listAgents);
  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: () => agentsFn() });
  const meekijken = useMeekijken();
  const alleenLezen = !!meekijken.data;
  const agents = (
    (agentsQuery.data ?? []) as Array<{ id: string; name: string; kind: string }>
  ).filter((a) => a.kind === "whatsapp_followup");
  const [gekozen, setGekozen] = useState<string | null>(null);
  const agentId = gekozen ?? agents[0]?.id ?? null;
  const fn = useServerFn(haalWhatsApp);
  const query = useQuery({
    queryKey: ["whatsapp", agentId],
    queryFn: () => fn({ data: { agentId: agentId! } }),
    enabled: agentId !== null,
    refetchInterval: 15_000,
  });
  const [tab, setTab] = useState<Tab>("overgedragen");
  const [openGesprek, setOpenGesprek] = useState<string | null>(null);
  const alles = query.data?.gesprekken ?? [];
  const perTab: Record<Tab, WaGesprek[]> = {
    overgedragen: alles.filter((g) => g.status === "overgedragen"),
    open: alles.filter((g) => g.status === "open"),
    leads: [],
    gesloten: alles.filter((g) => g.status === "gesloten"),
  };
  const k = query.data?.koppeling;
  const klaar = !!k && k.opServer && k.nummerId;

  return (
    <DashboardShell isAdmin={meQuery.data?.isAdmin === true} userName={meQuery.data?.name}>
      <div className="grid gap-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[22px] font-bold text-brand">WhatsApp</h1>
            <p className="mt-1.5 max-w-[70ch] text-[13px]/[1.7] text-ink/60">
              Wat klanten appen, beantwoordt de agent uit je kennisbank. Bij een klacht, een
              annulering of iets wat hij niet weet, zwijgt hij en krijg jij een mail. Leads van je
              sales-assistent die stil bleven, volgt hij op met een goedgekeurd bericht.
            </p>
          </div>
          {agents.length > 1 && (
            <select
              className={`${veld} max-w-[240px]`}
              value={agentId ?? ""}
              onChange={(e) => setGekozen(e.target.value)}
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id} className="bg-[#12121a]">
                  {a.name}
                </option>
              ))}
            </select>
          )}
        </header>
        {!agentsQuery.isLoading && agents.length === 0 && (
          <div className="card-glass-lg rounded-3xl p-6 text-[13px] text-ink/60">
            Je hebt nog geen WhatsApp-opvolger.
          </div>
        )}
        {query.data && !query.data.beschikbaar && (
          <div className="card-glass-lg rounded-3xl p-6 text-[13px] text-ink/60">
            De agent wordt op dit moment ingericht. Kom straks terug.
          </div>
        )}
        {query.data?.beschikbaar && agentId && k && (
          <>
            {!klaar && (
              <p className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3 text-[12.5px]/[1.6] text-amber-100">
                {!k.opServer
                  ? "De koppeling met WhatsApp wordt nog ingesteld. Wij regelen het zakelijke nummer bij Meta en laten het je weten; tot die tijd komt hier niets binnen."
                  : "Het nummer is nog niet aan deze agent gekoppeld. Wij maken dat in orde."}
              </p>
            )}
            <Cijfers cijfers={query.data.cijfers} />
            <section className="card-glass-lg rounded-3xl p-5 text-[12.5px]/[1.65] text-ink/65">
              <p>
                {k.nummer ? (
                  <>
                    Klanten appen naar <strong className="text-ink/85">{k.nummer}</strong>.{" "}
                  </>
                ) : (
                  "Wij geven je het nummer waarop klanten kunnen appen. "
                )}
                Binnen 24 uur na hun laatste bericht mag er vrij geantwoord worden; daarna staat
                WhatsApp alleen een goedgekeurd sjabloon toe — dat is hun regel, niet de onze.{" "}
                {query.data.automatisch
                  ? `Leads die ${query.data.naDagen} dagen stil bleven, volgt hij vanzelf op op werkdagen binnen je venster.`
                  : "Opvolgen doe je per lead met een klik; 'leads vanzelf opvolgen' zet je aan bij de instellingen."}{" "}
                Overdragen bij: {query.data.overdrachtWoorden.join(", ")}.{" "}
                <Link
                  to="/agents/$agentId"
                  params={{ agentId }}
                  className="font-semibold text-violet underline underline-offset-2"
                >
                  Instellingen
                </Link>
              </p>
            </section>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["overgedragen", "Jij bent aan zet"],
                  ["open", "Agent antwoordt"],
                  ["leads", "Leads om op te volgen"],
                  ["gesloten", "Gesloten"],
                ] as Array<[Tab, string]>
              ).map(([t, label]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition ${tab === t ? "bg-brand text-primary-foreground" : "border border-white/12 bg-white/5 text-ink/70 hover:text-ink"}`}
                >
                  {label} ({t === "leads" ? query.data!.leads.length : perTab[t].length})
                </button>
              ))}
            </div>
            {tab === "leads" ? (
              <Leads
                agentId={agentId}
                leads={query.data.leads}
                alleenLezen={alleenLezen}
                kan={klaar && k.sjabloon}
              />
            ) : (
              <>
                {perTab[tab].length === 0 && (
                  <p className="text-[13px] text-ink/50">Niets in deze lijst.</p>
                )}
                <div className="grid gap-3">
                  {perTab[tab].map((g) => (
                    <Kaart
                      key={g.id}
                      g={g}
                      agentId={agentId}
                      alleenLezen={alleenLezen}
                      open={openGesprek === g.id}
                      onToggle={() => setOpenGesprek(openGesprek === g.id ? null : g.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function Cijfers({ cijfers }: { cijfers: WaCijfers | null }) {
  if (!cijfers) return null;
  const r = cijfers.reactie_seconden;
  const tegels: Array<[string, string]> = [
    [String(cijfers.gesprekken), "gesprekken in 30 dagen"],
    [String(cijfers.door_agent), `door de agent beantwoord (${cijfers.berichten_in} vragen)`],
    [String(cijfers.overdrachten), "aan jou overgedragen"],
    [r == null ? "—" : r < 90 ? `${r} s` : `${Math.round(r / 60)} min`, "reactietijd van de agent"],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tegels.map(([w, l]) => (
        <div key={l} className="card-glass rounded-2xl px-4 py-3.5">
          <p className="font-display text-[20px] leading-none font-bold text-brand tabular-nums">
            {w}
          </p>
          <p className="mt-1.5 text-[11.5px] text-ink/50">{l}</p>
        </div>
      ))}
    </div>
  );
}

function Leads({
  agentId,
  leads,
  alleenLezen,
  kan,
}: {
  agentId: string;
  leads: Array<{
    id: string;
    naam: string | null;
    bedrijf: string | null;
    telefoon: string;
    status: string;
    verzonden_op: string | null;
  }>;
  alleenLezen: boolean;
  kan: boolean;
}) {
  const qc = useQueryClient();
  const fn = useServerFn(volgLeadOpViaWhatsApp);
  const [bezig, setBezig] = useState<string | null>(null);
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string } | null>(null);
  async function volg(leadId: string) {
    setBezig(leadId);
    setMelding(null);
    try {
      await fn({ data: { agentId, leadId } });
      setMelding({ ok: true, tekst: "Opvolging verstuurd." });
      await qc.invalidateQueries({ queryKey: ["whatsapp", agentId] });
    } catch (e) {
      setMelding({ ok: false, tekst: e instanceof Error ? e.message : "Dat lukte niet" });
    } finally {
      setBezig(null);
    }
  }
  return (
    <section className="grid gap-3">
      <p className="text-[12.5px]/[1.6] text-ink/60">
        Leads van je sales-assistent met een telefoonnummer, die na het eerste antwoord stil bleven.
        Het opvolgbericht is een vast, door Meta goedgekeurd sjabloon; de agent neemt het gesprek
        over zodra ze antwoorden.
        {!kan && " Opvolgen kan pas als het sjabloon bij Meta is goedgekeurd en ingesteld."}
      </p>
      {leads.length === 0 && <p className="text-[13px] text-ink/50">Niemand om op te volgen.</p>}
      {leads.map((l) => (
        <article
          key={l.id}
          className="card-glass-lg flex flex-wrap items-center justify-between gap-3 rounded-3xl p-4"
        >
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-ink/90">
              {l.naam || l.telefoon}
              {l.bedrijf && <span className="font-normal text-ink/60"> · {l.bedrijf}</span>}
            </p>
            <p className="mt-0.5 text-[12px] text-ink/50">
              {l.telefoon} · {l.status === "twijfel" ? "twijfel" : "past"}
              {l.verzonden_op ? ` · beantwoord ${wanneer(l.verzonden_op)}` : ""}
            </p>
          </div>
          <button
            type="button"
            className={knopHoofd}
            disabled={alleenLezen || !kan || bezig !== null}
            onClick={() => volg(l.id)}
          >
            <MessageCircle className="size-3.5" />{" "}
            {bezig === l.id ? "Bezig…" : "Opvolgen via WhatsApp"}
          </button>
        </article>
      ))}
      {melding && (
        <p
          className={`rounded-xl border px-3 py-2 text-[12px] font-medium ${melding.ok ? "border-mint/30 bg-mint/10 text-ink/85" : "border-warn/30 bg-warn/10 text-ink/85"}`}
        >
          {melding.tekst}
        </p>
      )}
    </section>
  );
}

function Kaart({
  g,
  agentId,
  alleenLezen,
  open,
  onToggle,
}: {
  g: WaGesprek;
  agentId: string;
  alleenLezen: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const qc = useQueryClient();
  const berichtenFn = useServerFn(haalWaBerichten);
  const stuurFn = useServerFn(stuurWaBericht);
  const statusFn = useServerFn(zetWaStatus);
  const berichten = useQuery({
    queryKey: ["whatsapp-berichten", g.id],
    queryFn: () => berichtenFn({ data: { agentId, gesprekId: g.id } }),
    enabled: open,
    refetchInterval: open ? 10_000 : false,
  });
  const [tekst, setTekst] = useState("");
  const [bezig, setBezig] = useState<string | null>(null);
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string } | null>(null);
  useEffect(() => {
    if (!open) setMelding(null);
  }, [open]);
  const st = STATUS[g.status];
  async function doe(naam: string, werk: () => Promise<unknown>, ok: string) {
    setBezig(naam);
    setMelding(null);
    try {
      await werk();
      setMelding({ ok: true, tekst: ok });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["whatsapp", agentId] }),
        qc.invalidateQueries({ queryKey: ["whatsapp-berichten", g.id] }),
      ]);
    } catch (e) {
      setMelding({ ok: false, tekst: e instanceof Error ? e.message : "Dat lukte niet" });
    } finally {
      setBezig(null);
    }
  }
  return (
    <article className="card-glass-lg rounded-3xl p-5">
      <button type="button" className="w-full text-left" onClick={onToggle}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-ink/90">
              {g.naam || g.telefoon}
              {g.naam && <span className="font-normal text-ink/60"> · {g.telefoon}</span>}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-ink/50">{g.laatste_bericht ?? "—"}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[11.5px] text-ink/45">{wanneer(g.laatste_op)}</span>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${st.kleur}`}
            >
              {st.label}
            </span>
          </div>
        </div>
      </button>
      {g.status === "overgedragen" && g.overdracht_reden && (
        <p className="mt-2 text-[12.5px] text-amber-100">
          <span className="text-ink/45">Waarom: </span>
          {g.overdracht_reden}
        </p>
      )}
      {open && (
        <div className="mt-3 grid gap-2">
          <div className="grid gap-1.5 rounded-2xl bg-white/[0.03] p-3">
            {(berichten.data ?? []).map((b) => (
              <div
                key={b.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12.5px]/[1.55] ${b.richting === "in" ? "self-start bg-white/[0.06] text-ink/85" : "self-end bg-violet/25 text-ink/90"}`}
              >
                <p className="whitespace-pre-wrap">{b.tekst || "[zonder tekst]"}</p>
                <p className="mt-1 text-[10.5px] text-ink/45">
                  {b.richting === "in"
                    ? "klant"
                    : b.door === "mens"
                      ? "jij"
                      : b.door === "sjabloon"
                        ? "sjabloon"
                        : "agent"}{" "}
                  · {wanneer(b.op)}
                  {b.status === "mislukt"
                    ? ` · mislukt${b.fout ? `: ${b.fout}` : ""}`
                    : b.status === "gelezen"
                      ? " · gelezen"
                      : ""}
                </p>
              </div>
            ))}
            {berichten.data?.length === 0 && (
              <p className="text-[12px] text-ink/45">Nog geen berichten.</p>
            )}
          </div>
          {!alleenLezen && g.status !== "gesloten" && (
            <>
              {g.venster_open ? (
                <div className="flex gap-2">
                  <textarea
                    className={`${veld} min-h-[60px]`}
                    placeholder="Zelf antwoorden…"
                    value={tekst}
                    onChange={(e) => setTekst(e.target.value)}
                  />
                  <button
                    type="button"
                    className={knopHoofd}
                    disabled={bezig !== null || !tekst.trim()}
                    onClick={() =>
                      doe(
                        "sturen",
                        async () => {
                          await stuurFn({ data: { agentId, gesprekId: g.id, tekst } });
                          setTekst("");
                        },
                        "Verstuurd.",
                      )
                    }
                  >
                    <Send className="size-3.5" />
                  </button>
                </div>
              ) : (
                <p className="text-[12px] text-ink/50">
                  Het venster van 24 uur is dicht; pas als de klant weer iets stuurt kan er
                  geantwoord worden.
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {g.status === "open" ? (
                  <button
                    type="button"
                    className={knopRand}
                    disabled={bezig !== null}
                    onClick={() =>
                      doe(
                        "overnemen",
                        () =>
                          statusFn({ data: { agentId, gesprekId: g.id, status: "overgedragen" } }),
                        "Jij antwoordt nu; de agent zwijgt.",
                      )
                    }
                  >
                    <Hand className="size-3.5" /> Zelf overnemen
                  </button>
                ) : (
                  <button
                    type="button"
                    className={knopRand}
                    disabled={bezig !== null}
                    onClick={() =>
                      doe(
                        "teruggeven",
                        () => statusFn({ data: { agentId, gesprekId: g.id, status: "open" } }),
                        "De agent antwoordt weer.",
                      )
                    }
                  >
                    <Bot className="size-3.5" /> Agent weer laten antwoorden
                  </button>
                )}
                <button
                  type="button"
                  className={knopRand}
                  disabled={bezig !== null}
                  onClick={() =>
                    doe(
                      "sluiten",
                      () => statusFn({ data: { agentId, gesprekId: g.id, status: "gesloten" } }),
                      "Gesloten. Stuurt de klant weer iets, dan gaat het vanzelf open.",
                    )
                  }
                >
                  <Archive className="size-3.5" /> Sluiten
                </button>
              </div>
            </>
          )}
          {melding && (
            <p
              className={`rounded-xl border px-3 py-2 text-[12px] font-medium ${melding.ok ? "border-mint/30 bg-mint/10 text-ink/85" : "border-warn/30 bg-warn/10 text-ink/85"}`}
            >
              {melding.tekst}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
