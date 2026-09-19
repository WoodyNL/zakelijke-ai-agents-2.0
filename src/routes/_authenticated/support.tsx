import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Inbox, Send, RotateCcw, Check, BookPlus, ShieldCheck, Zap } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { useMeekijken } from "@/hooks/use-meekijken";
import { getMe, listAgents } from "@/lib/dashboard.functions";
import {
  bewaarAlsKennis,
  bewaarSupportInstellingen,
  handelZelfAf,
  haalSupport,
  stelOpnieuwOp,
  verstuurSupport,
  type SupportCijfers,
  type SupportInstellingen,
  type SupportMail,
} from "@/lib/support.functions";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({
    meta: [
      { title: "Supportmail — Zakelijke AI Agents klantportaal" },
      { name: "description", content: "Supportmail beantwoorden met je kennisbank." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SupportPagina,
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

const STATUS: Record<SupportMail["status"], { label: string; kleur: string }> = {
  nieuw: { label: "Nieuw", kleur: "border-white/15 bg-white/5 text-ink/70" },
  bezig: { label: "Wordt opgesteld", kleur: "border-white/15 bg-white/5 text-ink/70" },
  concept: { label: "Concept", kleur: "border-violet/35 bg-violet/12 text-violet" },
  mens_nodig: {
    label: "Jij bent nodig",
    kleur: "border-amber-400/35 bg-amber-400/12 text-amber-300",
  },
  verzonden: { label: "Verstuurd", kleur: "border-mint/30 bg-mint/12 text-mint" },
  zelf: { label: "Zelf afgehandeld", kleur: "border-white/15 bg-white/5 text-ink/60" },
  mislukt: { label: "Mislukt", kleur: "border-warn/35 bg-warn/10 text-ink/85" },
};

type Tab = "open" | "verzonden" | "zelf";

function SupportPagina() {
  const meFn = useServerFn(getMe);
  const agentsFn = useServerFn(listAgents);
  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: () => agentsFn() });
  const meekijken = useMeekijken();
  const alleenLezen = !!meekijken.data;

  const agents = (
    (agentsQuery.data ?? []) as Array<{ id: string; name: string; kind: string }>
  ).filter((a) => a.kind === "inbox_draft");
  const [gekozen, setGekozen] = useState<string | null>(null);
  const agentId = gekozen ?? agents[0]?.id ?? null;

  const fn = useServerFn(haalSupport);
  const query = useQuery({
    queryKey: ["support", agentId],
    queryFn: () => fn({ data: { agentId: agentId! } }),
    enabled: agentId !== null,
    // Mail komt binnen terwijl je kijkt, en een concept is soms pas na een
    // paar seconden klaar.
    refetchInterval: 30_000,
  });

  const [tab, setTab] = useState<Tab>("open");
  const mails = query.data?.mails ?? [];
  const perTab: Record<Tab, SupportMail[]> = {
    open: mails.filter((m) =>
      ["nieuw", "bezig", "concept", "mens_nodig", "mislukt"].includes(m.status),
    ),
    verzonden: mails.filter((m) => m.status === "verzonden"),
    zelf: mails.filter((m) => m.status === "zelf"),
  };

  return (
    <DashboardShell isAdmin={meQuery.data?.isAdmin === true} userName={meQuery.data?.name}>
      <div className="grid gap-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[22px] font-bold text-brand">Supportmail</h1>
            <p className="mt-1.5 max-w-[70ch] text-[13px]/[1.7] text-ink/60">
              Vragen die binnenkomen op je supportadres. De agent beantwoordt ze met wat in je{" "}
              <Link to="/knowledge" className="text-violet underline-offset-2 hover:underline">
                kennisbank
              </Link>{" "}
              staat. Staat het er niet in, dan verzint hij niets en ben jij aan de beurt.
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
            Je hebt nog geen inbox-assistent. Wil je supportmail laten beantwoorden? Mail ons, dan
            richten we hem in.
          </div>
        )}

        {query.data && !query.data.beschikbaar && (
          <div className="card-glass-lg rounded-3xl p-6 text-[13px] text-ink/60">
            Supportmail wordt op dit moment ingericht. Kom straks terug.
          </div>
        )}

        {query.data?.beschikbaar && agentId && (
          <>
            <Cijfers cijfers={query.data.cijfers} />
            <Instellingen
              agentId={agentId}
              instellingen={query.data.instellingen}
              cijfers={query.data.cijfers}
              doorstuurAdres={query.data.doorstuurAdres}
              domeinBekend={query.data.doorstuurDomeinBekend}
              alleenLezen={alleenLezen}
            />

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["open", "Te doen"],
                  ["verzonden", "Verstuurd"],
                  ["zelf", "Zelf afgehandeld"],
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

            {perTab[tab].length === 0 ? (
              <div className="card-glass-lg rounded-3xl p-8 text-center">
                <Inbox className="mx-auto h-6 w-6 text-ink/30" aria-hidden="true" />
                <p className="mt-3 text-[13px] text-ink/60">
                  {tab === "open"
                    ? mails.length === 0
                      ? "Nog geen supportmail binnengekomen."
                      : "Alles is beantwoord."
                    : "Hier staat nog niets."}
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {perTab[tab].map((m) => (
                  <MailKaart key={m.id} mail={m} agentId={agentId} alleenLezen={alleenLezen} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function Cijfers({ cijfers }: { cijfers: SupportCijfers | null }) {
  if (!cijfers) return null;
  const tegels: Array<[string, string]> = [
    [String(cijfers.binnen), "binnen in 30 dagen"],
    [String(cijfers.automatisch), "zelf verstuurd"],
    [String(cijfers.via_concept), "via jouw concept"],
    [String(cijfers.mens_nodig), "naar jou doorgezet"],
    [
      cijfers.reactie_minuten != null ? `${cijfers.reactie_minuten} min` : "—",
      "gemiddelde reactietijd",
    ],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {tegels.map(([w, l]) => (
        <div key={l} className="card-glass rounded-2xl px-4 py-3.5">
          <p className="font-display text-[22px] leading-none font-bold text-brand tabular-nums">
            {w}
          </p>
          <p className="mt-1.5 text-[11.5px] text-ink/55">{l}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Hoe de mail binnenkomt, van welk adres hij antwoordt, en de belangrijkste
 * keuze: concept of direct versturen. Die keuze is van de klant. Naast de knop
 * staat waar hij op kan vertrouwen: hoeveel concepten hij ongewijzigd verstuurde.
 */
function Instellingen({
  agentId,
  instellingen,
  cijfers,
  doorstuurAdres,
  domeinBekend,
  alleenLezen,
}: {
  agentId: string;
  instellingen: SupportInstellingen;
  cijfers: SupportCijfers | null;
  doorstuurAdres: string | null;
  domeinBekend: boolean;
  alleenLezen: boolean;
}) {
  const qc = useQueryClient();
  const fn = useServerFn(bewaarSupportInstellingen);
  const [w, setW] = useState(instellingen);
  const [open, setOpen] = useState(!instellingen.afzender_email);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string } | null>(null);
  useEffect(() => setW(instellingen), [instellingen]);

  async function bewaar(nieuw: SupportInstellingen) {
    setBezig(true);
    setMelding(null);
    try {
      await fn({
        data: {
          agentId,
          kanaal: nieuw.kanaal,
          modus: nieuw.modus,
          afzenderNaam: nieuw.afzender_naam || null,
          afzenderEmail: nieuw.afzender_email || null,
          ondertekening: nieuw.ondertekening || null,
        },
      });
      setMelding({ ok: true, tekst: "Opgeslagen." });
      await qc.invalidateQueries({ queryKey: ["support", agentId] });
    } catch (err) {
      setMelding({ ok: false, tekst: err instanceof Error ? err.message : "Opslaan lukte niet" });
    } finally {
      setBezig(false);
    }
  }

  function kiesModus(modus: SupportInstellingen["modus"]) {
    if (modus === w.modus) return;
    if (modus === "direct") {
      const ok = window.confirm(
        "Direct versturen aanzetten?\n\nAntwoorden die hij zeker uit je kennisbank haalt, gaan dan zonder dat jij ze leest de deur uit. Klachten, terugbetalingen en vragen die niet in je kennisbank staan blijven altijd bij jou.\n\nJe kunt dit op elk moment weer uitzetten.",
      );
      if (!ok) return;
    }
    const nieuw = { ...w, modus };
    setW(nieuw);
    void bewaar(nieuw);
  }

  const vertrouwen =
    cijfers && cijfers.via_concept > 0
      ? `Van de ${cijfers.via_concept} concepten die je de afgelopen 30 dagen verstuurde, stuurde je er ${cijfers.ongewijzigd} ongewijzigd door.`
      : "Nog geen concepten verstuurd. Keur er eerst een aantal goed, dan zie je hier hoe vaak je iets moest aanpassen.";

  return (
    <section className="card-glass-lg rounded-3xl p-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">
            Verstuurwijze
          </p>
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              disabled={alleenLezen || bezig}
              onClick={() => kiesModus("concept")}
              className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition ${
                w.modus === "concept"
                  ? "border-violet/45 bg-violet/10"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet" aria-hidden="true" />
              <span>
                <span className="block text-[13px] font-semibold text-ink/90">
                  Eerst een concept
                </span>
                <span className="block text-[12px]/[1.55] text-ink/55">
                  Elk antwoord wacht op jou. Aanbevolen om mee te beginnen.
                </span>
              </span>
            </button>
            <button
              type="button"
              disabled={alleenLezen || bezig}
              onClick={() => kiesModus("direct")}
              className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition ${
                w.modus === "direct"
                  ? "border-violet/45 bg-violet/10"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-violet" aria-hidden="true" />
              <span>
                <span className="block text-[13px] font-semibold text-ink/90">
                  Direct versturen als hij het zeker weet
                </span>
                <span className="block text-[12px]/[1.55] text-ink/55">
                  Alleen als het antwoord letterlijk in je kennisbank staat. Twijfel, klachten en
                  onbekende vragen blijven bij jou.
                </span>
              </span>
            </button>
          </div>
          <p className="mt-2.5 text-[12px]/[1.6] text-ink/50">{vertrouwen}</p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">
            Hoe de mail binnenkomt
          </p>
          <div className="mt-3 grid gap-2 text-[12.5px]/[1.6] text-ink/70">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                className="accent-violet"
                checked={w.kanaal === "doorsturen"}
                disabled={alleenLezen}
                onChange={() => setW({ ...w, kanaal: "doorsturen" })}
              />
              Doorsturen vanuit je eigen mailbox
            </label>
            {w.kanaal === "doorsturen" && (
              <p className="ml-6 text-ink/55">
                {doorstuurAdres ? (
                  <>
                    Stel in je mailbox een regel in die je supportadres doorstuurt naar{" "}
                    <strong className="font-semibold text-ink/85">{doorstuurAdres}</strong>
                    {domeinBekend ? "." : " (het volledige adres krijg je van ons)."}
                  </>
                ) : (
                  "Wij geven je het adres waar je je supportmail naartoe doorstuurt."
                )}
              </p>
            )}
            {(["gmail", "outlook"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 text-ink/45">
                <input type="radio" className="accent-violet" disabled checked={w.kanaal === k} />
                Mailbox koppelen:{" "}
                {k === "gmail" ? "Gmail / Google Workspace" : "Outlook / Microsoft 365"}
                <span className="rounded-full border border-white/12 px-2 py-0.5 text-[10.5px]">
                  binnenkort
                </span>
              </label>
            ))}
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
                placeholder="Naam afzender, bijv. Klantenservice FJ Snacks"
                value={w.afzender_naam ?? ""}
                disabled={alleenLezen}
                onChange={(e) => setW({ ...w, afzender_naam: e.target.value })}
              />
              <input
                className={veld}
                placeholder="Antwoorden vanaf, bijv. info@jouwbedrijf.nl"
                value={w.afzender_email ?? ""}
                disabled={alleenLezen}
                onChange={(e) => setW({ ...w, afzender_email: e.target.value })}
              />
              <textarea
                className={`${veld} min-h-[70px]`}
                placeholder={"Ondertekening, bijv.\nMet vriendelijke groet,\nTeam FJ Snacks"}
                value={w.ondertekening ?? ""}
                disabled={alleenLezen}
                onChange={(e) => setW({ ...w, ondertekening: e.target.value })}
              />
              {!alleenLezen && (
                <button
                  type="button"
                  className={`${knopHoofd} justify-self-start`}
                  disabled={bezig}
                  onClick={() => bewaar(w)}
                >
                  {bezig ? "Bezig…" : "Opslaan"}
                </button>
              )}
            </div>
          )}
          {melding && (
            <p className={`mt-2 text-[12px] ${melding.ok ? "text-mint" : "text-destructive"}`}>
              {melding.tekst}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function MailKaart({
  mail,
  agentId,
  alleenLezen,
}: {
  mail: SupportMail;
  agentId: string;
  alleenLezen: boolean;
}) {
  const qc = useQueryClient();
  const verstuurFn = useServerFn(verstuurSupport);
  const zelfFn = useServerFn(handelZelfAf);
  const opnieuwFn = useServerFn(stelOpnieuwOp);
  const kennisFn = useServerFn(bewaarAlsKennis);

  const [onderwerp, setOnderwerp] = useState(
    mail.concept_onderwerp ?? `Re: ${mail.onderwerp ?? ""}`,
  );
  const [tekst, setTekst] = useState(mail.concept_tekst ?? "");
  const [kennisAan, setKennisAan] = useState(mail.status === "mens_nodig");
  const [kennisTitel, setKennisTitel] = useState(mail.onderwerp ?? "");
  const [kennisAntwoord, setKennisAntwoord] = useState("");
  const [vraagOpen, setVraagOpen] = useState(mail.status !== "verzonden");
  const [bezig, setBezig] = useState<string | null>(null);
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string } | null>(null);

  useEffect(() => {
    setOnderwerp(mail.concept_onderwerp ?? `Re: ${mail.onderwerp ?? ""}`);
    setTekst(mail.concept_tekst ?? "");
  }, [mail.concept_onderwerp, mail.concept_tekst, mail.onderwerp]);

  const st = STATUS[mail.status];
  const open = ["nieuw", "concept", "mens_nodig", "mislukt"].includes(mail.status);

  async function doe(naam: string, werk: () => Promise<unknown>, gelukt: string) {
    setBezig(naam);
    setMelding(null);
    try {
      await werk();
      setMelding({ ok: true, tekst: gelukt });
      await qc.invalidateQueries({ queryKey: ["support", agentId] });
    } catch (err) {
      setMelding({ ok: false, tekst: err instanceof Error ? err.message : "Dat lukte niet" });
    } finally {
      setBezig(null);
    }
  }

  const kennis =
    kennisAan && kennisTitel.trim().length >= 3
      ? { titel: kennisTitel.trim(), antwoord: (kennisAntwoord || tekst).trim() }
      : null;

  return (
    <article className="card-glass-lg rounded-3xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-ink/90">
            {mail.van_naam || mail.van_email}
            {mail.van_naam && <span className="font-normal text-ink/50"> · {mail.van_email}</span>}
          </p>
          <p className="mt-0.5 text-[12.5px] text-ink/65">{mail.onderwerp || "(geen onderwerp)"}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[11.5px] text-ink/45">{wanneer(mail.ontvangen_op)}</span>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${st.kleur}`}>
            {st.label}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="mt-3 text-[12px] font-medium text-ink/50 hover:text-ink/80"
        onClick={() => setVraagOpen((v) => !v)}
      >
        {vraagOpen ? "Vraag verbergen" : "Vraag tonen"}
      </button>
      {vraagOpen && (
        <p className="mt-1.5 max-h-60 overflow-auto whitespace-pre-line rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-[12.5px]/[1.65] text-ink/70">
          {mail.vraag || "(De tekst van deze mail kon niet worden opgehaald.)"}
        </p>
      )}

      {(mail.toelichting || mail.bronnen.length > 0 || mail.fout) && (
        <div className="mt-3 grid gap-1.5 text-[12px]/[1.55]">
          {mail.status === "mens_nodig" && (
            <p className="text-amber-200">
              Het antwoord staat niet (helemaal) in je kennisbank. Vul het concept aan, en zet het
              meteen in de kennisbank, dan weet de agent het de volgende keer zelf.
            </p>
          )}
          {mail.toelichting && <p className="text-ink/55">{mail.toelichting}</p>}
          {mail.bronnen.length > 0 && (
            <p className="text-ink/45">
              Gebaseerd op: {mail.bronnen.join(" · ")}
              {mail.zekerheid === "hoog"
                ? " · zeker"
                : mail.zekerheid === "laag"
                  ? " · twijfel"
                  : ""}
            </p>
          )}
          {mail.fout && <p className="text-destructive">{mail.fout}</p>}
        </div>
      )}

      {mail.status === "verzonden" ? (
        <div className="mt-3 rounded-2xl border border-mint/20 bg-mint/[0.04] px-4 py-3">
          <p className="text-[11.5px] text-ink/50">
            {mail.verzonden_door ? "Verstuurd na goedkeuring" : "Zelf verstuurd door de agent"}
            {mail.verzonden_op ? ` · ${wanneer(mail.verzonden_op)}` : ""}
          </p>
          <p className="mt-1.5 whitespace-pre-line text-[12.5px]/[1.65] text-ink/75">
            {mail.verzonden_tekst}
          </p>
        </div>
      ) : mail.status === "bezig" ? (
        <p className="mt-3 text-[12.5px] text-ink/55">De agent stelt een antwoord op…</p>
      ) : (
        <div className="mt-3 grid gap-2">
          <input
            className={veld}
            value={onderwerp}
            disabled={alleenLezen}
            onChange={(e) => setOnderwerp(e.target.value)}
          />
          <textarea
            className={`${veld} min-h-[180px] leading-[1.6]`}
            value={tekst}
            placeholder={mail.status === "nieuw" ? "Nog geen concept. Klik op Opstellen." : ""}
            disabled={alleenLezen}
            onChange={(e) => setTekst(e.target.value)}
          />

          {!alleenLezen && open && (
            <>
              <label className="mt-1 flex items-center gap-2 text-[12.5px] text-ink/70">
                <input
                  type="checkbox"
                  className="accent-violet"
                  checked={kennisAan}
                  onChange={(e) => setKennisAan(e.target.checked)}
                />
                Ook in de kennisbank zetten, zodat de agent het volgende keer zelf weet
              </label>
              {kennisAan && (
                <div className="grid gap-2 rounded-2xl border border-white/10 p-3">
                  <input
                    className={veld}
                    placeholder="Titel, bijv. Verzendkosten binnen Nederland"
                    value={kennisTitel}
                    onChange={(e) => setKennisTitel(e.target.value)}
                  />
                  <textarea
                    className={`${veld} min-h-[80px]`}
                    placeholder="Het antwoord zoals de agent het mag gebruiken. Leeg: de tekst van je mail hierboven."
                    value={kennisAntwoord}
                    onChange={(e) => setKennisAntwoord(e.target.value)}
                  />
                </div>
              )}

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={knopHoofd}
                  disabled={!!bezig || !tekst.trim() || !onderwerp.trim()}
                  onClick={() =>
                    doe(
                      "versturen",
                      () => verstuurFn({ data: { id: mail.id, onderwerp, tekst, kennis } }),
                      kennis ? "Verstuurd en in de kennisbank gezet." : "Verstuurd.",
                    )
                  }
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  {bezig === "versturen" ? "Bezig…" : "Versturen"}
                </button>
                <button
                  type="button"
                  className={knopRand}
                  disabled={!!bezig}
                  onClick={() =>
                    doe("opnieuw", () => opnieuwFn({ data: { id: mail.id } }), "Opnieuw opgesteld.")
                  }
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  {bezig === "opnieuw"
                    ? "Bezig…"
                    : mail.status === "nieuw"
                      ? "Opstellen"
                      : "Opnieuw opstellen"}
                </button>
                {kennis && (
                  <button
                    type="button"
                    className={knopRand}
                    disabled={!!bezig}
                    onClick={() =>
                      doe(
                        "kennis",
                        () =>
                          kennisFn({
                            data: { id: mail.id, titel: kennis.titel, antwoord: kennis.antwoord },
                          }),
                        "In de kennisbank gezet. Laat hem opnieuw opstellen om het te gebruiken.",
                      )
                    }
                  >
                    <BookPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    Alleen in kennisbank
                  </button>
                )}
                <button
                  type="button"
                  className={knopRand}
                  disabled={!!bezig}
                  onClick={() =>
                    doe(
                      "zelf",
                      () => zelfFn({ data: { id: mail.id } }),
                      "Gemarkeerd als zelf afgehandeld.",
                    )
                  }
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Zelf afhandelen
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {melding && (
        <p className={`mt-2.5 text-[12px] ${melding.ok ? "text-mint" : "text-destructive"}`}>
          {melding.tekst}
        </p>
      )}
    </article>
  );
}
