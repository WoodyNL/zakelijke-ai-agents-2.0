import type { AgentSoort } from "./agent-soorten";

/**
 * De invoerwaarden van het afsprakenformulier, los van de component.
 *
 * Apart bestand omdat een module die zowel componenten als constanten
 * exporteert fast refresh breekt: bij elke wijziging herlaadt dan de hele
 * pagina in plaats van alleen het onderdeel.
 *
 * Alles is hier tekst, omdat het uit invoervelden komt. Leeg blijft leeg: dat
 * wordt null in de database, en dan laat het dashboard dat cijfer weg in plaats
 * van iets te tonen wat nergens op rust.
 */
export type Aannamewaarden = {
  kind: AgentSoort;
  minutesSavedPerAction: string;
  minutesSavedBasis: string;
  hourlyRate: string;
  hourlyRateBasis: string;
  fairUsePerMonth: string;
  overagePrice: string;
};

export const LEGE_AANNAMES: Aannamewaarden = {
  kind: "chat_assistent",
  minutesSavedPerAction: "",
  minutesSavedBasis: "",
  hourlyRate: "",
  hourlyRateBasis: "",
  fairUsePerMonth: "",
  overagePrice: "1",
};

/** Lege invoer wordt null, zodat het dashboard het cijfer weglaat. */
export function alsGetal(v: string): number | null {
  const schoon = v.trim().replace(",", ".");
  if (schoon === "") return null;
  const n = Number(schoon);
  return Number.isFinite(n) ? n : null;
}

export function alsTekst(v: string): string | null {
  return v.trim() === "" ? null : v.trim();
}
