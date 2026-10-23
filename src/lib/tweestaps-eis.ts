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
 * `stand` mag null zijn — dan is er niets bekend. Voor een beheerder is dat
 * geen reden om de deur dicht te gooien: de aanroeper besluit dat, want die
 * weet of de vraag mislukte of dat er werkelijk niets stond.
 */
export function beoordeelTweedeStap(isBeheerder: boolean, stand: TweestapsStand | null): Eis {
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
