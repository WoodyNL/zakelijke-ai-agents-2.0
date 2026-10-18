import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, FileUp, Trash2, UserX, X } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { leesBestand } from "@/components/bestand-lezen";
import { useMeekijken } from "@/hooks/use-meekijken";
import { getMe, listAgents } from "@/lib/dashboard.functions";
import { eersteEmail } from "@/lib/contactimport";
import { bewaarOfferteAfzender } from "@/lib/offerte.functions";
import {
  haalAfspraken,
  verwijderAfspraak,
  zetAfspraakStatus,
  zetAfspraken,
  zetOpWachtlijst,
  zetWachtlijstStatus,
  type Afspraak,
  type AfspraakCijfers,
  type Wachtende,
} from "@/lib/afspraken.functions";

export const Route = createFileRoute("/_authenticated/afspraken")({
  head: () => ({
    meta: [
      { title: "Afspraken — Zakelijke AI Agents klantportaal" },
      { name: "description", content: "Afspraken, herinneringen en de wachtlijst." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AfsprakenPagina,
});

const veld =
  "w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink/35 focus:border-violet/55";
const knopHoofd =
  "inline-flex items-center gap-1.5 rounded-full bg-violet px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-violet/85 disabled:opacity-50";
const knopRand =
  "inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-ink/80 transition hover:border-violet/40 hover:text-ink disabled:opacity-50";
const moment = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const STATUS: Record<Afspraak["status"], { label: string; kleur: string }> = {
  gepland: { label: "Gepland", kleur: "border-white/15 bg-white/5 text-ink/70" },
  bevestigd: { label: "Bevestigd", kleur: "border-mint/30 bg-mint/12 text-mint" },
  verzet_gevraagd: {
    label: "Wil verzetten",
    kleur: "border-amber-400/35 bg-amber-400/12 text-amber-300",
  },
  geannuleerd: { label: "Geannuleerd", kleur: "border-white/15 bg-white/5 text-ink/50" },
  no_show: { label: "No-show", kleur: "border-rose-400/35 bg-rose-400/12 text-rose-300" },
  afgerond: { label: "Afgerond", kleur: "border-white/15 bg-white/5 text-ink/60" },
};

function AfsprakenPagina() {
  const meFn = useServerFn(getMe);
  const agentsFn = useServerFn(listAgents);
  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: () => agentsFn() });
  const meekijken = useMeekijken();
  const alleenLezen = !!meekijken.data;
  const agents = (
    (agentsQuery.data ?? []) as Array<{ id: string; name: string; kind: string }>
  ).filter((a) => a.kind === "afspraken");
  const [gekozen, setGekozen] = useState<string | null>(null);
  const agentId = gekozen ?? agents[0]?.id ?? null;
  const fn = useServerFn(haalAfspraken);
  const query = useQuery({
    queryKey: ["afspraken", agentId],
    queryFn: () => fn({ data: { agentId: agentId! } }),
    enabled: agentId !== null,
    refetchInterval: 60_000,
  });

  const nu = Date.now();
  const komend = (query.data?.afspraken ?? []).filter(
    (a) => new Date(a.begint_op).getTime() >= nu - 3_600_000,
  );
  const voorbij = (query.data?.afspraken ?? [])
    .filter((a) => new Date(a.begint_op).getTime() < nu - 3_600_000)
    .reverse();

  return (
    <DashboardShell isAdmin={meQuery.data?.isAdmin === true} userName={meQuery.data?.name}>
      <div className="grid gap-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[22px] font-bold text-brand">Afspraken</h1>
            <p className="mt-1.5 max-w-[70ch] text-[13px]/[1.7] text-ink/60">
              De agent herinnert op de momenten die je instelde, leest een 'ja' als bevestiging en
              legt alles wat verzetten of afzeggen is bij jou neer. Zelf verzetten doet hij nooit.
              Na een no-show stuurt hij één vriendelijk bericht.
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
            Je hebt nog geen afsprakenagent.
          </div>
        )}
        {query.data && !query.data.beschikbaar && (
          <div className="card-glass-lg rounded-3xl p-6 text-[13px] text-ink/60">
            De agent wordt op dit moment ingericht. Kom straks terug.
          </div>
        )}

        {query.data?.beschikbaar && agentId && (
          <>
            <Cijfers cijfers={query.data.cijfers} />
            <section className="card-glass-lg rounded-3xl p-5 text-[12.5px]/[1.65] text-ink/65">
              <p>
                <strong className="text-ink/85">Herinneringen:</strong>{" "}
                {query.data.herinnerUren.map((u) => `${u} uur vooraf`).join(" en ")}.{" "}
                {query.data.naNoShow
                  ? "Na een no-show volgt één bericht."
                  : "Geen bericht na een no-show."}{" "}
                {query.data.wachtlijstAan
                  ? "Valt er een plek vrij, dan biedt hij die aan de wachtlijst aan."
                  : "De wachtlijst staat uit."}
              </p>
              {query.data.antwoordAdres && (
                <p className="mt-1.5">
                  Antwoorden van klanten komen binnen op{" "}
                  <strong className="text-ink/85">{query.data.antwoordAdres}</strong>.
                </p>
              )}
              <p className="mt-1.5 text-ink/45">
                Zonder agendakoppeling zet je afspraken hier zelf (of als lijst). De koppeling met
                Google Agenda en Microsoft 365 komt eraan.
              </p>
            </section>
            <Afzender agentId={agentId} afzender={query.data.afzender} alleenLezen={alleenLezen} />
            {!alleenLezen && <Toevoegen agentId={agentId} />}

            <section className="card-glass-lg rounded-3xl p-5">
              <h2 className="font-display text-[15px] font-semibold text-brand">
                Komende afspraken ({komend.length})
              </h2>
              {komend.length === 0 && (
                <p className="mt-2 text-[13px] text-ink/50">Niets gepland.</p>
              )}
              <div className="mt-3 grid gap-2">
                {komend.map((a) => (
                  <Rij key={a.id} a={a} agentId={agentId} alleenLezen={alleenLezen} />
                ))}
              </div>
            </section>

            <Wachtlijst agentId={agentId} lijst={query.data.wachtlijst} alleenLezen={alleenLezen} />

            {voorbij.length > 0 && (
              <section className="card-glass-lg rounded-3xl p-5">
                <h2 className="font-display text-[15px] font-semibold text-brand">
                  Voorbij (30 dagen)
                </h2>
                <p className="mt-1 text-[12px] text-ink/50">
                  Markeer wat er gebeurde; dat voedt het no-show-cijfer.
                </p>
                <div className="mt-3 grid gap-2">
                  {voorbij.map((a) => (
                    <Rij key={a.id} a={a} agentId={agentId} alleenLezen={alleenLezen} voorbij />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function Cijfers({ cijfers }: { cijfers: AfspraakCijfers | null }) {
  if (!cijfers) return null;
  const tegels: Array<[string, string]> = [
    [String(cijfers.komende_week), "komende 7 dagen"],
    [String(cijfers.afspraken), "voorbij in 30 dagen"],
    [
      cijfers.afspraken > 0 ? `${Math.round((cijfers.bevestigd / cijfers.afspraken) * 100)}%` : "—",
      "vooraf bevestigd",
    ],
    [
      cijfers.no_show_percentage != null ? `${cijfers.no_show_percentage}%` : "—",
      `no-shows (${cijfers.no_shows})`,
    ],
    [String(cijfers.wachtlijst), "op de wachtlijst"],
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
      await qc.invalidateQueries({ queryKey: ["afspraken", agentId] });
    } catch (e) {
      setMelding(e instanceof Error ? e.message : "Dat lukte niet");
    }
  }
  return (
    <section className="card-glass-lg rounded-3xl p-5">
      {!afzender.afzender_email && (
        <p className="mb-2 text-[12px] text-amber-100">
          Zonder afzenderadres verstuurt de agent geen herinneringen.
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
            placeholder="Adres waarvandaan herinneringen vertrekken"
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

function Toevoegen({ agentId }: { agentId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(zetAfspraken);
  const invoer = useRef<HTMLInputElement>(null);
  const [w, setW] = useState({
    naam: "",
    email: "",
    datum: "",
    tijd: "10:00",
    omschrijving: "",
    locatie: "",
  });
  const [melding, setMelding] = useState<string | null>(null);
  const [rijen, setRijen] = useState<string[][]>([]);
  // Lijst: e-mail op inhoud, datum+tijd uit een cel die als datum te lezen is
  // (ISO met tijd of "18-10-2026 14:30"), naam de eerste overige tekst.
  const gelezen = useMemo(() => {
    const uit: Array<{ klant_email: string; klant_naam: string | null; begint_op: string }> = [];
    for (const rij of rijen) {
      const email = rij.map((c) => eersteEmail(c)).find((x): x is string => !!x);
      if (!email) continue;
      const cel = rij.find((c) =>
        /\d{1,2}[-/]\d{1,2}[-/]\d{4}\s+\d{1,2}:\d{2}|\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(c),
      );
      if (!cel) continue;
      const m = /(\d{1,2})[-/](\d{1,2})[-/](\d{4})\s+(\d{1,2}):(\d{2})/.exec(cel);
      const d = m
        ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]))
        : new Date(cel.replace(" ", "T"));
      if (Number.isNaN(d.getTime())) continue;
      const naam =
        rij.find((c) => c && !eersteEmail(c) && c !== cel && !/^\d+$/.test(c.trim())) ?? null;
      uit.push({
        klant_email: email,
        klant_naam: naam ? naam.trim().slice(0, 120) : null,
        begint_op: d.toISOString(),
      });
    }
    return uit;
  }, [rijen]);

  async function stuur(
    afspraken: Array<{
      klant_email: string;
      klant_naam: string | null;
      begint_op: string;
      omschrijving?: string | null;
      locatie?: string | null;
    }>,
    bron: "handmatig" | "bestand",
  ) {
    setMelding(null);
    try {
      const r = await fn({ data: { agentId, afspraken, bron } });
      setMelding(`${r.aantal} toegevoegd.`);
      setRijen([]);
      setW({ ...w, naam: "", email: "", omschrijving: "" });
      await qc.invalidateQueries({ queryKey: ["afspraken", agentId] });
    } catch (e) {
      setMelding(e instanceof Error ? e.message : "Dat lukte niet");
    }
  }
  const begint = w.datum && w.tijd ? new Date(`${w.datum}T${w.tijd}:00`) : null;
  return (
    <section className="card-glass-lg rounded-3xl p-5">
      <p className="text-[12.5px] font-semibold text-ink/85">Afspraak toevoegen</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <input
          className={veld}
          placeholder="Naam"
          value={w.naam}
          onChange={(e) => setW({ ...w, naam: e.target.value })}
        />
        <input
          className={veld}
          placeholder="E-mail"
          value={w.email}
          onChange={(e) => setW({ ...w, email: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            className={veld}
            value={w.datum}
            onChange={(e) => setW({ ...w, datum: e.target.value })}
          />
          <input
            type="time"
            className={veld}
            value={w.tijd}
            onChange={(e) => setW({ ...w, tijd: e.target.value })}
          />
        </div>
        <input
          className={veld}
          placeholder="Waarvoor (optioneel)"
          value={w.omschrijving}
          onChange={(e) => setW({ ...w, omschrijving: e.target.value })}
        />
        <input
          className={veld}
          placeholder="Locatie (optioneel)"
          value={w.locatie}
          onChange={(e) => setW({ ...w, locatie: e.target.value })}
        />
        <button
          type="button"
          className={knopHoofd}
          disabled={!w.email || !begint || Number.isNaN(begint.getTime())}
          onClick={() =>
            stuur(
              [
                {
                  klant_email: w.email.trim().toLowerCase(),
                  klant_naam: w.naam || null,
                  begint_op: begint!.toISOString(),
                  omschrijving: w.omschrijving || null,
                  locatie: w.locatie || null,
                },
              ],
              "handmatig",
            )
          }
        >
          Toevoegen
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={knopRand} onClick={() => invoer.current?.click()}>
          <FileUp className="size-3.5" /> Of een lijst (naam, e-mail, datum en tijd)
        </button>
        <input
          ref={invoer}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={async (e) => {
            const b = e.target.files?.[0];
            if (b) setRijen(await leesBestand(b));
            e.target.value = "";
          }}
        />
        {rijen.length > 0 && (
          <button
            type="button"
            className={knopHoofd}
            disabled={gelezen.length === 0}
            onClick={() => stuur(gelezen, "bestand")}
          >
            {gelezen.length} afspraken toevoegen
          </button>
        )}
        {melding && <span className="text-[12px] text-ink/60">{melding}</span>}
      </div>
    </section>
  );
}

function Rij({
  a,
  agentId,
  alleenLezen,
  voorbij = false,
}: {
  a: Afspraak;
  agentId: string;
  alleenLezen: boolean;
  voorbij?: boolean;
}) {
  const qc = useQueryClient();
  const statusFn = useServerFn(zetAfspraakStatus);
  const wegFn = useServerFn(verwijderAfspraak);
  const [bezig, setBezig] = useState(false);
  const st = STATUS[a.status];
  async function zet(status: Afspraak["status"]) {
    setBezig(true);
    try {
      await statusFn({ data: { id: a.id, agentId, status } });
      await qc.invalidateQueries({ queryKey: ["afspraken", agentId] });
    } finally {
      setBezig(false);
    }
  }
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink/90">
          {moment(a.begint_op)}{" "}
          <span className="font-normal text-ink/60">· {a.klant_naam || a.klant_email}</span>
        </p>
        <p className="text-[11.5px] text-ink/45">
          {[a.omschrijving, a.locatie, a.klant_naam ? a.klant_email : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {a.herinnerd.length > 0 && (
          <p className="text-[11.5px] text-ink/40">
            herinnerd: {a.herinnerd.map((u) => `${u}u`).join(", ")}
          </p>
        )}
        {a.laatste_reactie && (
          <p
            className="mt-1 max-w-[48ch] truncate text-[11.5px] text-amber-200"
            title={a.laatste_reactie}
          >
            antwoordde: {a.laatste_reactie}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st.kleur}`}>
          {st.label}
        </span>
        {!alleenLezen && !voorbij && a.status !== "bevestigd" && a.status !== "geannuleerd" && (
          <button
            type="button"
            className={knopRand}
            disabled={bezig}
            onClick={() => zet("bevestigd")}
            title="Bevestigd (bijv. telefonisch)"
          >
            <Check className="size-3.5" />
          </button>
        )}
        {!alleenLezen && !voorbij && a.status !== "geannuleerd" && (
          <button
            type="button"
            className={knopRand}
            disabled={bezig}
            onClick={() => zet("geannuleerd")}
            title="Annuleren"
          >
            <X className="size-3.5" />
          </button>
        )}
        {!alleenLezen && voorbij && a.status !== "afgerond" && a.status !== "geannuleerd" && (
          <button
            type="button"
            className={knopRand}
            disabled={bezig}
            onClick={() => zet("afgerond")}
          >
            <Check className="size-3.5" /> Geweest
          </button>
        )}
        {!alleenLezen && voorbij && a.status !== "no_show" && a.status !== "geannuleerd" && (
          <button
            type="button"
            className={knopRand}
            disabled={bezig}
            onClick={() => zet("no_show")}
          >
            <UserX className="size-3.5" /> No-show
          </button>
        )}
        {!alleenLezen && (
          <button
            type="button"
            className={knopRand}
            disabled={bezig}
            onClick={async () => {
              if (!window.confirm("Afspraak verwijderen?")) return;
              await wegFn({ data: { id: a.id, agentId } });
              await qc.invalidateQueries({ queryKey: ["afspraken", agentId] });
            }}
            title="Verwijderen"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function Wachtlijst({
  agentId,
  lijst,
  alleenLezen,
}: {
  agentId: string;
  lijst: Wachtende[];
  alleenLezen: boolean;
}) {
  const qc = useQueryClient();
  const toevoegFn = useServerFn(zetOpWachtlijst);
  const statusFn = useServerFn(zetWachtlijstStatus);
  const [w, setW] = useState({ naam: "", email: "", voorkeur: "" });
  const actief = lijst.filter((x) => x.status === "wacht" || x.status === "aangeboden");
  return (
    <section className="card-glass-lg rounded-3xl p-5">
      <h2 className="font-display text-[15px] font-semibold text-brand">
        Wachtlijst ({actief.length})
      </h2>
      <p className="mt-1 text-[12px]/[1.6] text-ink/55">
        Zegt iemand af, dan biedt de agent de plek aan de eerste op de lijst aan (als de wachtlijst
        aanstaat).
      </p>
      {!alleenLezen && (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            className={veld}
            placeholder="Naam"
            value={w.naam}
            onChange={(e) => setW({ ...w, naam: e.target.value })}
          />
          <input
            className={veld}
            placeholder="E-mail"
            value={w.email}
            onChange={(e) => setW({ ...w, email: e.target.value })}
          />
          <input
            className={veld}
            placeholder="Voorkeur, bijv. ochtenden"
            value={w.voorkeur}
            onChange={(e) => setW({ ...w, voorkeur: e.target.value })}
          />
          <button
            type="button"
            className={knopHoofd}
            disabled={!w.email}
            onClick={async () => {
              await toevoegFn({
                data: {
                  agentId,
                  naam: w.naam || null,
                  email: w.email.trim().toLowerCase(),
                  voorkeur: w.voorkeur || null,
                },
              });
              setW({ naam: "", email: "", voorkeur: "" });
              await qc.invalidateQueries({ queryKey: ["afspraken", agentId] });
            }}
          >
            Op de lijst
          </button>
        </div>
      )}
      {actief.length > 0 && (
        <div className="mt-3 grid gap-1.5">
          {actief.map((x) => (
            <div
              key={x.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-[12.5px]"
            >
              <span className="text-ink/85">
                {x.naam || x.email}
                {x.voorkeur && <span className="text-ink/45"> · {x.voorkeur}</span>}
                {x.status === "aangeboden" && (
                  <span className="ml-2 rounded-full border border-amber-400/35 px-2 py-0.5 text-[11px] text-amber-300">
                    plek aangeboden
                  </span>
                )}
              </span>
              {!alleenLezen && (
                <span className="flex gap-1.5">
                  <button
                    type="button"
                    className={knopRand}
                    onClick={async () => {
                      await statusFn({ data: { id: x.id, agentId, status: "geplaatst" } });
                      await qc.invalidateQueries({ queryKey: ["afspraken", agentId] });
                    }}
                  >
                    Geplaatst
                  </button>
                  <button
                    type="button"
                    className={knopRand}
                    onClick={async () => {
                      await statusFn({ data: { id: x.id, agentId, status: "vervallen" } });
                      await qc.invalidateQueries({ queryKey: ["afspraken", agentId] });
                    }}
                  >
                    Van de lijst
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
