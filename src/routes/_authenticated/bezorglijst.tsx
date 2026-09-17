import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Printer, AlertTriangle, Phone } from "lucide-react";
import { z } from "zod";
import { listAgents } from "@/lib/dashboard.functions";
import { haalBezorgingen, zetBevestiging } from "@/lib/bezorging.functions";

/**
 * De lijst die de chauffeur meeneemt.
 *
 * Dit is het enige scherm in het portaal dat bedoeld is om te printen, en daar
 * is het helemaal op ingericht: geen menu, geen kleuren, geen knoppen op
 * papier. Een chauffeur staat met een telefoon in een bestelbus; die heeft
 * adressen nodig en een vakje om af te vinken, geen dashboard.
 *
 * Een adres zonder huisnummer krijgt een waarschuwing. In Franks bestand staan
 * er zeven, en daar komt de bus niet: dat wil je weten voordat je wegrijdt, niet
 * als je er staat.
 */

export const Route = createFileRoute("/_authenticated/bezorglijst")({
  validateSearch: z.object({ dag: z.string().optional() }),
  head: () => ({
    meta: [{ title: "Bezorglijst" }, { name: "robots", content: "noindex" }],
  }),
  component: BezorglijstPagina,
});

type Bezorging = {
  id: string;
  bezorgdag: string;
  adres: string | null;
  status: string;
  notitie: string | null;
  bevestiging?: string;
  adres_eerder?: string | null;
  outbound_contacts: {
    naam: string | null;
    bedrijf: string | null;
    plaats: string | null;
    email: string;
  } | null;
};

