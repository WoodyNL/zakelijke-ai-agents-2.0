import { Clock, MessageSquare, TrendingUp } from "lucide-react";

/**
 * Verbruik en tijdwinst.
 *
 * Berichten tellen we; bespaarde tijd niet. Om van het een naar het ander te
 * komen is een aanname nodig over hoeveel minuten één afgehandeld gesprek
 * scheelt, en die spreek je af met de klant. Staat die er niet, dan tonen we
 * geen tijdwinst: een getal dat gemeten lijkt maar geschat is, is erger dan
 * geen getal, zeker voor een bureau dat klanten waarschuwt voor AI-beloftes
 * die niet worden nagekomen.
 */

export type VerbruikDag = { dag: string; requests: number };

function uurNotatie(minuten: number) {
  const u = Math.floor(minuten / 60);
  const m = Math.round(minuten % 60);
  if (u === 0) return `${m} min`;
  if (m === 0) return `${u} uur`;
  return `${u} uur ${m} min`;
}

export function VerbruikPaneel({
  dagen,
  minutenPerActie,
  grondslag,
  periodeLabel = "laatste 30 dagen",
}: {
  dagen: VerbruikDag[];
  minutenPerActie?: number | null;
  grondslag?: string | null;
  periodeLabel?: string;
}) {
  const totaal = dagen.reduce((som, d) => som + d.requests, 0);
  const actieveDagen = dagen.filter((d) => d.requests > 0).length;
  const drukste = dagen.reduce<VerbruikDag | null>(
    (max, d) => (max === null || d.requests > max.requests ? d : max),
    null,
  );
  const perDag = actieveDagen > 0 ? Math.round(totaal / actieveDagen) : 0;
  const bespaard = minutenPerActie ? totaal * minutenPerActie : null;

  const maxWaarde = Math.max(1, ...dagen.map((d) => d.requests));

  return (
    <section className="card-glass-lg rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[16px] font-semibold text-brand">Verbruik</h2>
        <span className="text-[11.5px] text-ink/45">{periodeLabel}</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Cijfer
          icoon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}
          waarde={totaal.toLocaleString("nl-NL")}
          label="berichten verwerkt"
          nadruk
        />
        <Cijfer
          icoon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
          waarde={perDag.toLocaleString("nl-NL")}
          label="gemiddeld per actieve dag"
        />
        <Cijfer
          icoon={<Clock className="h-4 w-4" aria-hidden="true" />}
          waarde={bespaard != null ? uurNotatie(bespaard) : "—"}
          label={bespaard != null ? "geschatte tijdwinst" : "tijdwinst nog niet afgesproken"}
        />
      </div>

      {bespaard != null ? (
        <p className="mt-3 text-[11.5px]/[1.7] text-ink/45">
          Schatting, geen meting: {totaal.toLocaleString("nl-NL")} berichten ×{" "}
          {String(minutenPerActie).replace(".", ",")} minuten per bericht.
          {grondslag ? ` Gebaseerd op ${grondslag}.` : ""}
        </p>
      ) : (
        <p className="mt-3 text-[11.5px]/[1.7] text-ink/45">
          Tijdwinst tonen we pas als we samen hebben vastgesteld hoeveel tijd één afgehandeld
          bericht scheelt. Tot die tijd laten we het leeg in plaats van te gokken.
        </p>
      )}

      {dagen.length > 0 && (
        <div className="mt-6">
          <div
            className="flex h-24 items-end gap-[3px]"
            role="img"
            aria-label={`Verbruik per dag, ${totaal} berichten in totaal`}
          >
            {dagen.map((d) => (
              <div
                key={d.dag}
                title={`${new Date(d.dag).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}: ${d.requests}`}
                className="flex-1 rounded-t bg-violet/70 transition-colors hover:bg-violet"
                style={{ height: `${Math.max(3, (d.requests / maxWaarde) * 100)}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10.5px] text-ink/35">
            <span>
              {dagen[0] &&
                new Date(dagen[0].dag).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "short",
                })}
            </span>
            {drukste && drukste.requests > 0 && (
              <span>
                drukste dag:{" "}
                {new Date(drukste.dag).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                · {drukste.requests}
              </span>
            )}
            <span>
              {dagen.at(-1) &&
                new Date(dagen.at(-1)!.dag).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "short",
                })}
            </span>
          </div>
        </div>
      )}

      {dagen.length === 0 && (
        <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-[12.5px] text-ink/50">
          Nog geen verbruik gemeten. Zodra je agent live staat en gesprekken voert, verschijnt hier
          het verloop per dag.
        </p>
      )}
    </section>
  );
}

function Cijfer({
  icoon,
  waarde,
  label,
  nadruk = false,
}: {
  icoon: React.ReactNode;
  waarde: string;
  label: string;
  nadruk?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 ${nadruk ? "border-violet/30 bg-violet/[0.07]" : "border-white/10 bg-white/[0.03]"}`}
    >
      <span className={`inline-flex ${nadruk ? "text-violet" : "text-ink/40"}`}>{icoon}</span>
      <p
        className={`mt-2 font-display text-[22px] leading-none font-bold tabular-nums ${
          nadruk ? "text-violet" : "text-brand"
        }`}
      >
        {waarde}
      </p>
      <p className="mt-1.5 text-[11.5px] text-ink/55">{label}</p>
    </div>
  );
}
