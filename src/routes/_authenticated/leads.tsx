import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Check, RotateCcw, Send, ThumbsDown, Trophy, UserPlus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { useMeekijken } from "@/hooks/use-meekijken";
import { getMe, listAgents } from "@/lib/dashboard.functions";
import { minutenTeLaat } from "@/lib/sales";
import { bewaarOfferteAfzender } from "@/lib/offerte.functions";
import {
  beoordeelLeadOpnieuw,
  haalLeads,
  nieuweLead,
  verstuurAntwoordLead,
  zetLeadStatus,
  type SalesCijfers,
  type SalesLead,
} from "@/lib/sales.functions";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({
    meta: [
      { title: "Leads — Zakelijke AI Agents klantportaal" },
      { name: "description", content: "Binnenkomende leads, beoordeeld en beantwoord." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeadsPagina,
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

const STATUS: Record<SalesLead["status"], { label: string; kleur: string }> = {
  nieuw: { label: "Nieuw", kleur: "border-white/15 bg-white/5 text-ink/70" },
  bezig: { label: "Wordt beoordeeld", kleur: "border-white/15 bg-white/5 text-ink/70" },
  gekwalificeerd: { label: "Past", kleur: "border-mint/30 bg-mint/12 text-mint" },
  twijfel: { label: "Jij beslist", kleur: "border-amber-400/35 bg-amber-400/12 text-amber-300" },
  afgewezen: { label: "Past niet", kleur: "border-white/15 bg-white/5 text-ink/60" },
  afspraak: { label: "Afspraak", kleur: "border-violet/35 bg-violet/12 text-violet" },
  gewonnen: {
    label: "Gewonnen",
    kleur: "border-emerald-400/35 bg-emerald-400/12 text-emerald-300",
  },
  verloren: { label: "Verloren", kleur: "border-white/15 bg-white/5 text-ink/50" },
  mislukt: { label: "Mislukt", kleur: "border-warn/35 bg-warn/10 text-ink/85" },
};
const BRON: Record<string, string> = {
  mail: "per mail",
  chat: "uit de chat",
  formulier: "formulier",
  handmatig: "zelf ingevoerd",
};
type Tab = "open" | "afspraak" | "afgerond";

function LeadsPagina() {
  const meFn = useServerFn(getMe);
  const agentsFn = useServerFn(listAgents);
  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: () => agentsFn() });
  const meekijken = useMeekijken();
  const alleenLezen = !!meekijken.data;
  const agents = (
    (agentsQuery.data ?? []) as Array<{ id: string; name: string; kind: string }>
  ).filter((a) => a.kind === "sales_assistent");
  const [gekozen, setGekozen] = useState<string | null>(null);
  const agentId = gekozen ?? agents[0]?.id ?? null;
  const fn = useServerFn(haalLeads);
  const query = useQuery({
    queryKey: ["leads", agentId],
    queryFn: () => fn({ data: { agentId: agentId! } }),
    enabled: agentId !== null,
    refetchInterval: 20_000,
  });
  const [tab, setTab] = useState<Tab>("open");
  const alles = query.data?.leads ?? [];
  const perTab: Record<Tab, SalesLead[]> = {
    open: alles.filter((l) =>
      ["nieuw", "bezig", "gekwalificeerd", "twijfel", "afgewezen", "mislukt"].includes(l.status),
    ),
    afspraak: alles.filter((l) => l.status === "afspraak"),
    afgerond: alles.filter((l) => l.status === "gewonnen" || l.status === "verloren"),
  };

  return (
    <DashboardShell isAdmin={meQuery.data?.isAdmin === true} userName={meQuery.data?.name}>
      <div className="grid gap-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[22px] font-bold text-brand">Leads</h1>
            <p className="mt-1.5 max-w-[70ch] text-[13px]/[1.7] text-ink/60">
              Elke lead wordt binnen minuten beoordeeld tegen wie bij jou past, met een eerste
              antwoord klaar. Twijfel legt hij bij jou neer; een afwijzing verstuurt hij nooit zelf.
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
            Je hebt nog geen sales-assistent.
          </div>
        )}
        {query.data && !query.data.beschikbaar && (
          <div className="card-glass-lg rounded-3xl p-6 text-[13px] text-ink/60">
            De agent wordt op dit moment ingericht. Kom straks terug.
          </div>
        )}
        {query.data?.beschikbaar && agentId && (
          <>
            <Cijfers cijfers={query.data.cijfers} doel={query.data.reactietijdDoel} />
            {!query.data.kwalificatie && (
              <p className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3 text-[12.5px]/[1.6] text-amber-100">
                "Wie past bij jou" is nog leeg; zonder die tekst is elk oordeel "jij beslist". Vul
                hem in bij de{" "}
                <Link
                  to="/agents/$agentId"
                  params={{ agentId }}
                  className="font-semibold underline underline-offset-2"
                >
                  instellingen van de agent
                </Link>
                .
              </p>
            )}
            <section className="card-glass-lg rounded-3xl p-5 text-[12.5px]/[1.65] text-ink/65">
              <p>
                {query.data.leadAdres ? (
                  <>
                    Leads per mail komen binnen op{" "}
                    <strong className="text-ink/85">{query.data.leadAdres}</strong>; zet dat adres
                    achter je contactformulier of stuur aanvragen door.{" "}
                  </>
                ) : (
                  "Wij geven je het adres waar leads per mail binnenkomen. "
                )}
                Leads uit je chat-assistent komen hier vanzelf bij.{" "}
                {query.data.zelfAntwoorden
                  ? "Past een lead en is alles duidelijk, dan gaat het eerste antwoord direct weg."
                  : "Elk antwoord wacht op jou; 'zelf antwoorden' zet je aan bij de instellingen."}
              </p>
            </section>
            <Afzender agentId={agentId} afzender={query.data.afzender} alleenLezen={alleenLezen} />
            {!alleenLezen && <Handmatig agentId={agentId} />}
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["open", "Te doen"],
                  ["afspraak", "Afspraak"],
                  ["afgerond", "Afgerond"],
                ] as Array<[Tab, string]>
              ).map(([t, label]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition ${tab === t ? "bg-brand text-primary-foreground" : "border border-white/12 bg-white/5 text-ink/70 hover:text-ink"}`}
                >
                  {label} ({perTab[t].length})
                </button>
              ))}
            </div>
            {perTab[tab].length === 0 && (
              <p className="text-[13px] text-ink/50">Niets in deze lijst.</p>
            )}
            <div className="grid gap-3">
              {perTab[tab].map((l) => (
                <Kaart
                  key={l.id}
                  l={l}
                  agentId={agentId}
                  alleenLezen={alleenLezen}
                  doel={query.data!.reactietijdDoel}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function Cijfers({ cijfers, doel }: { cijfers: SalesCijfers | null; doel: number }) {
  if (!cijfers) return null;
  const tegels: Array<[string, string]> = [
    [String(cijfers.leads), "leads in 30 dagen"],
    [
      cijfers.reactie_minuten != null ? `${cijfers.reactie_minuten} min` : "—",
      `eerste antwoord (doel ${doel} min)`,
    ],
    [
      String(cijfers.gekwalificeerd),
      `passen (${cijfers.afgewezen} niet, ${cijfers.twijfel} twijfel)`,
    ],
    [String(cijfers.afspraken), "afspraken"],
    [String(cijfers.gewonnen), "gewonnen"],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
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

function Afzender({
  agentId,
  afzender,
  alleenLezen,
}: {
  agentId: string;
  afzender: {
    afzender_naam: string | null;
    afzender_email: string | null;
    ondertekening: string | null;
  };
  alleenLezen: boolean;
}) {
  const qc = useQueryClient();
  const fn = useServerFn(bewaarOfferteAfzender);
  const [w, setW] = useState(afzender);
  const [open, setOpen] = useState(!afzender.afzender_email);
  const [melding, setMelding] = useState<string | null>(null);
  useEffect(() => setW(afzender), [afzender]);
  async function bewaar() {
    setMelding(null);
    try {
      await fn({
        data: {
          agentId,
          afzenderNaam: w.afzender_naam || null,
          afzenderEmail: w.afzender_email || null,
          ondertekening: w.ondertekening || null,
        },
      });
      setMelding("Opgeslagen.");
      await qc.invalidateQueries({ queryKey: ["leads", agentId] });
    } catch (e) {
      setMelding(e instanceof Error ? e.message : "Dat lukte niet");
    }
  }
  return (
    <section className="card-glass-lg rounded-3xl p-5">
      {!afzender.afzender_email && (
        <p className="mb-2 text-[12px] text-amber-100">
          Zonder afzenderadres kan er geen antwoord weg.
        </p>
      )}
      <button
        type="button"
        className="text-[12px] font-medium text-violet hover:underline"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Afzender verbergen" : "Afzender en ondertekening"}
      </button>
      {open && (
        <div className="mt-2 grid gap-2">
          <input
            className={veld}
            placeholder="Naam afzender"
            value={w.afzender_naam ?? ""}
            disabled={alleenLezen}
            onChange={(e) => setW({ ...w, afzender_naam: e.target.value })}
          />
          <input
            className={veld}
            placeholder="Adres waarvandaan antwoorden vertrekken"
            value={w.afzender_email ?? ""}
            disabled={alleenLezen}
            onChange={(e) => setW({ ...w, afzender_email: e.target.value })}
          />
          <textarea
            className={`${veld} min-h-[60px]`}
            placeholder="Ondertekening"
            value={w.ondertekening ?? ""}
            disabled={alleenLezen}
            onChange={(e) => setW({ ...w, ondertekening: e.target.value })}
          />
          <div className="flex items-center gap-3">
            <button type="button" className={knopHoofd} disabled={alleenLezen} onClick={bewaar}>
              Opslaan
            </button>
            {melding && <span className="text-[12px] text-ink/60">{melding}</span>}
          </div>
        </div>
      )}
    </section>
  );
}

function Handmatig({ agentId }: { agentId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(nieuweLead);
  const [open, setOpen] = useState(false);
  const [w, setW] = useState({ naam: "", bedrijf: "", email: "", telefoon: "", bericht: "" });
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);
  async function voer() {
    setBezig(true);
    setMelding(null);
    try {
      await fn({
        data: {
          agentId,
          naam: w.naam || null,
          bedrijf: w.bedrijf || null,
          email: w.email,
          telefoon: w.telefoon || null,
          bericht: w.bericht,
        },
      });
      setW({ naam: "", bedrijf: "", email: "", telefoon: "", bericht: "" });
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["leads", agentId] });
    } catch (e) {
      setMelding(e instanceof Error ? e.message : "Dat lukte niet");
    } finally {
      setBezig(false);
    }
  }
  if (!open)
    return (
      <div>
        <button type="button" className={knopRand} onClick={() => setOpen(true)}>
          <UserPlus className="size-3.5" /> Lead zelf invoeren
        </button>
      </div>
    );
  return (
    <section className="card-glass-lg rounded-3xl p-5">
      <p className="text-[12.5px] font-semibold text-ink/85">Een lead invoeren</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input
          className={veld}
          placeholder="Naam"
          value={w.naam}
          onChange={(e) => setW({ ...w, naam: e.target.value })}
        />
        <input
          className={veld}
          placeholder="Bedrijf"
          value={w.bedrijf}
          onChange={(e) => setW({ ...w, bedrijf: e.target.value })}
        />
        <input
          className={veld}
          placeholder="E-mail"
          value={w.email}
          onChange={(e) => setW({ ...w, email: e.target.value })}
        />
        <input
          className={veld}
          placeholder="Telefoon (optioneel)"
          value={w.telefoon}
          onChange={(e) => setW({ ...w, telefoon: e.target.value })}
        />
      </div>
      <textarea
        className={`${veld} mt-2 min-h-[80px]`}
        placeholder="Wat vroeg of wilde deze lead?"
        value={w.bericht}
        onChange={(e) => setW({ ...w, bericht: e.target.value })}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={knopHoofd}
          disabled={bezig || !w.email || w.bericht.trim().length < 3}
          onClick={voer}
        >
          {bezig ? "Bezig…" : "Beoordelen en antwoord klaarzetten"}
        </button>
        <button type="button" className={knopRand} onClick={() => setOpen(false)}>
          Annuleren
        </button>
        {melding && <span className="text-[12px] text-ink/70">{melding}</span>}
      </div>
    </section>
  );
}

function Kaart({
  l,
  agentId,
  alleenLezen,
  doel,
}: {
  l: SalesLead;
  agentId: string;
  alleenLezen: boolean;
  doel: number;
}) {
  const qc = useQueryClient();
  const verstuurFn = useServerFn(verstuurAntwoordLead);
  const statusFn = useServerFn(zetLeadStatus);
  const opnieuwFn = useServerFn(beoordeelLeadOpnieuw);
  const [onderwerp, setOnderwerp] = useState(l.concept_onderwerp ?? "Re: je aanvraag");
  const [tekst, setTekst] = useState(l.concept_tekst ?? "");
  const [bezig, setBezig] = useState<string | null>(null);
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string } | null>(null);
  const [berichtOpen, setBerichtOpen] = useState(false);
  useEffect(() => {
    setOnderwerp(l.concept_onderwerp ?? "Re: je aanvraag");
    setTekst(l.concept_tekst ?? "");
  }, [l.id, l.concept_onderwerp, l.concept_tekst]);
  const st = STATUS[l.status];
  const teLaat = !l.verzonden_op && !l.concept_op ? minutenTeLaat(l.ontvangen_op, doel) : 0;
  const magAntwoorden =
    ["gekwalificeerd", "twijfel", "afgewezen", "mislukt"].includes(l.status) && !l.verzonden_op;
  async function doe(naam: string, werk: () => Promise<unknown>, ok: string) {
    setBezig(naam);
    setMelding(null);
    try {
      await werk();
      setMelding({ ok: true, tekst: ok });
      await qc.invalidateQueries({ queryKey: ["leads", agentId] });
    } catch (e) {
      setMelding({ ok: false, tekst: e instanceof Error ? e.message : "Dat lukte niet" });
    } finally {
      setBezig(null);
    }
  }
  return (
    <article className="card-glass-lg rounded-3xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-ink/90">
            {l.naam || l.email}
            {l.bedrijf && <span className="font-normal text-ink/60"> · {l.bedrijf}</span>}
          </p>
          <p className="mt-0.5 text-[12px] text-ink/50">
            {l.email}
            {l.telefoon ? ` · ${l.telefoon}` : ""} · {BRON[l.bron] ?? l.bron}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[11.5px] text-ink/45">{wanneer(l.ontvangen_op)}</span>
          {teLaat > 0 && (
            <span className="rounded-full border border-rose-400/35 bg-rose-400/12 px-2 py-0.5 text-[11px] text-rose-300">
              {teLaat} min over je doel
            </span>
          )}
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${st.kleur}`}>
            {st.label}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setBerichtOpen((v) => !v)}
        className="mt-3 text-[12px] font-medium text-violet hover:underline"
      >
        {berichtOpen ? "Bericht verbergen" : "Bericht lezen"}
      </button>
      {berichtOpen && (
        <pre className="mt-2 whitespace-pre-wrap rounded-2xl bg-white/[0.03] p-3 text-[12.5px]/[1.65] text-ink/75">
          {l.bericht}
        </pre>
      )}
      {l.reden && (
        <p className="mt-2 text-[12.5px] text-ink/70">
          <span className="text-ink/45">Oordeel: </span>
          {l.reden}
        </p>
      )}
      {l.vragen.length > 0 && (
        <div className="mt-2 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-[12.5px]/[1.6] text-amber-100">
          <p className="font-semibold">Wat de agent zou willen weten:</p>
          <ul className="mt-1 list-disc pl-5">
            {l.vragen.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </div>
      )}
      {l.fout && <p className="mt-2 text-[12px] text-rose-300">{l.fout}</p>}
      {l.verzonden_op && (
        <p className="mt-2 text-[12px] text-ink/50">Beantwoord {wanneer(l.verzonden_op)}.</p>
      )}
      {magAntwoorden && (
        <div className="mt-3 grid gap-2">
          <input
            className={veld}
            value={onderwerp}
            disabled={alleenLezen}
            onChange={(e) => setOnderwerp(e.target.value)}
          />
          <textarea
            className={`${veld} min-h-[120px]`}
            value={tekst}
            disabled={alleenLezen}
            onChange={(e) => setTekst(e.target.value)}
            placeholder={l.concept_op ? "" : "Het antwoord wordt opgesteld…"}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={knopHoofd}
              disabled={alleenLezen || bezig !== null || !tekst.trim()}
              onClick={() =>
                doe(
                  "versturen",
                  () => verstuurFn({ data: { id: l.id, agentId, onderwerp, tekst } }),
                  "Verstuurd.",
                )
              }
            >
              <Send className="size-3.5" />{" "}
              {bezig === "versturen" ? "Bezig…" : "Antwoord versturen"}
            </button>
            <button
              type="button"
              className={knopRand}
              disabled={alleenLezen || bezig !== null}
              onClick={() =>
                doe(
                  "opnieuw",
                  () => opnieuwFn({ data: { id: l.id, agentId } }),
                  "Opnieuw beoordeeld.",
                )
              }
            >
              <RotateCcw className="size-3.5" /> Opnieuw
            </button>
          </div>
        </div>
      )}
      {!alleenLezen && !["gewonnen", "verloren"].includes(l.status) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {l.status !== "afspraak" && (
            <button
              type="button"
              className={knopRand}
              disabled={bezig !== null}
              onClick={() =>
                doe(
                  "afspraak",
                  () => statusFn({ data: { id: l.id, agentId, status: "afspraak" } }),
                  "Afspraak genoteerd.",
                )
              }
            >
              <Check className="size-3.5" /> Afspraak staat
            </button>
          )}
          <button
            type="button"
            className={knopRand}
            disabled={bezig !== null}
            onClick={() =>
              doe(
                "gewonnen",
                () => statusFn({ data: { id: l.id, agentId, status: "gewonnen" } }),
                "Gewonnen — mooi.",
              )
            }
          >
            <Trophy className="size-3.5" /> Gewonnen
          </button>
          <button
            type="button"
            className={knopRand}
            disabled={bezig !== null}
            onClick={() =>
              doe(
                "verloren",
                () => statusFn({ data: { id: l.id, agentId, status: "verloren" } }),
                "Als verloren gemarkeerd.",
              )
            }
          >
            <ThumbsDown className="size-3.5" /> Verloren
          </button>
          {l.status === "afgewezen" && (
            <button
              type="button"
              className={knopRand}
              disabled={bezig !== null}
              onClick={() =>
                doe(
                  "toch",
                  () => statusFn({ data: { id: l.id, agentId, status: "gekwalificeerd" } }),
                  "Toch meegenomen.",
                )
              }
            >
              Past toch
            </button>
          )}
        </div>
      )}
      {melding && (
        <p
          className={`mt-3 rounded-xl border px-3 py-2 text-[12px] font-medium ${melding.ok ? "border-mint/30 bg-mint/10 text-ink/85" : "border-warn/30 bg-warn/10 text-ink/85"}`}
        >
          {melding.tekst}
        </p>
      )}
    </article>
  );
}
