import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Check, FileText, RotateCcw, Send, ThumbsDown, X } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { useMeekijken } from "@/hooks/use-meekijken";
import { getMe, listAgents } from "@/lib/dashboard.functions";
import { euroTekst } from "@/lib/prijsimport";
import type { Offerteregel } from "@/lib/offerte-regels";
import {
  besluitAanvraag,
  bewaarOfferteAfzender,
  haalAanvragen,
  nieuweAanvraag,
  stelOfferteOpnieuwOp,
  verstuurOfferteVanuitPortaal,
  type OfferteAanvraag,
  type OfferteCijfers,
} from "@/lib/offerte.functions";

export const Route = createFileRoute("/_authenticated/aanvragen")({
  head: () => ({
    meta: [
      { title: "Aanvragen — Zakelijke AI Agents klantportaal" },
      { name: "description", content: "Offerteaanvragen en concept-offertes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AanvragenPagina,
});

const veld =
  "w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink/35 focus:border-violet/55";
const knopHoofd =
  "inline-flex items-center gap-1.5 rounded-full bg-violet px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-violet/85 disabled:opacity-50";
const knopRand =
  "inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3.5 py-2 text-[12.5px] font-semibold text-ink/80 transition hover:border-violet/40 hover:text-ink disabled:opacity-50";

const wanneer = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const STATUS: Record<OfferteAanvraag["status"], { label: string; kleur: string }> = {
  nieuw: { label: "Nieuw", kleur: "border-white/15 bg-white/5 text-ink/70" },
  bezig: { label: "Wordt opgesteld", kleur: "border-white/15 bg-white/5 text-ink/70" },
  concept: { label: "Concept", kleur: "border-violet/35 bg-violet/12 text-violet" },
  mens_nodig: {
    label: "Jij bent nodig",
    kleur: "border-amber-400/35 bg-amber-400/12 text-amber-300",
  },
  verstuurd: { label: "Verstuurd", kleur: "border-mint/30 bg-mint/12 text-mint" },
  geaccepteerd: {
    label: "Geaccepteerd",
    kleur: "border-emerald-400/35 bg-emerald-400/12 text-emerald-300",
  },
  afgewezen: { label: "Afgewezen", kleur: "border-white/15 bg-white/5 text-ink/60" },
  zelf: { label: "Zelf afgehandeld", kleur: "border-white/15 bg-white/5 text-ink/60" },
  mislukt: { label: "Mislukt", kleur: "border-warn/35 bg-warn/10 text-ink/85" },
};

type Tab = "open" | "verstuurd" | "afgerond";

function AanvragenPagina() {
  const meFn = useServerFn(getMe);
  const agentsFn = useServerFn(listAgents);
  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: () => agentsFn() });
  const meekijken = useMeekijken();
  const alleenLezen = !!meekijken.data;

  const agents = (
    (agentsQuery.data ?? []) as Array<{ id: string; name: string; kind: string }>
  ).filter((a) => a.kind === "offerte");
  const [gekozen, setGekozen] = useState<string | null>(null);
  const agentId = gekozen ?? agents[0]?.id ?? null;

  const fn = useServerFn(haalAanvragen);
  const query = useQuery({
    queryKey: ["aanvragen", agentId],
    queryFn: () => fn({ data: { agentId: agentId! } }),
    enabled: agentId !== null,
    // Een concept is soms pas na een paar seconden klaar.
    refetchInterval: 20_000,
  });

  const [tab, setTab] = useState<Tab>("open");
  const alles = query.data?.aanvragen ?? [];
  const perTab: Record<Tab, OfferteAanvraag[]> = {
    open: alles.filter((a) =>
      ["nieuw", "bezig", "concept", "mens_nodig", "mislukt"].includes(a.status),
    ),
    verstuurd: alles.filter((a) => a.status === "verstuurd"),
    afgerond: alles.filter((a) => ["geaccepteerd", "afgewezen", "zelf"].includes(a.status)),
  };

  return (
    <DashboardShell isAdmin={meQuery.data?.isAdmin === true} userName={meQuery.data?.name}>
      <div className="grid gap-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[22px] font-bold text-brand">Aanvragen</h1>
            <p className="mt-1.5 max-w-[70ch] text-[13px]/[1.7] text-ink/60">
              Elke aanvraag wordt binnen minuten een concept-offerte, opgebouwd uit je{" "}
              <Link to="/knowledge" className="text-violet underline-offset-2 hover:underline">
                prijslijst
              </Link>
              . Elk bedrag komt daar letterlijk uit; staat iets er niet in, dan noemt hij geen prijs
              en ben jij aan de beurt.
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
            Je hebt nog geen offerte-agent.
          </div>
        )}

        {query.data && !query.data.beschikbaar && (
          <div className="card-glass-lg rounded-3xl p-6 text-[13px] text-ink/60">
            De offerte-agent wordt op dit moment ingericht. Kom straks terug.
          </div>
        )}

        {query.data?.beschikbaar && agentId && (
          <>
            <Cijfers cijfers={query.data.cijfers} />
            <Instellingen
              agentId={agentId}
              afzender={query.data.afzender}
              aanvraagAdres={query.data.aanvraagAdres}
              modus={query.data.modus}
              maxDirect={query.data.maxDirect}
              alleenLezen={alleenLezen}
            />
            <Handmatig agentId={agentId} alleenLezen={alleenLezen} />

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["open", "Te doen"],
                  ["verstuurd", "Verstuurd"],
                  ["afgerond", "Afgerond"],
                ] as Array<[Tab, string]>
              ).map(([t, label]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition ${
                    tab === t
                      ? "bg-brand text-primary-foreground"
                      : "border border-white/12 bg-white/5 text-ink/70 hover:text-ink"
                  }`}
                >
                  {label} ({perTab[t].length})
                </button>
              ))}
            </div>

            {perTab[tab].length === 0 && (
              <p className="text-[13px] text-ink/50">
                {tab === "open"
                  ? "Niets te doen. Zodra er een aanvraag binnenkomt, staat hij hier."
                  : "Nog niets."}
              </p>
            )}
            <div className="grid gap-3">
              {perTab[tab].map((a) => (
                <Kaart key={a.id} a={a} agentId={agentId} alleenLezen={alleenLezen} />
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function Cijfers({ cijfers }: { cijfers: OfferteCijfers | null }) {
  if (!cijfers) return null;
  const tegels: Array<[string, string]> = [
    [String(cijfers.aanvragen), "aanvragen in 30 dagen"],
    [
      cijfers.reactie_minuten != null ? `${cijfers.reactie_minuten} min` : "—",
      "tot er een concept stond",
    ],
    [String(cijfers.verstuurd), "offertes verstuurd"],
    [
      cijfers.verstuurd > 0
        ? `${Math.round((cijfers.geaccepteerd / cijfers.verstuurd) * 100)}%`
        : "—",
      `geaccepteerd (${cijfers.geaccepteerd})`,
    ],
    [cijfers.omzet > 0 ? euroTekst(cijfers.omzet) : "—", "geaccepteerde offertes samen"],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {tegels.map(([w, l]) => (
        <div key={l} className="card-glass rounded-2xl px-4 py-3.5">
          <p className="font-display text-[22px] leading-none font-bold text-brand tabular-nums">
            {w}
          </p>
          <p className="mt-1.5 text-[11.5px] text-ink/50">{l}</p>
        </div>
      ))}
    </div>
  );
}

function Instellingen({
  agentId,
  afzender,
  aanvraagAdres,
  modus,
  maxDirect,
  alleenLezen,
}: {
  agentId: string;
  afzender: {
    afzender_naam: string | null;
    afzender_email: string | null;
    ondertekening: string | null;
  };
  aanvraagAdres: string | null;
  modus: "concept" | "direct";
  maxDirect: number | null;
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
      await qc.invalidateQueries({ queryKey: ["aanvragen", agentId] });
    } catch (e) {
      setMelding(e instanceof Error ? e.message : "Dat lukte niet");
    }
  }

  return (
    <section className="card-glass-lg rounded-3xl p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[12.5px] font-semibold text-ink/85">Hoe aanvragen binnenkomen</p>
          <p className="mt-1 text-[12px]/[1.6] text-ink/55">
            {aanvraagAdres ? (
              <>
                Stuur aanvragen door naar{" "}
                <strong className="font-semibold text-ink/85">{aanvraagAdres}</strong>, of zet dat
                adres achter het offerteformulier op je site. Je kunt een aanvraag ook hieronder
                zelf invoeren.
              </>
            ) : (
              "Wij geven je het adres waar aanvragen naartoe gaan. Tot die tijd kun je ze hieronder zelf invoeren."
            )}
          </p>
        </div>
        <div>
          <p className="text-[12.5px] font-semibold text-ink/85">Wat er vanzelf gebeurt</p>
          <p className="mt-1 text-[12px]/[1.6] text-ink/55">
            {modus === "direct" && maxDirect
              ? `Offertes onder ${euroTekst(maxDirect)} gaan direct de deur uit als alles duidelijk is; de rest wacht op jou.`
              : "Elke offerte wacht op jou. Direct versturen zet je aan bij de instellingen van de agent, met een maximumbedrag."}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="mt-3 text-[12px] font-medium text-violet hover:underline"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Afzender verbergen" : "Afzender en ondertekening"}
      </button>
      {open && (
        <div className="mt-2 grid gap-2">
          <input
            className={veld}
            placeholder="Naam afzender, bijv. FJ Snacks"
            value={w.afzender_naam ?? ""}
            disabled={alleenLezen}
            onChange={(e) => setW({ ...w, afzender_naam: e.target.value })}
          />
          <input
            className={veld}
            placeholder="Adres waarvandaan offertes vertrekken"
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

function Handmatig({ agentId, alleenLezen }: { agentId: string; alleenLezen: boolean }) {
  const qc = useQueryClient();
  const fn = useServerFn(nieuweAanvraag);
  const [open, setOpen] = useState(false);
  const [w, setW] = useState({ vanEmail: "", vanNaam: "", bedrijf: "", vraag: "" });
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  async function voerIn() {
    setBezig(true);
    setMelding(null);
    try {
      await fn({
        data: {
          agentId,
          vanEmail: w.vanEmail,
          vanNaam: w.vanNaam || null,
          bedrijf: w.bedrijf || null,
          vraag: w.vraag,
        },
      });
      setW({ vanEmail: "", vanNaam: "", bedrijf: "", vraag: "" });
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["aanvragen", agentId] });
    } catch (e) {
      setMelding(e instanceof Error ? e.message : "Dat lukte niet");
    } finally {
      setBezig(false);
    }
  }

  if (!open) {
    return (
      <div>
        <button
          type="button"
          className={knopRand}
          disabled={alleenLezen}
          onClick={() => setOpen(true)}
        >
          <FileText className="size-3.5" /> Aanvraag zelf invoeren
        </button>
      </div>
    );
  }
  return (
    <section className="card-glass-lg rounded-3xl p-5">
      <p className="text-[12.5px] font-semibold text-ink/85">Een aanvraag invoeren</p>
      <p className="mt-1 text-[12px]/[1.6] text-ink/55">
        Iemand belde of appte? Schrijf op wat er gevraagd is; de agent maakt er een concept van.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <input
          className={veld}
          placeholder="E-mailadres van de aanvrager"
          value={w.vanEmail}
          onChange={(e) => setW({ ...w, vanEmail: e.target.value })}
        />
        <input
          className={veld}
          placeholder="Naam (optioneel)"
          value={w.vanNaam}
          onChange={(e) => setW({ ...w, vanNaam: e.target.value })}
        />
        <input
          className={veld}
          placeholder="Bedrijf (optioneel)"
          value={w.bedrijf}
          onChange={(e) => setW({ ...w, bedrijf: e.target.value })}
        />
      </div>
      <textarea
        className={`${veld} mt-2 min-h-[90px]`}
        placeholder="Wat is er gevraagd? Bijvoorbeeld: 200 kipsaté op rondstok voor zaterdag, bezorgen in Haarlem."
        value={w.vraag}
        onChange={(e) => setW({ ...w, vraag: e.target.value })}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={knopHoofd}
          disabled={bezig || !w.vanEmail || w.vraag.trim().length < 5}
          onClick={voerIn}
        >
          {bezig ? "Bezig…" : "Concept laten maken"}
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
  a,
  agentId,
  alleenLezen,
}: {
  a: OfferteAanvraag;
  agentId: string;
  alleenLezen: boolean;
}) {
  const qc = useQueryClient();
  const verstuurFn = useServerFn(verstuurOfferteVanuitPortaal);
  const besluitFn = useServerFn(besluitAanvraag);
  const opnieuwFn = useServerFn(stelOfferteOpnieuwOp);

  const [onderwerp, setOnderwerp] = useState(a.concept_onderwerp ?? `Offerte`);
  const [tekst, setTekst] = useState(a.concept_tekst ?? "");
  const [regels, setRegels] = useState<Offerteregel[]>(a.regels ?? []);
  const [bezig, setBezig] = useState<string | null>(null);
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string } | null>(null);
  const [vraagOpen, setVraagOpen] = useState(false);
  useEffect(() => {
    setOnderwerp(a.concept_onderwerp ?? "Offerte");
    setTekst(a.concept_tekst ?? "");
    setRegels(a.regels ?? []);
  }, [a.id, a.concept_onderwerp, a.concept_tekst, a.regels]);

  const st = STATUS[a.status];
  const open = ["nieuw", "concept", "mens_nodig", "mislukt"].includes(a.status);
  const totaal = Math.round(regels.reduce((s, r) => s + r.bedrag, 0) * 100) / 100;

  async function doe(naam: string, werk: () => Promise<unknown>, gelukt: string) {
    setBezig(naam);
    setMelding(null);
    try {
      await werk();
      setMelding({ ok: true, tekst: gelukt });
      await qc.invalidateQueries({ queryKey: ["aanvragen", agentId] });
    } catch (e) {
      setMelding({ ok: false, tekst: e instanceof Error ? e.message : "Dat lukte niet" });
    } finally {
      setBezig(null);
    }
  }

  // Aantallen aanpassen mag; prijzen niet. Die komen uit de prijslijst, en
  // dat is precies de belofte van deze agent.
  function zetAantal(i: number, aantal: number) {
    setRegels((rs) =>
      rs.map((r, j) =>
        j === i ? { ...r, aantal, bedrag: Math.round(aantal * r.prijs * 100) / 100 } : r,
      ),
    );
  }

  return (
    <article className="card-glass-lg rounded-3xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-ink/90">
            {a.van_naam || a.van_email}
            {a.bedrijf && <span className="font-normal text-ink/60"> · {a.bedrijf}</span>}
            {a.van_naam && <span className="font-normal text-ink/50"> · {a.van_email}</span>}
          </p>
          <p className="mt-0.5 text-[12.5px] text-ink/65">{a.onderwerp || "(geen onderwerp)"}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[11.5px] text-ink/45">{wanneer(a.ontvangen_op)}</span>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${st.kleur}`}>
            {st.label}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setVraagOpen((v) => !v)}
        className="mt-3 text-[12px] font-medium text-violet hover:underline"
      >
        {vraagOpen ? "Aanvraag verbergen" : "Aanvraag lezen"}
      </button>
      {vraagOpen && (
        <pre className="mt-2 whitespace-pre-wrap rounded-2xl bg-white/[0.03] p-3 text-[12.5px]/[1.65] text-ink/75">
          {a.vraag}
        </pre>
      )}

      {a.ontbreekt.length > 0 && (
        <div className="mt-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-[12.5px]/[1.6] text-amber-100">
          <p className="font-semibold">Nog uit te zoeken:</p>
          <ul className="mt-1 list-disc pl-5">
            {a.ontbreekt.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </div>
      )}
      {a.toelichting && <p className="mt-2 text-[12px] text-ink/50">{a.toelichting}</p>}
      {a.fout && <p className="mt-2 text-[12px] text-rose-300">{a.fout}</p>}

      {(open || a.status === "verstuurd") && regels.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="text-[11px] uppercase tracking-[0.1em] text-ink/45">
              <tr>
                <th className="py-1.5 text-left font-semibold">Omschrijving</th>
                <th className="py-1.5 text-right font-semibold">Aantal</th>
                <th className="py-1.5 text-right font-semibold">Prijs</th>
                <th className="py-1.5 text-right font-semibold">Bedrag</th>
                {open && <th />}
              </tr>
            </thead>
            <tbody>
              {regels.map((r, i) => (
                <tr key={i} className="border-t border-white/8">
                  <td className="py-2 pr-3 text-ink/85">
                    {r.omschrijving}
                    {r.opmerking && (
                      <span className="block text-[11.5px] text-ink/45">{r.opmerking}</span>
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {open && !alleenLezen ? (
                      <input
                        type="number"
                        min={0.01}
                        step="any"
                        value={r.aantal}
                        onChange={(e) => zetAantal(i, Number(e.target.value) || 0)}
                        className="w-20 rounded-lg border border-white/12 bg-white/[0.04] px-2 py-1 text-right text-[12.5px] text-ink outline-none focus:border-violet/55"
                      />
                    ) : (
                      r.aantal
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums text-ink/70">
                    {euroTekst(r.prijs)}
                    {r.eenheid && <span className="text-ink/40"> {r.eenheid}</span>}
                  </td>
                  <td className="py-2 text-right tabular-nums text-ink/85">
                    {euroTekst(r.bedrag)}
                  </td>
                  {open && (
                    <td className="py-2 pl-2 text-right">
                      {!alleenLezen && (
                        <button
                          type="button"
                          onClick={() => setRegels((rs) => rs.filter((_, j) => j !== i))}
                          className="text-ink/35 hover:text-ink/70"
                          title="Regel weghalen"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/12">
                <td colSpan={3} className="py-2 text-right text-[12px] font-semibold text-ink/70">
                  Totaal
                </td>
                <td className="py-2 text-right font-semibold tabular-nums text-brand">
                  {euroTekst(totaal)}
                </td>
                {open && <td />}
              </tr>
            </tfoot>
          </table>
          {a.geldig_tot && (
            <p className="mt-1 text-[11.5px] text-ink/45">
              Geldig tot{" "}
              {new Date(a.geldig_tot).toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "long",
              })}
            </p>
          )}
        </div>
      )}

      {open && (
        <div className="mt-3 grid gap-2">
          <input
            className={veld}
            value={onderwerp}
            disabled={alleenLezen}
            onChange={(e) => setOnderwerp(e.target.value)}
          />
          <textarea
            className={`${veld} min-h-[140px]`}
            value={tekst}
            disabled={alleenLezen}
            onChange={(e) => setTekst(e.target.value)}
            placeholder="De begeleidende tekst. De regels en het totaal komen er automatisch onder."
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={knopHoofd}
              disabled={alleenLezen || bezig !== null || regels.length === 0 || !tekst.trim()}
              onClick={() =>
                doe(
                  "versturen",
                  () => verstuurFn({ data: { id: a.id, onderwerp, tekst, regels } }),
                  "Verstuurd.",
                )
              }
            >
              <Send className="size-3.5" /> {bezig === "versturen" ? "Bezig…" : "Offerte versturen"}
            </button>
            <button
              type="button"
              className={knopRand}
              disabled={alleenLezen || bezig !== null}
              onClick={() =>
                doe("opnieuw", () => opnieuwFn({ data: { id: a.id } }), "Opnieuw opgesteld.")
              }
            >
              <RotateCcw className="size-3.5" /> Opnieuw opstellen
            </button>
            <button
              type="button"
              className={knopRand}
              disabled={alleenLezen || bezig !== null}
              onClick={() =>
                doe(
                  "zelf",
                  () => besluitFn({ data: { id: a.id, besluit: "zelf" } }),
                  "Als zelf afgehandeld gemarkeerd.",
                )
              }
            >
              <Check className="size-3.5" /> Zelf afgehandeld
            </button>
          </div>
        </div>
      )}

      {a.status === "verstuurd" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="mr-2 text-[12px] text-ink/50">
            Verstuurd {a.verzonden_op ? wanneer(a.verzonden_op) : ""}. Wat zei de klant?
          </p>
          <button
            type="button"
            className={knopRand}
            disabled={alleenLezen || bezig !== null}
            onClick={() =>
              doe(
                "ja",
                () => besluitFn({ data: { id: a.id, besluit: "geaccepteerd" } }),
                "Geaccepteerd — mooi.",
              )
            }
          >
            <Check className="size-3.5" /> Geaccepteerd
          </button>
          <button
            type="button"
            className={knopRand}
            disabled={alleenLezen || bezig !== null}
            onClick={() =>
              doe(
                "nee",
                () => besluitFn({ data: { id: a.id, besluit: "afgewezen" } }),
                "Als afgewezen gemarkeerd.",
              )
            }
          >
            <ThumbsDown className="size-3.5" /> Afgewezen
          </button>
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
