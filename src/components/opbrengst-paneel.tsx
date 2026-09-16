import { AlertTriangle, Clock, Euro, MessageSquare } from "lucide-react";
import { berekenFairUse, berekenOpbrengst, euro, getal, urenNotatie } from "@/lib/opbrengst";

/**
 * Wat de agents deze maand hebben gedaan, en wat dat waard was.
 *
 * Dit is het scherm waarop een klant beoordeelt of hij zijn abonnement verlengt,
 * dus elk bedrag heeft zijn rekensom erbij. Niet uit voorzichtigheid maar omdat
 * het overtuigender is: een getal met "gebaseerd op de nulmeting van september"
 * eronder houdt stand in een gesprek, een kaal bedrag niet.
 */

export type AgentStand = {
  agent: { id: string; name: string; kind: string | null };
  stand: {
    requests: number;
    fair_use_per_month: number | null;
    boven_grens: number;
    overage_price: number | null;
    overage_bedrag: number;
    minutes_saved_per_action: number | null;
    minutes_saved_basis: string | null;
    hourly_rate: number | null;
    hourly_rate_basis: string | null;
  } | null;
};

export function OpbrengstPaneel({ standen }: { standen: AgentStand[] }) {
  const metStand = standen.filter((s) => s.stand);

  const berichten = metStand.reduce((som, s) => som + (s.stand?.requests ?? 0), 0);

  // Per agent rekenen en dan optellen: agents kunnen verschillende aannames
  // hebben, dus een gemiddelde over alles zou nergens op slaan.
  const opbrengsten = metStand.map((s) =>
    berekenOpbrengst(s.stand!.requests, {
      minutenPerActie: s.stand!.minutes_saved_per_action,
      minutenGrondslag: s.stand!.minutes_saved_basis,
      uurtarief: s.stand!.hourly_rate,
      uurtariefGrondslag: s.stand!.hourly_rate_basis,
    }),
  );

  const minuten = opbrengsten.reduce<number | null>(
    (som, o) => (o.minuten == null ? som : (som ?? 0) + o.minuten),
    null,
  );
  const bedrag = opbrengsten.reduce<number | null>(
    (som, o) => (o.bedrag == null ? som : (som ?? 0) + o.bedrag),
    null,
  );

  const fairUse = metStand.map((s) =>
    berekenFairUse(s.stand!.requests, s.stand!.fair_use_per_month, s.stand!.overage_price),
  );
  const overBedrag = fairUse.reduce((som, f) => som + f.bedrag, 0);
  const overAantal = fairUse.reduce((som, f) => som + f.bovenGrens, 0);

  const ontbreekt = [...new Set(opbrengsten.flatMap((o) => o.ontbreekt))];
  const maand = new Date().toLocaleDateString("nl-NL", { month: "long", year: "numeric" });

  return (
    <section className="card-glass-lg rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[16px] font-semibold text-brand">
          Wat het deze maand deed
        </h2>
        <span className="text-[11.5px] text-ink/45">{maand}</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Tegel
          icoon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}
          waarde={berichten.toLocaleString("nl-NL")}
          label="berichten verwerkt"
        />
        <Tegel
          icoon={<Clock className="h-4 w-4" aria-hidden="true" />}
          waarde={minuten != null ? urenNotatie(minuten) : "—"}
          label="tijd bespaard"
          gedimd={minuten == null}
        />
        <Tegel
          icoon={<Euro className="h-4 w-4" aria-hidden="true" />}
          waarde={bedrag != null ? euro(Math.round(bedrag)) : "—"}
          label="aan kosten vermeden"
          nadruk={bedrag != null}
          gedimd={bedrag == null}
        />
      </div>

      {/* De rekensom hoort bij het bedrag, niet in een voetnoot ergens anders. */}
      {opbrengsten.some((o) => o.verantwoording.length > 0) && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-[11.5px] font-semibold tracking-wide text-ink/50 uppercase">
            Hoe dit is berekend
          </p>
          <ul className="mt-2 grid gap-1.5">
            {metStand.map((s, i) =>
              opbrengsten[i]!.verantwoording.length > 0 ? (
                <li key={s.agent.id} className="text-[12px]/[1.65] text-ink/60">
                  <span className="text-ink/80">{s.agent.name}:</span>{" "}
                  {opbrengsten[i]!.verantwoording.join(". ")}.
                </li>
              ) : null,
            )}
          </ul>
          <p className="mt-2.5 text-[11.5px]/[1.6] text-ink/40">
            Een schatting van vermeden kosten, geen meting. Het gaat om tijd die anders aan dit werk
            was besteed, niet om extra omzet.
          </p>
        </div>
      )}

      {ontbreekt.length > 0 && (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[12px]/[1.7] text-ink/55">
          Nog niet af te lezen: we moeten samen nog vaststellen {ontbreekt.join(" en ")}. Tot die
          tijd laten we het leeg in plaats van te gokken.
        </p>
      )}

      {/* Fair use per agent, want de grenzen verschillen per pakket. */}
      {fairUse.some((f) => f.grens != null) && (
        <div className="mt-5">
          <p className="text-[11.5px] font-semibold tracking-wide text-ink/50 uppercase">
            Fair use
          </p>
          <ul className="mt-2.5 grid gap-2">
            {metStand.map((s, i) => {
              const f = fairUse[i]!;
              if (f.grens == null) return null;
              const deel = Math.min(f.berichten / f.grens, 1);
              const over = f.bovenGrens > 0;
              return (
                <li key={s.agent.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-[12.5px]">
                    <span className="text-ink/75">{s.agent.name}</span>
                    <span className={over ? "font-semibold text-amber-300" : "text-ink/50"}>
                      {f.berichten.toLocaleString("nl-NL")} van {f.grens.toLocaleString("nl-NL")}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className={`h-full rounded-full ${over ? "bg-amber-400" : "bg-violet"}`}
                      style={{ width: `${Math.max(deel * 100, 2)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {overAantal > 0 && (
            <p className="mt-3.5 flex items-start gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-[12.5px]/[1.65] text-ink/85">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
                aria-hidden="true"
              />
              <span>
                {getal(overAantal, 0)} berichten boven de fair-use-grens. Daarvoor komt{" "}
                <strong className="font-semibold">{euro(overBedrag)}</strong> bovenop je
                maandbedrag. Verwacht je dit vaker, dan is een groter pakket meestal voordeliger.
              </span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function Tegel({
  icoon,
  waarde,
  label,
  nadruk = false,
  gedimd = false,
}: {
  icoon: React.ReactNode;
  waarde: string;
  label: string;
  nadruk?: boolean;
  gedimd?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 ${
        nadruk ? "border-violet/30 bg-violet/[0.07]" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <span className={`inline-flex ${nadruk ? "text-violet" : "text-ink/40"}`}>{icoon}</span>
      <p
        className={`mt-2 font-display text-[24px] leading-none font-bold tabular-nums ${
          gedimd ? "text-ink/30" : nadruk ? "text-violet" : "text-brand"
        }`}
      >
        {waarde}
      </p>
      <p className="mt-1.5 text-[11.5px] text-ink/55">{label}</p>
    </div>
  );
}
