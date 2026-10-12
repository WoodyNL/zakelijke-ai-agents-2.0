import * as React from "react";
import { Link } from "@tanstack/react-router";
import { GROEPEN, optiesVoorWie, waardeVan, type Optie } from "@/lib/agent-opties";
import type { OptieAgent } from "@/lib/opties.functions";

/**
 * Eén formulier voor de opties van een agent, in twee rollen.
 *
 * De beheerder ziet alles, de klant alleen wat van hem is — maar het is
 * hetzelfde scherm met dezelfde teksten. Dat is met opzet: wat jij bij een
 * klant instelt, leest hij in zijn eigen portaal in precies dezelfde woorden
 * terug. Eén catalogus, één uitleg, geen twee verhalen.
 *
 * Opties die nog niet gebouwd zijn, staan onderaan apart en uitgeschakeld.
 * Een knop die niets doet, hoort er niet tussen te staan alsof hij werkt.
 */

const veld =
  "w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink/35 focus:border-violet/55";

export type Waarden = Record<string, unknown>;

export function AgentOptiesFormulier({
  agent,
  wie,
  waarden,
  onWijzig,
}: {
  agent: OptieAgent;
  wie: "beheerder" | "klant";
  waarden: Waarden;
  onWijzig: (w: Waarden) => void;
}) {
  const alle = optiesVoorWie(agent.kind, wie);
  const bruikbaar = alle.filter((o) => o.gebouwd && o.bron.soort !== "elders");
  const elders = alle.filter((o) => o.gebouwd && o.bron.soort === "elders");
  const komt = alle.filter((o) => !o.gebouwd);

  const huidig = (o: Optie) => (o.sleutel in waarden ? waarden[o.sleutel] : waardeVan(o, agent));
  const zet = (o: Optie, v: unknown) => onWijzig({ ...waarden, [o.sleutel]: v });

  return (
    <div className="grid gap-5">
      {GROEPEN.map((groep) => {
        const inGroep = bruikbaar.filter((o) => o.groep === groep.sleutel);
        if (inGroep.length === 0) return null;
        return (
          <section key={groep.sleutel} className="grid gap-3">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-ink/45 uppercase">
              {groep.label}
            </p>
            {inGroep.map((o) => (
              <Rij key={o.sleutel} optie={o} wie={wie}>
                <Besturing optie={o} waarde={huidig(o)} onZet={(v) => zet(o, v)} />
              </Rij>
            ))}
          </section>
        );
      })}

      {elders.length > 0 && (
        <section className="grid gap-2">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-ink/45 uppercase">
            Staat op een eigen scherm
          </p>
          {elders.map((o) => (
            <div key={o.sleutel} className="text-[12.5px]/[1.6] text-ink/60">
              <span className="font-semibold text-ink/80">{o.label}</span> — {o.uitleg}{" "}
              {o.bron.soort === "elders" && (
                <Link to={o.bron.scherm} className="text-violet hover:underline">
                  {o.bron.waar}
                </Link>
              )}
            </div>
          ))}
        </section>
      )}

      {komt.length > 0 && (
        <section className="grid gap-2 rounded-2xl border border-dashed border-white/12 p-4">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-ink/45 uppercase">
            Binnenkort
          </p>
          {komt.map((o) => (
            <div key={o.sleutel} className="text-[12.5px]/[1.55] text-ink/45">
              <span className="font-semibold text-ink/60">{o.label}</span> — {o.uitleg}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function Rij({
  optie,
  wie,
  children,
}: {
  optie: Optie;
  wie: "beheerder" | "klant";
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_260px] sm:items-start sm:gap-4">
      <div>
        <p className="text-[13px] font-semibold text-ink/90">
          {optie.label}
          {wie === "beheerder" && optie.wie === "klant" && (
            <span className="ml-2 rounded-full border border-white/12 px-2 py-0.5 text-[10.5px] font-medium text-ink/50">
              klant mag dit zelf
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[12px]/[1.55] text-ink/55">{optie.uitleg}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Besturing({
  optie,
  waarde,
  onZet,
}: {
  optie: Optie;
  waarde: unknown;
  onZet: (v: unknown) => void;
}) {
  switch (optie.type) {
    case "schakelaar":
      return (
        <label className="inline-flex items-center gap-2 text-[13px] text-ink/80">
          <input
            type="checkbox"
            className="accent-violet"
            checked={waarde === true}
            onChange={(e) => onZet(e.target.checked)}
          />
          {waarde === true ? "Aan" : "Uit"}
        </label>
      );
    case "getal":
      return (
        <div className="flex items-center gap-2">
          <input
            className={veld}
            inputMode="numeric"
            value={waarde === null || waarde === undefined ? "" : String(waarde)}
            onChange={(e) => onZet(e.target.value === "" ? null : e.target.value)}
          />
          {optie.eenheid && <span className="text-[12px] text-ink/45">{optie.eenheid}</span>}
        </div>
      );
    case "keuze":
      return (
        <select
          className={veld}
          value={typeof waarde === "string" ? waarde : ""}
          onChange={(e) => onZet(e.target.value)}
        >
          {(optie.keuzes ?? []).map((k) => (
            <option key={k.waarde} value={k.waarde} className="bg-[#12121a]">
              {k.label}
            </option>
          ))}
        </select>
      );
    case "lijst":
      return (
        <input
          className={veld}
          placeholder="Gescheiden door komma's"
          value={
            Array.isArray(waarde) ? waarde.join(", ") : typeof waarde === "string" ? waarde : ""
          }
          onChange={(e) => onZet(e.target.value)}
        />
      );
    case "tekstlang":
      return (
        <textarea
          className={`${veld} min-h-[90px]`}
          value={typeof waarde === "string" ? waarde : ""}
          onChange={(e) => onZet(e.target.value)}
        />
      );
    default:
      return (
        <input
          className={veld}
          value={typeof waarde === "string" ? waarde : waarde === null ? "" : String(waarde ?? "")}
          onChange={(e) => onZet(e.target.value)}
        />
      );
  }
}
