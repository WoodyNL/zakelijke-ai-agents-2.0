import * as React from "react";
import { SOORTEN, type AgentSoort } from "@/lib/agent-soorten";
import { alsGetal, type Aannamewaarden } from "@/lib/agent-aannames";
import { berekenFairUse, berekenOpbrengst, euro, urenNotatie } from "@/lib/opbrengst";

/**
 * De afspraken met de klant waarmee het dashboard berichten omrekent naar tijd
 * en geld.
 *
 * Dit formulier is bedoeld om ingevuld te worden terwijl je met de klant aan
 * tafel zit, dus staat de uitkomst er direct naast: typ je 6 minuten en €45,
 * dan zie je meteen wat er straks op zijn dashboard komt. Dat maakt het gesprek
 * concreet, en het laat zien wanneer een aanname te optimistisch wordt.
 *
 * De grondslag is geen bijzaak. Die verschijnt letterlijk op het klantdashboard
 * onder het bedrag: "gebaseerd op de nulmeting van september". Zonder die zin
 * is het een getal dat iemand kan betwisten; met die zin is het een afspraak.
 */

const veldCls =
  "w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-[13px] text-ink outline-none transition placeholder:text-ink/35 focus:border-violet/55 focus:ring-2 focus:ring-violet/25";

export function AgentAannames({
  waarden,
  onWijzig,
  voorbeeldBerichten = 371,
}: {
  waarden: Aannamewaarden;
  onWijzig: (w: Aannamewaarden) => void;
  /** Waarmee de voorbeeldberekening rekent; standaard een realistisch maandvolume. */
  voorbeeldBerichten?: number;
}) {
  const zet = (sleutel: keyof Aannamewaarden) => (v: string) =>
    onWijzig({ ...waarden, [sleutel]: v });

  const minuten = alsGetal(waarden.minutesSavedPerAction);
  const tarief = alsGetal(waarden.hourlyRate);
  const grens = alsGetal(waarden.fairUsePerMonth);
  const prijs = alsGetal(waarden.overagePrice);

  const opbrengst = berekenOpbrengst(voorbeeldBerichten, {
    minutenPerActie: minuten,
    uurtarief: tarief,
  });
  const fair = berekenFairUse(voorbeeldBerichten, grens, prijs);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="grid gap-3">
        <Veld label="Soort agent" hint="Bepaalt of er een kennisbank bij hoort">
          <select
            className={veldCls}
            value={waarden.kind}
            onChange={(e) => zet("kind")(e.target.value)}
          >
            {(Object.keys(SOORTEN) as AgentSoort[]).map((k) => (
              <option key={k} value={k} className="bg-[#12121a]">
                {SOORTEN[k].label}
              </option>
            ))}
          </select>
        </Veld>

        <div className="grid gap-3 sm:grid-cols-2">
          <Veld label="Minuten per bericht" hint="Wat één afgehandeld bericht scheelt">
            <input
              className={veldCls}
              inputMode="decimal"
              placeholder="bijv. 6"
              value={waarden.minutesSavedPerAction}
              onChange={(e) => zet("minutesSavedPerAction")(e.target.value)}
            />
          </Veld>
          <Veld label="Uurtarief" hint="Wat een uur van die medewerker kost">
            <input
              className={veldCls}
              inputMode="decimal"
              placeholder="bijv. 45"
              value={waarden.hourlyRate}
              onChange={(e) => zet("hourlyRate")(e.target.value)}
            />
          </Veld>
        </div>

        <Veld
          label="Waarop is de tijdwinst gebaseerd?"
          hint="Komt letterlijk op het klantdashboard te staan"
        >
          <input
            className={veldCls}
            placeholder="bijv. de nulmeting van september"
            value={waarden.minutesSavedBasis}
            onChange={(e) => zet("minutesSavedBasis")(e.target.value)}
          />
        </Veld>

        <Veld label="Waarop is het uurtarief gebaseerd?" hint="Idem">
          <input
            className={veldCls}
            placeholder="bijv. het interne tarief van een medewerker klantcontact"
            value={waarden.hourlyRateBasis}
            onChange={(e) => zet("hourlyRateBasis")(e.target.value)}
          />
        </Veld>

        <div className="grid gap-3 sm:grid-cols-2">
          <Veld label="Fair use per maand" hint="Leeg = geen grens, niets na te factureren">
            <input
              className={veldCls}
              inputMode="numeric"
              placeholder="bijv. 300"
              value={waarden.fairUsePerMonth}
              onChange={(e) => zet("fairUsePerMonth")(e.target.value)}
            />
          </Veld>
          <Veld label="Prijs per bericht erboven" hint="In euro's">
            <input
              className={veldCls}
              inputMode="decimal"
              placeholder="1"
              value={waarden.overagePrice}
              onChange={(e) => zet("overagePrice")(e.target.value)}
            />
          </Veld>
        </div>

        {/* Alleen nodig bij een agent die e-mail verstuurt. Leeg laten betekent
            dat er geen antwoorden binnenkomen; een verkeerd ingevulde waarde
            betekent dat antwoorden stilletjes bij niemand aankomen, dus staat
            er uitdrukkelijk bij waar dit vandaan komt. */}
        <Veld
          label="Ontvangstadres voor antwoorden"
          hint="Alleen het stuk vóór de @ — laat leeg als deze agent geen e-mail verstuurt"
        >
          <input
            className={veldCls}
            placeholder="bijv. fjsnacks"
            value={waarden.inboundLocal}
            onChange={(e) => zet("inboundLocal")(e.target.value)}
          />
        </Veld>
      </div>

      {/* De uitkomst naast de invoer, zodat je tijdens het gesprek ziet wat je
          afspreekt in plaats van het achteraf te ontdekken. */}
      <aside className="rounded-2xl border border-violet/25 bg-violet/[0.06] p-4">
        <p className="text-[11px] font-semibold tracking-wide text-violet uppercase">
          Zo ziet de klant het
        </p>
        <p className="mt-1 text-[11px] text-ink/45">
          bij {voorbeeldBerichten.toLocaleString("nl-NL")} berichten in een maand
        </p>

        <dl className="mt-4 grid gap-3">
          <Uitkomst
            label="tijd bespaard"
            waarde={opbrengst.minuten != null ? urenNotatie(opbrengst.minuten) : "—"}
            leeg={opbrengst.minuten == null}
          />
          <Uitkomst
            label="aan kosten vermeden"
            waarde={opbrengst.bedrag != null ? euro(Math.round(opbrengst.bedrag)) : "—"}
            leeg={opbrengst.bedrag == null}
            nadruk
          />
          <Uitkomst
            label={fair.grens != null ? "boven de fair-use-grens" : "geen fair-use-grens"}
            waarde={fair.grens != null ? `${fair.bovenGrens} · ${euro(fair.bedrag)}` : "—"}
            leeg={fair.grens == null}
          />
        </dl>

        {opbrengst.ontbreekt.length > 0 && (
          <p className="mt-4 text-[11px]/[1.6] text-ink/45">
            Nog leeg: {opbrengst.ontbreekt.join(" en ")}. Die cijfers blijven weg op het dashboard.
          </p>
        )}
      </aside>
    </div>
  );
}

function Veld({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-medium text-ink/70">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10.5px] text-ink/40">{hint}</span>}
    </label>
  );
}

function Uitkomst({
  label,
  waarde,
  leeg,
  nadruk = false,
}: {
  label: string;
  waarde: string;
  leeg: boolean;
  nadruk?: boolean;
}) {
  return (
    <div>
      <dd
        className={`font-display text-[19px] leading-none font-bold tabular-nums ${
          leeg ? "text-ink/25" : nadruk ? "text-violet" : "text-brand"
        }`}
      >
        {waarde}
      </dd>
      <dt className="mt-1 text-[11px] text-ink/55">{label}</dt>
    </div>
  );
}
