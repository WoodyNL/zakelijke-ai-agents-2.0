import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, FileUp, RotateCcw, Star, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { leesBestand } from "@/components/bestand-lezen";
import { useMeekijken } from "@/hooks/use-meekijken";
import { getMe, listAgents } from "@/lib/dashboard.functions";
import { eersteEmail } from "@/lib/contactimport";
import { leesDatum } from "@/lib/slapend";
import { bewaarOfferteAfzender } from "@/lib/offerte.functions";
import {
  haalReviews,
  markeerBeantwoord,
  markeerKlacht,
  stelReviewAntwoordOpnieuwOp,
  verwijderReview,
  voegReviewToe,
  zetKlussenKlaar,
  type Review,
  type ReviewCijfers,
  type ReviewVerzoek,
} from "@/lib/reviews.functions";

export const Route = createFileRoute("/_authenticated/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews — Zakelijke AI Agents klantportaal" },
      { name: "description", content: "Reviewverzoeken en antwoorden op reviews." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReviewsPagina,
});

const veld =
  "w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink/35 focus:border-violet/55";
const knopHoofd =
  "inline-flex items-center gap-1.5 rounded-full bg-violet px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-violet/85 disabled:opacity-50";
const knopRand =
  "inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-ink/80 transition hover:border-violet/40 hover:text-ink disabled:opacity-50";
const datum = (iso: string) =>
  new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });

