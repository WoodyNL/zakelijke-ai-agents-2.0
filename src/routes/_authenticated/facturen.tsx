import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, FileUp, Hand, Pause, Play, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { leesBestand } from "@/components/bestand-lezen";
import { useMeekijken } from "@/hooks/use-meekijken";
import { getMe, listAgents } from "@/lib/dashboard.functions";
import { euroTekst } from "@/lib/prijsimport";
import { dagenTeLaat } from "@/lib/herinneringen";
import { leesFacturen, raadFactuurkolommen, type Factuurkolom } from "@/lib/factuurimport";
import { bewaarOfferteAfzender } from "@/lib/offerte.functions";
import {
  haalFacturen,
  importeerFacturen,
  nieuweFactuur,
  verwijderFactuur,
  zetFactuurStatus,
  type Factuur,
  type FactuurCijfers,
} from "@/lib/facturen.functions";

export const Route = createFileRoute("/_authenticated/facturen")({
  head: () => ({
    meta: [
      { title: "Facturen — Zakelijke AI Agents klantportaal" },
      { name: "description", content: "Openstaande facturen en betaalherinneringen." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FacturenPagina,
});

const veld =
  "w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink/35 focus:border-violet/55";
const knopHoofd =
  "inline-flex items-center gap-1.5 rounded-full bg-violet px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-violet/85 disabled:opacity-50";
const knopRand =
  "inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-ink/80 transition hover:border-violet/40 hover:text-ink disabled:opacity-50";

const datum = (iso: string) =>
  new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });

const STATUS: Record<Factuur["status"], { label: string; kleur: string }> = {
  open: { label: "Open", kleur: "border-violet/35 bg-violet/12 text-violet" },
  betaald: { label: "Betaald", kleur: "border-mint/30 bg-mint/12 text-mint" },
  gepauzeerd: { label: "Gepauzeerd", kleur: "border-amber-400/35 bg-amber-400/12 text-amber-300" },
  uit_handen: { label: "Uit handen", kleur: "border-white/15 bg-white/5 text-ink/60" },
};

const KOLOMNAAM: Record<Factuurkolom, string> = {
  nummer: "Factuurnummer",
  klant: "Klant",
  email: "E-mail",
  bedrag: "Bedrag",
  factuurdatum: "Factuurdatum",
  vervaldatum: "Vervaldatum",
  betaald: "Betaald op",
  negeren: "— overslaan —",
};

type Tab = "open" | "betaald" | "overig";

function FacturenPagina() {
  const meFn = useServerFn(getMe);
  const agentsFn = useServerFn(listAgents);
  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: () => agentsFn() });
  const meekijken = useMeekijken();
  const alleenLezen = !!meekijken.data;

  const agents = (
    (agentsQuery.data ?? []) as Array<{ id: string; name: string; kind: string }>
  ).filter((a) => a.kind === "betaalherinnering");
  const [gekozen, setGekozen] = useState<string | null>(null);
  const agentId = gekozen ?? agents[0]?.id ?? null;

  const fn = useServerFn(haalFacturen);
  const query = useQuery({
    queryKey: ["facturen", agentId],
    queryFn: () => fn({ data: { agentId: agentId! } }),
    enabled: agentId !== null,
  });

  const [tab, setTab] = useState<Tab>("open");
  const alles = query.data?.facturen ?? [];
  const perTab: Record<Tab, Factuur[]> = {
    open: alles.filter((f) => f.status === "open" || f.status === "gepauzeerd"),
    betaald: alles.filter((f) => f.status === "betaald"),
    overig: alles.filter((f) => f.status === "uit_handen"),
  };
  const logPerFactuur = useMemo(() => {
    const m = new Map<string, Array<{ stap: number; moment: number; verstuurd_op: string }>>();
    for (const h of query.data?.herinneringen ?? []) {
      const l = m.get(h.factuur_id) ?? [];
      l.push(h);
      m.set(h.factuur_id, l);
    }
    return m;
  }, [query.data?.herinneringen]);

  return (
    <DashboardShell isAdmin={meQuery.data?.isAdmin === true} userName={meQuery.data?.name}>
      <div className="grid gap-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[22px] font-bold text-brand">Facturen</h1>
            <p className="mt-1.5 max-w-[70ch] text-[13px]/[1.7] text-ink/60">
              De agent herinnert op de momenten die jij instelde, in een toon die per stap
              zakelijker wordt, en stopt zodra er betaald is of iemand antwoordt. Hij dreigt nooit;
              de laatste stap is altijd dat jij het overneemt.
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
            Je hebt nog geen betaalherinnering-agent.
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
            <Uitleg
              momenten={query.data.momenten}
              max={query.data.max}
              koppeling={query.data.koppeling}
              antwoordAdres={query.data.antwoordAdres}
            />
            <Afzender agentId={agentId} afzender={query.data.afzender} alleenLezen={alleenLezen} />
            {!alleenLezen && <Inlezen agentId={agentId} />}
            {!alleenLezen && <Handmatig agentId={agentId} />}

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["open", "Open"],
                  ["betaald", "Betaald"],
                  ["overig", "Uit handen"],
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
            {perTab[tab].length > 0 && (
              <div className="card-glass-lg overflow-x-auto rounded-3xl p-2">
                <table className="w-full text-[12.5px]">
                  <thead className="text-[11px] uppercase tracking-[0.1em] text-ink/45">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Factuur</th>
                      <th className="px-3 py-2 text-left font-semibold">Klant</th>
                      <th className="px-3 py-2 text-right font-semibold">Bedrag</th>
                      <th className="px-3 py-2 text-left font-semibold">Vervalt</th>
                      <th className="px-3 py-2 text-left font-semibold">Herinnerd</th>
                      <th className="px-3 py-2 text-left font-semibold">Status</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {perTab[tab].map((f) => (
                      <Rij
                        key={f.id}
                        f={f}
                        agentId={agentId}
                        log={logPerFactuur.get(f.id) ?? []}
                        alleenLezen={alleenLezen}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function Cijfers({ cijfers }: { cijfers: FactuurCijfers | null }) {
  if (!cijfers) return null;
  const tegels: Array<[string, string]> = [
    [euroTekst(cijfers.open_bedrag), `openstaand (${cijfers.open_aantal})`],
    [euroTekst(cijfers.over_termijn_bedrag), `over de termijn (${cijfers.over_termijn_aantal})`],
    [String(cijfers.herinnerd), "herinneringen in 30 dagen"],
    [
      cijfers.betaald > 0 ? `${cijfers.betaald_na_herinnering} van ${cijfers.betaald}` : "—",
      "betaald binnen 7 dagen na een herinnering",
    ],
    [
      cijfers.betaaltermijn_dagen != null ? `${cijfers.betaaltermijn_dagen} dagen` : "—",
      "gemiddelde betaaltermijn",
    ],
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

function Uitleg({
  momenten,
  max,
  koppeling,
  antwoordAdres,
}: {
  momenten: string[];
  max: number;
  koppeling: boolean;
  antwoordAdres: string | null;
}) {
  const reeks = momenten.slice(0, max).map((m) => {
    const n = Number(m);
    return n < 0
      ? `${-n} dagen vóór de vervaldatum`
      : n === 0
        ? "op de vervaldatum"
        : `${n} dagen erna`;
  });
  return (
    <section className="card-glass-lg rounded-3xl p-5 text-[12.5px]/[1.65] text-ink/65">
      <p>
        <strong className="text-ink/85">De reeks:</strong> {reeks.join(" · ")}. Aanpassen kan bij de
        instellingen van de agent.
      </p>
      {!koppeling && (
        <p className="mt-1.5">
          <strong className="text-ink/85">Zonder boekhoudkoppeling</strong> weet de agent alleen wat
          jij hem vertelt. Daarom gaan de eerste twee herinneringen vanzelf, en de latere alleen als
          je lijst de afgelopen week is ververst — een herinnering voor een betaalde factuur mag
          nooit. Lees dus wekelijks je export in, of markeer betalingen hieronder.
        </p>
      )}
      {antwoordAdres && (
        <p className="mt-1.5">
          Antwoorden van debiteuren komen binnen op{" "}
          <strong className="text-ink/85">{antwoordAdres}</strong>; de agent pauzeert dan een week
          en jij krijgt het antwoord.
        </p>
      )}
    </section>
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
      await qc.invalidateQueries({ queryKey: ["facturen", agentId] });
    } catch (e) {
      setMelding(e instanceof Error ? e.message : "Dat lukte niet");
    }
  }
  return (
    <section className="card-glass-lg rounded-3xl p-5">
      {!afzender.afzender_email && (
        <p className="mb-2 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] px-3 py-2 text-[12px] text-amber-100">
          Zonder afzenderadres verstuurt de agent niets. Vul het hieronder in.
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
            placeholder="Naam afzender, bijv. Administratie FJ Snacks"
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
            className={`${veld} min-h-[70px]`}
            placeholder={"Met vriendelijke groet,\nFrank — FJ Snacks"}
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

function Inlezen({ agentId }: { agentId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(importeerFacturen);
  const invoer = useRef<HTMLInputElement>(null);
  const [rijen, setRijen] = useState<string[][]>([]);
  const [kolommen, setKolommen] = useState<Factuurkolom[]>([]);
  const [kop, setKop] = useState(true);
  const [naam, setNaam] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [uitkomst, setUitkomst] = useState<string | null>(null);

  const gelezen = useMemo(
    () => (rijen.length ? leesFacturen(rijen, kolommen, kop) : { facturen: [], overgeslagen: [] }),
    [rijen, kolommen, kop],
  );

  async function kies(b: File) {
    setFout(null);
    setUitkomst(null);
    try {
      const r = await leesBestand(b);
      if (r.length === 0) return setFout("Dit bestand bevat geen rijen.");
      setRijen(r);
      setKolommen(raadFactuurkolommen(r, true));
      setKop(true);
      setNaam(b.name);
    } catch (e) {
      setFout(e instanceof Error ? e.message : "Dit bestand kon niet gelezen worden.");
    }
  }
  async function opslaan() {
    setBezig(true);
    setFout(null);
    try {
      const r = await fn({ data: { agentId, facturen: gelezen.facturen } });
      setUitkomst(
        `${r.verwerkt} facturen ingelezen${r.betaald ? `, waarvan ${r.betaald} al betaald` : ""}.`,
      );
      setRijen([]);
      await qc.invalidateQueries({ queryKey: ["facturen", agentId] });
    } catch (e) {
      setFout(e instanceof Error ? e.message : "Opslaan mislukte");
    } finally {
      setBezig(false);
    }
  }

  return (
    <section className="card-glass-lg rounded-3xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[12.5px] font-semibold text-ink/85">Openstaande facturen inlezen</p>
          <p className="mt-0.5 text-[12px]/[1.6] text-ink/55">
            Een export uit je boekhoudpakket (.xlsx of .csv). Bestaande nummers worden bijgewerkt;
            wat als betaald in het bestand staat, stopt meteen.
          </p>
        </div>
        <button type="button" className={knopHoofd} onClick={() => invoer.current?.click()}>
          <FileUp className="size-3.5" /> Bestand kiezen
        </button>
        <input
          ref={invoer}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const b = e.target.files?.[0];
            if (b) void kies(b);
            e.target.value = "";
          }}
        />
      </div>
      {fout && <p className="mt-3 text-[12px] text-rose-300">{fout}</p>}
      {uitkomst && <p className="mt-3 text-[12px] text-mint">{uitkomst}</p>}

      {rijen.length > 0 && (
        <div className="mt-4">
          <p className="text-[12px] text-ink/55">
            {naam}: {rijen.length} rijen. Controleer de kolommen:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {kolommen.map((k, i) => (
              <label key={i} className="text-[11.5px] text-ink/55">
                <span className="block truncate max-w-[140px]">
                  {kop ? rijen[0]?.[i] || `kolom ${i + 1}` : `kolom ${i + 1}`}
                </span>
                <select
                  className={`${veld} mt-0.5 py-1`}
                  value={k}
                  onChange={(e) =>
                    setKolommen(
                      kolommen.map((x, j) => (j === i ? (e.target.value as Factuurkolom) : x)),
                    )
                  }
                >
                  {(Object.keys(KOLOMNAAM) as Factuurkolom[]).map((s) => (
                    <option key={s} value={s} className="bg-[#12121a]">
                      {KOLOMNAAM[s]}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-[12px] text-ink/60">
            <input
              type="checkbox"
              className="accent-violet"
              checked={kop}
              onChange={(e) => setKop(e.target.checked)}
            />{" "}
            De eerste rij is een kopregel
          </label>
          <p className="mt-3 text-[12.5px] text-ink/80">
            <strong>{gelezen.facturen.length}</strong> facturen leesbaar, samen{" "}
            {euroTekst(gelezen.facturen.reduce((s, f) => s + f.bedrag, 0))}
            {gelezen.overgeslagen.length > 0 && (
              <span className="text-ink/50"> · {gelezen.overgeslagen.length} overgeslagen</span>
            )}
          </p>
          {gelezen.overgeslagen.slice(0, 5).map((o) => (
            <p key={o.rij} className="text-[11.5px] text-ink/45">
              rij {o.rij}: {o.reden} — {o.inhoud}
            </p>
          ))}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className={knopHoofd}
              disabled={bezig || gelezen.facturen.length === 0}
              onClick={opslaan}
            >
              {bezig ? "Bezig…" : `${gelezen.facturen.length} facturen opslaan`}
            </button>
            <button type="button" className={knopRand} onClick={() => setRijen([])}>
              Annuleren
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Handmatig({ agentId }: { agentId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(nieuweFactuur);
  const [open, setOpen] = useState(false);
  const vandaag = new Date().toISOString().slice(0, 10);
  const over30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const [w, setW] = useState({
    nummer: "",
    klant_naam: "",
    klant_email: "",
    bedrag: "",
    factuurdatum: vandaag,
    vervaldatum: over30,
  });
  const [melding, setMelding] = useState<string | null>(null);
  async function voerIn() {
    setMelding(null);
    try {
      await fn({
        data: {
          agentId,
          factuur: {
            nummer: w.nummer,
            klant_naam: w.klant_naam || null,
            klant_email: w.klant_email,
            bedrag: Number(w.bedrag.replace(",", ".")),
            factuurdatum: w.factuurdatum,
            vervaldatum: w.vervaldatum,
            betaald_op: null,
          },
        },
      });
      setW({ ...w, nummer: "", klant_naam: "", klant_email: "", bedrag: "" });
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["facturen", agentId] });
    } catch (e) {
      setMelding(e instanceof Error ? e.message : "Dat lukte niet");
    }
  }
  if (!open)
    return (
      <div>
        <button type="button" className={knopRand} onClick={() => setOpen(true)}>
          Factuur zelf invoeren
        </button>
      </div>
    );
  return (
    <section className="card-glass-lg rounded-3xl p-5">
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          className={veld}
          placeholder="Factuurnummer"
          value={w.nummer}
          onChange={(e) => setW({ ...w, nummer: e.target.value })}
        />
        <input
          className={veld}
          placeholder="Klant"
          value={w.klant_naam}
          onChange={(e) => setW({ ...w, klant_naam: e.target.value })}
        />
        <input
          className={veld}
          placeholder="E-mail van de klant"
          value={w.klant_email}
          onChange={(e) => setW({ ...w, klant_email: e.target.value })}
        />
        <input
          className={veld}
          placeholder="Bedrag, bijv. 250,00"
          value={w.bedrag}
          onChange={(e) => setW({ ...w, bedrag: e.target.value })}
        />
        <label className="text-[11px] text-ink/50">
          Factuurdatum
          <input
            type="date"
            className={`${veld} mt-0.5`}
            value={w.factuurdatum}
            onChange={(e) => setW({ ...w, factuurdatum: e.target.value })}
          />
        </label>
        <label className="text-[11px] text-ink/50">
          Vervaldatum
          <input
            type="date"
            className={`${veld} mt-0.5`}
            value={w.vervaldatum}
            onChange={(e) => setW({ ...w, vervaldatum: e.target.value })}
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={knopHoofd}
          disabled={!w.nummer || !w.klant_email || !w.bedrag}
          onClick={voerIn}
        >
          Toevoegen
        </button>
        <button type="button" className={knopRand} onClick={() => setOpen(false)}>
          Annuleren
        </button>
        {melding && <span className="text-[12px] text-ink/70">{melding}</span>}
      </div>
    </section>
  );
}

function Rij({
  f,
  agentId,
  log,
  alleenLezen,
}: {
  f: Factuur;
  agentId: string;
  log: Array<{ stap: number; moment: number; verstuurd_op: string }>;
  alleenLezen: boolean;
}) {
  const qc = useQueryClient();
  const statusFn = useServerFn(zetFactuurStatus);
  const wegFn = useServerFn(verwijderFactuur);
  const [bezig, setBezig] = useState(false);
  const teLaat = dagenTeLaat(f.vervaldatum);
  const st = STATUS[f.status];

  async function zet(status: Factuur["status"]) {
    setBezig(true);
    try {
      const tot =
        status === "gepauzeerd"
          ? new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10)
          : null;
      await statusFn({ data: { id: f.id, agentId, status, tot } });
      await qc.invalidateQueries({ queryKey: ["facturen", agentId] });
    } finally {
      setBezig(false);
    }
  }
  async function weg() {
    if (!window.confirm(`Factuur ${f.nummer} uit de lijst halen?`)) return;
    setBezig(true);
    try {
      await wegFn({ data: { id: f.id, agentId } });
      await qc.invalidateQueries({ queryKey: ["facturen", agentId] });
    } finally {
      setBezig(false);
    }
  }

  return (
    <tr className="border-t border-white/8 align-top">
      <td className="px-3 py-2.5">
        <span className="font-semibold text-ink/90">{f.nummer}</span>
        <span className="block text-[11.5px] text-ink/45">{datum(f.factuurdatum)}</span>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-ink/85">{f.klant_naam || f.klant_email}</span>
        {f.klant_naam && <span className="block text-[11.5px] text-ink/45">{f.klant_email}</span>}
        {f.laatste_reactie && (
          <span
            className="mt-1 block max-w-[32ch] truncate text-[11.5px] text-amber-200"
            title={f.laatste_reactie}
          >
            antwoordde: {f.laatste_reactie}
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-ink/85">
        {euroTekst(Number(f.bedrag))}
      </td>
      <td className="px-3 py-2.5">
        {datum(f.vervaldatum)}
        {f.status === "open" && teLaat > 0 && (
          <span className="block text-[11.5px] text-rose-300">{teLaat} dagen te laat</span>
        )}
        {f.status === "gepauzeerd" && f.pauze_tot && (
          <span className="block text-[11.5px] text-amber-300">pauze tot {datum(f.pauze_tot)}</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-[11.5px] text-ink/55">
        {log.length === 0
          ? "nog niet"
          : log.map((h) => (
              <span key={h.stap} className="block">
                stap {h.stap} · {datum(h.verstuurd_op)}
              </span>
            ))}
      </td>
      <td className="px-3 py-2.5">
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st.kleur}`}>
          {st.label}
        </span>
      </td>
      <td className="px-3 py-2.5">
        {!alleenLezen && (
          <div className="flex flex-wrap justify-end gap-1.5">
            {f.status !== "betaald" && (
              <button
                type="button"
                className={knopRand}
                disabled={bezig}
                onClick={() => zet("betaald")}
                title="Betaald"
              >
                <Check className="size-3.5" /> Betaald
              </button>
            )}
            {f.status === "open" && (
              <button
                type="button"
                className={knopRand}
                disabled={bezig}
                onClick={() => zet("gepauzeerd")}
                title="Twee weken pauze"
              >
                <Pause className="size-3.5" />
              </button>
            )}
            {(f.status === "gepauzeerd" || f.status === "uit_handen" || f.status === "betaald") && (
              <button
                type="button"
                className={knopRand}
                disabled={bezig}
                onClick={() => zet("open")}
                title="Reeks hervatten"
              >
                <Play className="size-3.5" />
              </button>
            )}
            {f.status === "open" && (
              <button
                type="button"
                className={knopRand}
                disabled={bezig}
                onClick={() => zet("uit_handen")}
                title="Ik neem het zelf over"
              >
                <Hand className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              className={knopRand}
              disabled={bezig}
              onClick={weg}
              title="Uit de lijst halen"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
