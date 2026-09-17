import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Printer, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { listAgents } from "@/lib/dashboard.functions";
import { haalBezorgingen } from "@/lib/bezorging.functions";

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
  const agentsFn = useServerFn(listAgents);
  const lijstFn = useServerFn(haalBezorgingen);

  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: () => agentsFn() });
  const agentId = ((agentsQuery.data ?? []) as Array<{ id: string }>)[0]?.id ?? null;

  const query = useQuery({
    queryKey: ["bezorgingen", agentId],
    queryFn: () => lijstFn({ data: { agentId: agentId! } }) as unknown as Promise<Bezorging[]>,
    enabled: agentId !== null,
  });

  const alles = query.data ?? [];
  // Wie heeft afgezegd staat niet op de lijst. Een naam die je moet overslaan
  // is een naam waar iemand op vrijdagochtend alsnog naartoe rijdt.
  const lijst = alles
    .filter(
      (b) =>
        b.status !== "afgezegd" &&
        b.bevestiging !== "afgezegd" &&
        b.bevestiging !== "verzet" &&
        (!dag || b.bezorgdag === dag),
    )
    .sort((a, b) => (a.outbound_contacts?.plaats ?? "").localeCompare(b.outbound_contacts?.plaats ?? ""));

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
        {/* Hoeveel er bevestigd zijn hoort vóór het wegrijden bekend te zijn,
            niet bij de derde deur die dicht blijkt. */}
        {lijst.length > 0 && (
          <p className="mt-0.5 text-[12.5px] text-ink/45 print:text-black">
            {lijst.filter((b) => b.bevestiging === "bevestigd" || b.bevestiging === "ander_adres").length}{" "}
            van {lijst.length} bevestigd
          </p>
        )}
      </header>

      {lijst.length === 0 ? (
        <p className="text-[13px] text-ink/55">Voor deze dag staan er geen bezorgingen.</p>
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

                  {b.bevestiging !== "bevestigd" && b.bevestiging !== "ander_adres" && (
                    <p className="mt-1 text-[12px] text-ink/50 print:text-black">
                      {b.bevestiging === "gevraagd"
                        ? "niet bevestigd — nog geen antwoord"
                        : "niet bevestigd"}
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
    </div>
  );
}