function BezorglijstPagina() {
  const { dag } = useSearch({ from: "/_authenticated/bezorglijst" });
  const qc = useQueryClient();
  const agentsFn = useServerFn(listAgents);
  const lijstFn = useServerFn(haalBezorgingen);
  const bevestigFn = useServerFn(zetBevestiging);

  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: () => agentsFn() });
  const agentId = ((agentsQuery.data ?? []) as Array<{ id: string }>)[0]?.id ?? null;

  const query = useQuery({
    queryKey: ["bezorgingen", agentId],
    queryFn: () => lijstFn({ data: { agentId: agentId! } }) as unknown as Promise<Bezorging[]>,
    enabled: agentId !== null,
  });

  const alles = query.data ?? [];

  /**
   * Op papier staat alleen wat de bus in gaat.
   *
   * De bevestiging van de klant is de sluis: heeft hij niet gezegd dat het
   * schikt, dan gaat het pakket niet mee. Een naam die de chauffeur moet
   * overslaan, is een naam waar hij op vrijdagochtend alsnog naartoe rijdt —
   * en dan is de regel een aantekening geworden in plaats van een regel.
   *
   * Een adreswijziging telt als bevestiging: wie de moeite neemt zijn adres
   * door te geven, wil het pakket.
   */
  const bevestigd = (b: Bezorging) =>
    b.bevestiging === "bevestigd" || b.bevestiging === "ander_adres";

  const opDeDag = alles.filter((b) => b.status !== "afgezegd" && (!dag || b.bezorgdag === dag));

  const lijst = opDeDag
    .filter(bevestigd)
    .sort((a, b) => (a.outbound_contacts?.plaats ?? "").localeCompare(b.outbound_contacts?.plaats ?? ""));

  // Wat er níét meegaat, en waarom. Alleen op het scherm: op papier zou het
  // een rij namen zijn die de chauffeur moet negeren.
  const blijftStaan = opDeDag
    .filter((b) => !bevestigd(b))
    .sort((a, b) => (a.outbound_contacts?.plaats ?? "").localeCompare(b.outbound_contacts?.plaats ?? ""));

  /**
   * Met de hand bevestigen.
   *
   * Niet iedereen antwoordt per mail. Wie belt heeft net zo goed bevestigd, en
   * zonder deze knop zou die klant alsnog afvallen — dan is de regel geen
   * bescherming meer maar een obstakel.
   */
  async function bevestigMetDeHand(id: string) {
    await bevestigFn({ data: { id, bevestiging: "bevestigd" } });
    await qc.invalidateQueries({ queryKey: ["bezorgingen", agentId] });
  }

  const dagTekst = dag
    ? new Date(dag + "T12:00:00").toLocaleDateString("nl-NL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "alle bezorgingen";

  return (
    <div className="mx-auto max-w-[52rem] px-6 py-8 print:max-w-none print:px-0 print:py-0">
      <style>{`
        @media print {
          /* Op papier hoort alleen de lijst te staan. Kleuren en kaders kosten
             inkt en helpen niemand die in een bus staat. */
          .geen-print { display: none !important; }
          body { background: #fff !important; }
          .bon { break-inside: avoid; border-color: #ccc !important; }
          .bon, .bon * { color: #000 !important; }
        }
      `}</style>

      <div className="geen-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/bezorgen"
          className="inline-flex items-center gap-1.5 text-[12.5px] text-ink/55 transition hover:text-ink/85"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          terug naar bezorgen
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-violet px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-violet/90"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Afdrukken
        </button>
      </div>

      <header className="mb-5">
        <h1 className="font-display text-[22px] font-bold text-brand print:text-black">
          Bezorglijst — {dagTekst}
        </h1>
        <p className="mt-1 text-[13px] text-ink/55 print:text-black">
          {lijst.length} {lijst.length === 1 ? "adres" : "adressen"} · FJ Snacks, Lageweg 4 Katwijk
        </p>
        {blijftStaan.length > 0 && (
          <p className="geen-print mt-0.5 text-[12.5px] text-amber-300/85">
            {blijftStaan.length} {blijftStaan.length === 1 ? "pakket gaat" : "pakketten gaan"} niet
            mee — geen bevestiging. Ze staan onderaan.
          </p>
        )}
      </header>

      {lijst.length === 0 ? (
        <p className="text-[13px] text-ink/55">
          {blijftStaan.length > 0
            ? "Nog niemand heeft bevestigd, dus er gaat nog niets mee. Hieronder staat wie er nog moet reageren."
            : "Voor deze dag staan er geen bezorgingen."}
        </p>
      ) : (
        <ol className="grid gap-2.5">
          {lijst.map((b, i) => {
            const c = b.outbound_contacts;
            const adresOnvolledig = !b.adres || !/\d/.test(b.adres);
            return (
              <li
                key={b.id}
                className="bon grid grid-cols-[2rem_1fr] gap-3 rounded-2xl border border-white/12 px-4 py-3 print:rounded-none print:border print:px-3 print:py-2"
              >
                {/* Een leeg vakje om af te vinken. Dat is wat een papieren lijst
                    boven een scherm heeft, en waarom dit scherm mag printen. */}
                <span
                  className="mt-0.5 h-5 w-5 rounded border border-ink/30 print:border-black"
                  aria-hidden="true"
                />

                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-brand print:text-black">
                    {i + 1}. {c?.bedrijf ?? c?.naam ?? "onbekend"}
                  </p>
                  {c?.naam && c.bedrijf && (
                    <p className="text-[12.5px] text-ink/60 print:text-black">t.a.v. {c.naam}</p>
                  )}
                  <p className="mt-1 text-[13px] text-ink/80 print:text-black">
                    {b.adres ?? <span className="text-amber-300">geen adres bekend</span>}
                  </p>

                  {/* Een adres dat is gewijzigd hoort op papier te staan.
                      Anders rijdt de chauffeur naar het adres dat hij vorige
                      week in zijn hoofd heeft geprent. */}
                  {b.adres_eerder && (
                    <p className="mt-1 text-[12px] text-ink/60 print:text-black">
                      gewijzigd — was: <span className="line-through">{b.adres_eerder}</span>
                    </p>
                  )}

                  {adresOnvolledig && (
                    <p className="geen-print mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      geen huisnummer — hier komt de bus niet
                    </p>
                  )}

                  {b.notitie && (
                    <p className="mt-1 text-[12px] text-ink/55 print:text-black">{b.notitie}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Wat er niet meegaat. Alleen op het scherm: op papier zou dit een rij
          namen zijn die de chauffeur moet overslaan, en dat is precies hoe er
          alsnog een doos op de verkeerde toonbank belandt. */}
      {blijftStaan.length > 0 && (
        <section className="geen-print mt-8 rounded-2xl border border-amber-400/25 bg-amber-400/[0.05] p-5">
          <h2 className="font-display text-[15px] font-semibold text-amber-200">
            Gaat niet mee — geen bevestiging
          </h2>
          <p className="mt-1 max-w-[62ch] text-[12.5px]/[1.65] text-ink/60">
            Deze mensen hebben niet laten weten dat het schikt. Ze staan niet op de geprinte lijst.
            Belt er een, of weet je het zeker, zet hem dan hier alsnog op bevestigd — dan verschijnt
            hij bovenaan.
          </p>

          <ul className="mt-4 grid gap-2">
            {blijftStaan.map((b) => {
              const c = b.outbound_contacts;
              return (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5"
                >
                  <span className="min-w-0 text-[12.5px]">
                    <span className="font-semibold text-brand">
                      {c?.bedrijf ?? c?.naam ?? "onbekend"}
                    </span>
                    {c?.plaats && <span className="ml-2 text-ink/45">{c.plaats}</span>}
                    <span className="ml-2 text-ink/40">
                      {b.bevestiging === "gevraagd"
                        ? "gevraagd, nog geen antwoord"
                        : b.bevestiging === "verzet"
                          ? "wil een andere dag"
                          : b.bevestiging === "afgezegd"
                            ? "afgezegd"
                            : "nog niets gevraagd"}
                    </span>
                  </span>
                  {b.bevestiging !== "afgezegd" && (
                    <button
                      type="button"
                      onClick={() => void bevestigMetDeHand(b.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[11.5px] font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
                    >
                      <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                      heeft gebeld — gaat mee
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
