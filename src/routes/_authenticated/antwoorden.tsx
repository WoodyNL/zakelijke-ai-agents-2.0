import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Inbox, Check, CircleHelp } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { getMe, listAgents } from "@/lib/dashboard.functions";
import { haalAntwoorden, verstuurAntwoordOpnieuw, zetAntwoordAf } from "@/lib/contacten.functions";
import { bezorgstand } from "@/lib/berichtstand";

export const Route = createFileRoute("/_authenticated/antwoorden")({
  head: () => ({
    meta: [
      { title: "Antwoorden — Zakelijke AI Agents klantportaal" },
      { name: "description", content: "Wat je relaties terugschrijven en wat de agent terugstuurde." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AntwoordenPagina,
});

type Antwoord = {
  id: string;
  van_email: string;
  van_naam: string | null;
  onderwerp: string | null;
  tekst: string;
  ontvangen_op: string;
  afgehandeld_op: string | null;
  contact_id: string | null;
  outbound_contacts: { naam: string | null; bedrijf: string | null } | null;
  beoordeling: string | null;
  beoordeeld_op: string | null;
  agentbericht: {
    id: string;
    onderwerp: string;
    tekst: string;
    status: "concept" | "gepland" | "verzonden" | "mislukt" | "beantwoord";
    verzonden_op: string | null;
    fout: string | null;
  } | null;
};

const wanneer = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function AntwoordenPagina() {
  const qc = useQueryClient();
  const meFn = useServerFn(getMe);
  const agentsFn = useServerFn(listAgents);
  const lijstFn = useServerFn(haalAntwoorden);
  const afvinkFn = useServerFn(zetAntwoordAf);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: () => agentsFn() });
  const agents = (agentsQuery.data ?? []) as Array<{ id: string; name: string }>;
  const agentId = agents[0]?.id ?? null;

  const [toonAfgehandeld, zetToonAfgehandeld] = useState(false);
  const [bezig, zetBezig] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["antwoorden", agentId],
    queryFn: () => lijstFn({ data: { agentId: agentId! } }) as Promise<Antwoord[]>,
    enabled: agentId !== null,
    // Antwoorden komen binnen terwijl je kijkt; een minuut is vaak genoeg.
    refetchInterval: 60_000,
  });

  const alles = query.data ?? [];
  const open = alles.filter((a) => a.afgehandeld_op === null);
  const zichtbaar = toonAfgehandeld ? alles : open;

  async function afvinken(a: Antwoord) {
    zetBezig(a.id);
    try {
      await afvinkFn({ data: { id: a.id, afgehandeld: a.afgehandeld_op === null } });
      await qc.invalidateQueries({ queryKey: ["antwoorden", agentId] });
    } finally {
      zetBezig(null);
    }
  }

  return (
    <DashboardShell isAdmin={meQuery.data?.isAdmin === true} userName={meQuery.data?.name}>
      <div className="grid gap-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[22px] font-bold text-brand">Antwoorden</h1>
            <p className="mt-1.5 max-w-[72ch] text-[13.5px]/[1.75] text-ink/70">
              Wat je relaties terugschrijven, en wat de agent daarop heeft teruggestuurd. De
              agent antwoordt zelf, meestal binnen een minuut, en blijft dat doen tot er een
              proefpakket is afgesproken voor de eerstvolgende vrijdag.
            </p>
            <p className="mt-1.5 max-w-[72ch] text-[13.5px]/[1.75] text-ink/55">
              Hij stopt en laat het aan jou bij een vraag over prijzen, bij een afzender die
              niet in de lijst staat, en na drie beurten. De geplande opvolging vervalt zodra
              iemand terugschrijft.
            </p>
          </div>
          {alles.length > 0 && (
            <button
              type="button"
              onClick={() => zetToonAfgehandeld((v) => !v)}
              className="rounded-xl border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[12px] text-ink/75 transition hover:bg-white/10"
            >
              {toonAfgehandeld ? "alleen openstaande" : `ook afgehandelde (${alles.length - open.length})`}
            </button>
          )}
        </header>

        {query.isLoading ? (
          <div className="card-glass-lg rounded-3xl p-6">
            <p className="text-[12.5px] text-ink/50">Bezig met laden…</p>
          </div>
        ) : zichtbaar.length === 0 ? (
          <div className="card-glass-lg rounded-3xl p-8 text-center">
            <Inbox className="mx-auto h-6 w-6 text-ink/30" aria-hidden="true" />
            <p className="mt-3 text-[13px] text-ink/60">
              {alles.length === 0
                ? "Nog geen antwoorden binnengekomen."
                : "Alles afgehandeld."}
            </p>
            {alles.length === 0 && (
              <p className="mx-auto mt-1.5 max-w-[52ch] text-[12px]/[1.7] text-ink/40">
                Antwoorden verschijnen hier zodra iemand terugschrijft op een verstuurd bericht.
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {zichtbaar.map((a) => {
              const bekend = a.contact_id !== null;
              const naam = a.outbound_contacts?.naam ?? a.van_naam;
              const bedrijf = a.outbound_contacts?.bedrijf;
              const af = a.afgehandeld_op !== null;

              return (
                <article
                  key={a.id}
                  className={`card-glass rounded-2xl p-4 sm:p-5 ${af ? "opacity-55" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-brand">
                        {naam ?? a.van_email}
                        {bedrijf && <span className="ml-2 text-ink/50">{bedrijf}</span>}
                      </p>
                      {/* Het adres staat er alleen bij als er ook een naam is.
                          Zonder naam is de kop het adres zelf, en dan is het
                          twee keer tonen geen extra informatie maar ruis. */}
                      <p className="mt-0.5 text-[11.5px] text-ink/45">
                        {naam ? `${a.van_email} · ` : ""}
                        {wanneer(a.ontvangen_op)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {/* Een afzender die niet in de contactenlijst staat is geen
                          fout maar een signaal: hier moet een mens naar kijken,
                          want de agent kan het bericht nergens aan koppelen. */}
                      {!bekend && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 text-[10.5px] font-medium text-amber-300">
                          <CircleHelp className="h-3 w-3" aria-hidden="true" />
                          onbekend adres
                        </span>
                      )}
                      {/* Hier stond één knop met het woord "afgehandeld" erop,
                          groen en met een vinkje, op de plek waar andere
                          schermen een statuslabel tonen. Die las als "dit is
                          afgehandeld" terwijl het de handeling was die je nog
                          moest doen — bij een binnengekomen vraag van een klant
                          is dat precies het verkeerde misverstand.

                          Nu is het label een label en de knop een knop. */}
                      {af && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10.5px] font-medium text-emerald-300">
                          <Check className="h-3 w-3" aria-hidden="true" />
                          afgehandeld
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => afvinken(a)}
                        disabled={bezig === a.id}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[11.5px] text-ink/70 transition hover:bg-white/10 disabled:opacity-40"
                      >
                        {af ? "weer openzetten" : "markeer als afgehandeld"}
                      </button>
                    </div>
                  </div>

                  {a.onderwerp && (
                    <p className="mt-3 text-[13px] font-medium text-ink/80">{a.onderwerp}</p>
                  )}

                  {a.tekst.trim() ? (
                    <p className="mt-1.5 max-w-[78ch] text-[12.5px]/[1.7] whitespace-pre-wrap text-ink/65">
                      {a.tekst.length > 1200 ? a.tekst.slice(0, 1200) + "…" : a.tekst}
                    </p>
                  ) : (
                    /* De melding bevat de tekst niet; die wordt apart opgehaald.
                       Lukt dat niet, dan bewaren we het bericht toch — met
                       afzender en onderwerp kan iemand er nog steeds iets mee. */
                    <p className="mt-1.5 text-[12px] text-ink/40 italic">
                      De inhoud kon niet worden opgehaald. Kijk in de postbus zelf.
                    </p>
                  )}

                  <AgentAntwoord bericht={a.agentbericht} beoordeling={a.beoordeling} />
                </article>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

/**
 * Wat de agent op dit bericht heeft teruggestuurd.
 *
 * Staat hier omdat het scherm anders alleen de vraag toont. Dat was precies
 * de klacht: de agent antwoordde wel, maar je zag het niet, en dan lijkt het
 * alsof er niets gebeurt.
 *
 * Er is bewust geen geval voor "bewust overgeslagen". Of de agent een bericht
 * negeerde of het aan een mens liet, wordt nergens vastgelegd — alleen het
 * verstuurde antwoord staat in de database. Hier doen alsof we het verschil
 * weten zou een verzinsel op het scherm zetten.
 *
 * Het onderscheid dat er wél toe doet: een antwoord dat klaarstaat maar niet
 * is verstuurd, is geen antwoord. Daar hoort geen geruststellende regel bij
 * maar een knop.
 */
function AgentAntwoord({
  bericht,
  beoordeling,
}: {
  bericht: Antwoord["agentbericht"];
  beoordeling: string | null;
}) {
  const qc = useQueryClient();
  const opnieuwFn = useServerFn(verstuurAntwoordOpnieuw);
  const [bezig, zetBezig] = useState(false);
  const [fout, zetFout] = useState<string | null>(null);

  if (!bericht) {
    /*
     * Hier stond alleen "De agent heeft hier niet op geantwoord". Dat was
     * waar en nutteloos: de enige vraag die je op dat moment hebt is waarom
     * niet, en daar zei het scherm niets over. Nu staat de reden erbij, als
     * die is vastgelegd.
     *
     * Staat er geen reden, dan is dat zelf ook informatie: dan is de agent
     * er nooit aan toegekomen. Dat is iets anders dan een bewuste keuze om
     * niet te antwoorden, en het scherm zegt dat ook zo.
     */
    return (
      <div className="mt-3 border-t border-white/8 pt-3">
        <p className="text-[12.5px]/[1.7] text-ink/55">
          De agent heeft hier niet op geantwoord. Deze is voor jou.
        </p>
        <p className="mt-1 text-[12.5px]/[1.7] text-ink/75">
          {beoordeling ?? (
            <span className="text-ink/45 italic">
              De agent is er niet aan toegekomen — er is geen beoordeling vastgelegd.
            </span>
          )}
        </p>
      </div>
    );
  }

  // De regel staat apart en wordt apart getest: hij stond eerder fout en dat
  // was op het scherm niet te zien.
  const stand = bezorgstand(bericht);
  const verstuurd = stand === "verstuurd";
  const blijftLiggen = stand === "blijft_liggen";

  async function opnieuw() {
    zetBezig(true);
    zetFout(null);
    try {
      await opnieuwFn({ data: { berichtId: bericht!.id } });
      await qc.invalidateQueries({ queryKey: ["antwoorden"] });
    } catch (e) {
      zetFout(e instanceof Error ? e.message : "Versturen mislukt.");
    } finally {
      zetBezig(false);
    }
  }

  return (
    <div
      className={`mt-3 rounded-xl border-l-2 py-2.5 pr-3 pl-3.5 ${
        blijftLiggen
          ? "border-amber-400/70 bg-amber-400/[0.06]"
          : "border-violet/70 bg-violet/[0.07]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[11.5px] font-semibold tracking-wide text-ink/70 uppercase">
          {verstuurd
            ? `Agent antwoordde · ${wanneer(bericht.verzonden_op ?? "")}`
            : "Dit antwoord is niet verstuurd — de klant wacht nog"}
        </p>
        {blijftLiggen && (
          <button
            type="button"
            onClick={opnieuw}
            disabled={bezig}
            className="shrink-0 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11.5px] font-medium text-amber-200 transition hover:bg-amber-400/20 disabled:opacity-40"
          >
            {bezig ? "bezig…" : "opnieuw versturen"}
          </button>
        )}
      </div>

      {bericht.fout && (
        <p className="mt-1 text-[12.5px]/[1.6] text-amber-300/90">{bericht.fout}</p>
      )}
      {fout && <p className="mt-1 text-[12.5px]/[1.6] text-amber-300">{fout}</p>}

      <p className="mt-1.5 text-[13px] font-medium text-ink/85">{bericht.onderwerp}</p>
      <p className="mt-1 max-w-[78ch] text-[12.5px]/[1.7] whitespace-pre-wrap text-ink/70">
        {bericht.tekst.length > 900 ? bericht.tekst.slice(0, 900) + "…" : bericht.tekst}
      </p>
    </div>
  );
}