function ReviewsPagina() {
  const meFn = useServerFn(getMe);
  const agentsFn = useServerFn(listAgents);
  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: () => agentsFn() });
  const meekijken = useMeekijken();
  const alleenLezen = !!meekijken.data;
  const agents = (
    (agentsQuery.data ?? []) as Array<{ id: string; name: string; kind: string }>
  ).filter((a) => a.kind === "reviews");
  const [gekozen, setGekozen] = useState<string | null>(null);
  const agentId = gekozen ?? agents[0]?.id ?? null;
  const fn = useServerFn(haalReviews);
  const query = useQuery({
    queryKey: ["reviews", agentId],
    queryFn: () => fn({ data: { agentId: agentId! } }),
    enabled: agentId !== null,
  });

  return (
    <DashboardShell isAdmin={meQuery.data?.isAdmin === true} userName={meQuery.data?.name}>
      <div className="grid gap-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[22px] font-bold text-brand">Reviews</h1>
            <p className="mt-1.5 max-w-[70ch] text-[13px]/[1.7] text-ink/60">
              Na een klus vraagt de agent om een review — iedereen dezelfde vraag, nooit na een
              klacht als je dat instelt. Komt er een review binnen, dan zet hij een antwoord klaar
              in jouw toon. Negen op de tien lezers verwachten dat je reageert; de helft haakt af
              bij een sjabloon.
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
            Je hebt nog geen review-agent.
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
            {!query.data.link && (
              <p className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3 text-[12.5px]/[1.6] text-amber-100">
                Er staat nog geen link naar je Google-profiel ingesteld; zonder die link verstuurt
                de agent geen verzoeken. Zet hem bij de{" "}
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
            <Afzender agentId={agentId} afzender={query.data.afzender} alleenLezen={alleenLezen} />

            <section className="card-glass-lg rounded-3xl p-5">
              <h2 className="font-display text-[15px] font-semibold text-brand">
                Antwoorden op reviews
              </h2>
              <p className="mt-1 text-[12px]/[1.6] text-ink/55">
                Plak een review die binnenkwam; de agent stelt een antwoord op. Jij plaatst het bij
                Google en vinkt het af.
              </p>
              {!alleenLezen && <ReviewPlakken agentId={agentId} />}
              <div className="mt-4 grid gap-3">
                {query.data.reviews.length === 0 && (
                  <p className="text-[13px] text-ink/50">Nog geen reviews geplakt.</p>
                )}
                {query.data.reviews.map((r) => (
                  <ReviewKaart key={r.id} r={r} agentId={agentId} alleenLezen={alleenLezen} />
                ))}
              </div>
            </section>

            <section className="card-glass-lg rounded-3xl p-5">
              <h2 className="font-display text-[15px] font-semibold text-brand">
                Om een review vragen
              </h2>
              <p className="mt-1 text-[12px]/[1.6] text-ink/55">
                Zet klussen klaar die af zijn;{" "}
                {query.data.vragenNa === 0
                  ? "dezelfde dag"
                  : `${query.data.vragenNa} dag${query.data.vragenNa === 1 ? "" : "en"} later`}{" "}
                gaat het verzoek. Markeer een klacht, dan slaat hij die over.
              </p>
              {!alleenLezen && <KlussenKlaarzetten agentId={agentId} />}
              <Verzoeken
                verzoeken={query.data.verzoeken}
                agentId={agentId}
                alleenLezen={alleenLezen}
              />
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function Cijfers({ cijfers }: { cijfers: ReviewCijfers | null }) {
  if (!cijfers) return null;
  const tegels: Array<[string, string]> = [
    [
      cijfers.gemiddelde != null ? `${cijfers.gemiddelde.toFixed(1)} ★` : "—",
      "gemiddeld, laatste 90 dagen",
    ],
    [String(cijfers.reviews), "reviews in 90 dagen"],
    [String(cijfers.verzoeken), "verzoeken verstuurd"],
    [
      cijfers.reviews_per_verzoek != null
        ? `${Math.round(cijfers.reviews_per_verzoek * 100)}%`
        : "—",
      "reviews per verzoek",
    ],
    [String(cijfers.onbeantwoord), "nog onbeantwoord"],
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
      await qc.invalidateQueries({ queryKey: ["reviews", agentId] });
    } catch (e) {
      setMelding(e instanceof Error ? e.message : "Dat lukte niet");
    }
  }
  return (
    <section className="card-glass-lg rounded-3xl p-5">
      {!afzender.afzender_email && (
        <p className="mb-2 text-[12px] text-amber-100">
          Zonder afzenderadres verstuurt de agent geen verzoeken.
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
            placeholder="Adres waarvandaan verzoeken vertrekken"
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

function ReviewPlakken({ agentId }: { agentId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(voegReviewToe);
  const [sterren, setSterren] = useState(5);
  const [naam, setNaam] = useState("");
  const [tekst, setTekst] = useState("");
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);
  async function voeg() {
    setBezig(true);
    setMelding(null);
    try {
      await fn({ data: { agentId, sterren, naam: naam || null, tekst } });
      setTekst("");
      setNaam("");
      await qc.invalidateQueries({ queryKey: ["reviews", agentId] });
    } catch (e) {
      setMelding(e instanceof Error ? e.message : "Dat lukte niet");
    } finally {
      setBezig(false);
    }
  }
  return (
    <div className="mt-3 grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-0.5" aria-label="Sterren">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSterren(n)}
              className={n <= sterren ? "text-amber-300" : "text-ink/25"}
              aria-label={`${n} sterren`}
            >
              <Star className="size-5" fill={n <= sterren ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
        <input
          className={`${veld} max-w-[220px]`}
          placeholder="Naam van de schrijver (optioneel)"
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
        />
      </div>
      <textarea
        className={`${veld} min-h-[70px]`}
        placeholder="Plak hier de tekst van de review (mag leeg zijn bij alleen sterren)"
        value={tekst}
        onChange={(e) => setTekst(e.target.value)}
      />
      <div className="flex items-center gap-3">
        <button type="button" className={knopHoofd} disabled={bezig} onClick={voeg}>
          {bezig ? "Bezig…" : "Antwoord laten opstellen"}
        </button>
        {melding && <span className="text-[12px] text-ink/70">{melding}</span>}
      </div>
    </div>
  );
}

function ReviewKaart({
  r,
  agentId,
  alleenLezen,
}: {
  r: Review;
  agentId: string;
  alleenLezen: boolean;
}) {
  const qc = useQueryClient();
  const opnieuwFn = useServerFn(stelReviewAntwoordOpnieuwOp);
  const klaarFn = useServerFn(markeerBeantwoord);
  const wegFn = useServerFn(verwijderReview);
  const [antwoord, setAntwoord] = useState(r.antwoord ?? r.concept_antwoord ?? "");
  const [bezig, setBezig] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  useEffect(
    () => setAntwoord(r.antwoord ?? r.concept_antwoord ?? ""),
    [r.id, r.antwoord, r.concept_antwoord],
  );
  async function doe(naam: string, werk: () => Promise<unknown>, ok: string) {
    setBezig(naam);
    setMelding(null);
    try {
      await werk();
      setMelding(ok);
      await qc.invalidateQueries({ queryKey: ["reviews", agentId] });
    } catch (e) {
      setMelding(e instanceof Error ? e.message : "Dat lukte niet");
    } finally {
      setBezig(null);
    }
  }
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-amber-300">
            {"★".repeat(r.sterren)}
            <span className="text-ink/25">{"★".repeat(5 - r.sterren)}</span>{" "}
            <span className="ml-2 text-[12.5px] text-ink/80">{r.naam || "Anoniem"}</span>
          </p>
          {r.tekst && <p className="mt-1 text-[12.5px]/[1.6] text-ink/70">{r.tekst}</p>}
        </div>
        <div className="flex items-center gap-2 text-[11.5px] text-ink/45">
          {datum(r.geplaatst_op)}
          {r.beantwoord_op ? (
            <span className="rounded-full border border-mint/30 bg-mint/12 px-2 py-0.5 text-mint">
              beantwoord
            </span>
          ) : (
            <span className="rounded-full border border-amber-400/35 bg-amber-400/12 px-2 py-0.5 text-amber-300">
              wacht op antwoord
            </span>
          )}
        </div>
      </div>
      {!r.beantwoord_op && (
        <div className="mt-3 grid gap-2">
          <textarea
            className={`${veld} min-h-[90px]`}
            value={antwoord}
            disabled={alleenLezen}
            onChange={(e) => setAntwoord(e.target.value)}
            placeholder={r.concept_op ? "" : "Het antwoord wordt opgesteld…"}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={knopRand}
              disabled={!antwoord}
              onClick={() => {
                void navigator.clipboard.writeText(antwoord);
                setMelding("Gekopieerd — plak het bij Google.");
              }}
            >
              <Copy className="size-3.5" /> Kopiëren
            </button>
            <button
              type="button"
              className={knopRand}
              disabled={alleenLezen || bezig !== null}
              onClick={() =>
                doe(
                  "opnieuw",
                  () => opnieuwFn({ data: { id: r.id, agentId } }),
                  "Opnieuw opgesteld.",
                )
              }
            >
              <RotateCcw className="size-3.5" /> Opnieuw
            </button>
            <button
              type="button"
              className={knopHoofd}
              disabled={alleenLezen || bezig !== null || !antwoord.trim()}
              onClick={() =>
                doe("klaar", () => klaarFn({ data: { id: r.id, agentId, antwoord } }), "Afgevinkt.")
              }
            >
              <Check className="size-3.5" /> Geplaatst bij Google
            </button>
            <button
              type="button"
              className={knopRand}
              disabled={alleenLezen || bezig !== null}
              onClick={() =>
                doe(
                  "weg",
                  () => wegFn({ data: { id: r.id, agentId, tabel: "reviews" } }),
                  "Verwijderd.",
                )
              }
              title="Verwijderen"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          {melding && <p className="text-[12px] text-ink/60">{melding}</p>}
        </div>
      )}
      {r.beantwoord_op && r.antwoord && (
        <p className="mt-2 rounded-xl bg-white/[0.03] p-3 text-[12.5px]/[1.6] text-ink/70">
          {r.antwoord}
        </p>
      )}
    </article>
  );
}

function KlussenKlaarzetten({ agentId }: { agentId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(zetKlussenKlaar);
  const invoer = useRef<HTMLInputElement>(null);
  const vandaag = new Date().toISOString().slice(0, 10);
  const [w, setW] = useState({ email: "", naam: "", klaar_op: vandaag });
  const [melding, setMelding] = useState<string | null>(null);
  const [rijen, setRijen] = useState<string[][]>([]);
  // Een lijst: e-mail, naam en datum raden we op inhoud, niet op kop. Dat is
  // genoeg voor drie kolommen en vraagt de klant niets.
  const gelezen = useMemo(() => {
    const uit: Array<{ email: string; naam: string | null; klaar_op: string }> = [];
    for (const rij of rijen) {
      const email = rij.map((c) => eersteEmail(c)).find((x): x is string => !!x);
      if (!email) continue;
      const d = rij.map((c) => leesDatum(c)).find((x): x is Date => !!x);
      const naam =
        rij.find((c) => c && !eersteEmail(c) && !leesDatum(c) && !/^\d+$/.test(c.trim())) ?? null;
      uit.push({
        email,
        naam: naam ? naam.trim().slice(0, 120) : null,
        klaar_op: (d ?? new Date()).toISOString().slice(0, 10),
      });
    }
    return uit;
  }, [rijen]);

  async function stuur(klussen: Array<{ email: string; naam: string | null; klaar_op: string }>) {
    setMelding(null);
    try {
      const r = await fn({ data: { agentId, klussen } });
      setMelding(`${r.aantal} klaargezet.`);
      setRijen([]);
      setW({ email: "", naam: "", klaar_op: vandaag });
      await qc.invalidateQueries({ queryKey: ["reviews", agentId] });
    } catch (e) {
      setMelding(e instanceof Error ? e.message : "Dat lukte niet");
    }
  }
  return (
    <div className="mt-3 grid gap-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
        <input
          className={veld}
          placeholder="E-mail van de klant"
          value={w.email}
          onChange={(e) => setW({ ...w, email: e.target.value })}
        />
        <input
          className={veld}
          placeholder="Naam (optioneel)"
          value={w.naam}
          onChange={(e) => setW({ ...w, naam: e.target.value })}
        />
        <input
          type="date"
          className={veld}
          value={w.klaar_op}
          onChange={(e) => setW({ ...w, klaar_op: e.target.value })}
        />
        <button
          type="button"
          className={knopHoofd}
          disabled={!w.email}
          onClick={() =>
            stuur([
              { email: w.email.trim().toLowerCase(), naam: w.naam || null, klaar_op: w.klaar_op },
            ])
          }
        >
          Klaarzetten
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={knopRand} onClick={() => invoer.current?.click()}>
          <FileUp className="size-3.5" /> Of een lijst (e-mail, naam, datum)
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
            onClick={() => stuur(gelezen)}
          >
            {gelezen.length} klussen klaarzetten
          </button>
        )}
        {melding && <span className="text-[12px] text-ink/60">{melding}</span>}
      </div>
    </div>
  );
}

function Verzoeken({
  verzoeken,
  agentId,
  alleenLezen,
}: {
  verzoeken: ReviewVerzoek[];
  agentId: string;
  alleenLezen: boolean;
}) {
  const qc = useQueryClient();
  const klachtFn = useServerFn(markeerKlacht);
  const wegFn = useServerFn(verwijderReview);
  if (verzoeken.length === 0)
    return <p className="mt-3 text-[13px] text-ink/50">Nog geen klussen klaargezet.</p>;
  const label: Record<ReviewVerzoek["status"], string> = {
    gepland: "staat klaar",
    verstuurd: "gevraagd",
    overgeslagen: "overgeslagen",
    mislukt: "mislukt",
  };
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <tbody>
          {verzoeken.slice(0, 100).map((v) => (
            <tr key={v.id} className="border-t border-white/8">
              <td className="py-2 pr-3 text-ink/85">
                {v.naam || v.email}
                {v.naam && <span className="block text-[11.5px] text-ink/45">{v.email}</span>}
              </td>
              <td className="py-2 pr-3 text-ink/55">klaar {datum(v.klaar_op)}</td>
              <td className="py-2 pr-3 text-ink/55">
                {label[v.status]}
                {v.verstuurd_op ? ` ${datum(v.verstuurd_op)}` : ""}
                {v.klacht ? " · klacht" : ""}
              </td>
              <td className="py-2 text-right">
                {!alleenLezen && v.status === "gepland" && (
                  <button
                    type="button"
                    className={knopRand}
                    onClick={async () => {
                      await klachtFn({ data: { id: v.id, agentId, klacht: !v.klacht } });
                      await qc.invalidateQueries({ queryKey: ["reviews", agentId] });
                    }}
                  >
                    {v.klacht ? "Toch vragen" : "Klacht: niet vragen"}
                  </button>
                )}
                {!alleenLezen && (
                  <button
                    type="button"
                    className={`${knopRand} ml-1`}
                    title="Verwijderen"
                    onClick={async () => {
                      await wegFn({ data: { id: v.id, agentId, tabel: "review_verzoeken" } });
                      await qc.invalidateQueries({ queryKey: ["reviews", agentId] });
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
