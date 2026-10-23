/**
 * Wie moet een tweede stap hebben, en wanneer?
 *
 * Eén beslissing, apart gezet en apart te testen, omdat de twee manieren
 * waarop dit fout kan gaan allebei duur zijn. Te los betekent dat een
 * beheerdersaccount aan één wachtwoord hangt terwijl het bij alle klantdata
 * kan. Te streng betekent dat de enige beheerder zichzelf buitensluit, en op
 * Lovable Cloud is er geen databaseconsole om jezelf weer binnen te laten.
 *
 * De uitkomst is daarom nooit "weg", maar "dit moet je eerst doen".
 */

/** Wat Supabase over de tweede stap van deze gebruiker meldt. */
export type TweestapsStand = {
  /** Heeft hij een bevestigde authenticator-app gekoppeld? */
  ingesteld: boolean;
  /** `aal2` betekent: in deze sessie ook echt een code ingevuld. */
  niveau: string;
};

export type Eis =
  /** Alles in orde, of niet van toepassing. */
  | { stand: "mag" }
  /**
   * We weten het niet. Alleen voor een beheerder een belemmering, en
   * nadrukkelijk iets anders dan "staat uit": wie hem wél aan heeft en dit
   * scherm te zien krijgt, moet niet gaan instellen wat er al staat.
   */
  | { stand: "onbekend"; uitleg: string }
  /** Hij moet een authenticator koppelen voordat hij verder kan. */
  | { stand: "moet_aanzetten"; uitleg: string }
  /** Hij heeft er een, maar deze sessie is er nog geen code ingevuld. */
  | { stand: "moet_bevestigen"; uitleg: string };

/**
 * De regel.
 *
 * Voor een beheerder is de tweede stap verplicht: heeft hij er geen, dan kan
 * hij niets in het beheer doen behalve er een instellen.
 *
 * Voor ieder ander blijft het vrijwillig, maar wie hem aan heeft moet hem ook
 * gebruiken. Dat verschil is met opzet: hem aanzetten mag nooit nadelig
 * uitpakken, anders zet niemand hem aan.
 *
 * `bekend` op false betekent: de vraag aan de database mislukte, we weten het
 * dus niet. Voor een beheerder is dat geen toestemming — maar het is ook niet
 * hetzelfde als "staat uit", en dat onderscheid hoort op het scherm. Iemand
 * die zijn authenticator allang heeft, moet niet te horen krijgen dat hij er
 * een moet instellen; dan gaat hij zoeken naar een knop die er niet is.
 */
export function beoordeelTweedeStap(
  isBeheerder: boolean,
  stand: TweestapsStand | null,
  bekend = true,
): Eis {
  if (!bekend) {
    if (!isBeheerder) return { stand: "mag" };
    return {
      stand: "onbekend",
      uitleg:
        "We konden je tweestapsverificatie even niet controleren. Er is niets gewijzigd; probeer het zo opnieuw.",
    };
  }

  const ingesteld = stand?.ingesteld === true;
  const bevestigd = stand?.niveau === "aal2";

  if (!ingesteld) {
    if (!isBeheerder) return { stand: "mag" };
    return {
      stand: "moet_aanzetten",
      uitleg:
        "Beheerders hebben tweestapsverificatie nodig. Zet hem aan bij Account, dan kun je verder.",
    };
  }

  if (!bevestigd) {
    return {
      stand: "moet_bevestigen",
      uitleg:
        "Bevestig eerst je tweestapsverificatie. Log opnieuw in en vul de code uit je app in.",
    };
  }

  return { stand: "mag" };
}

/**
 * Een mislukte controle geeft een beheerder nooit toestemming.
 *
 * De beslissing zelf staat hierboven, zodat het scherm en de server niet uit
 * elkaar kunnen lopen: deze functie vertaalt alleen het antwoord van de
 * database naar die ene regel, en gooit wat eruit komt.
 */
export function controleerTweedeStap(
  isBeheerder: boolean,
  resultaat: { data: unknown; error: { message: string } | null },
): void {
  if (resultaat.error) {
    // Voor support blijft het bestaande gedrag ongewijzigd.
    const eis = beoordeelTweedeStap(isBeheerder, null, false);
    if (eis.stand !== "mag") throw new Error(eis.uitleg);
    return;
  }
  const rijen = Array.isArray(resultaat.data) ? resultaat.data : [];
  const stand = rijen[0] as TweestapsStand | undefined;
  const eis = beoordeelTweedeStap(isBeheerder, stand ?? null);
  if (eis.stand !== "mag") throw new Error(eis.uitleg);
}
