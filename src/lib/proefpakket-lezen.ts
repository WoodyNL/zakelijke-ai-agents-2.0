/**
 * Wil deze persoon een proefpakket, en op welk adres?
 *
 * Dit is het punt waarop een gesprek verandert in een rit. Komt hier
 * "bevestigd" uit, dan wordt er een vrijdag vastgelegd en rijdt er een
 * chauffeur naartoe. Daarom staan de regels hier los van de modelaanroep,
 * zonder imports, zodat ze zonder netwerk en zonder sleutel na te lopen zijn.
 *
 * De harde eis, en de reden dat dit bestand bestaat: er wordt nooit ingepland
 * op een adres dat de klant niet zelf heeft bevestigd. Ook niet als het adres
 * al jaren in de lijst staat en ook niet als het model er zeker van lijkt. Een
 * oude relatielijst zit vol zaken die verhuisd of overgenomen zijn; de enige
 * die weet waar het pakket heen moet, is de ontvanger. Zegt hij het niet, dan
 * vraagt de agent het en plant niets.
 */

export type Wens = {
  /**
   * - `bevestigd`  — hij wil het pakket én het bezorgadres staat vast.
   * - `wil_pakket` — hij wil het pakket, maar het adres is nog niet bevestigd.
   * - `geen_pakket`— hij wil het niet (meer).
   * - `onduidelijk`— alles daartussenin. Dan gebeurt er niets automatisch.
   */
  stand: "bevestigd" | "wil_pakket" | "geen_pakket" | "onduidelijk";
  /** Alleen bij `bevestigd`: het adres waar de chauffeur heen gaat. */
  adres?: string;
  /** De zin uit zijn mail waarop dat oordeel steunt. Letterlijk. */
  citaat?: string;
  /** Waar het adres vandaan komt. Puur om het later te kunnen navertellen. */
  bron?: "zelf_geschreven" | "lijst_bevestigd";
};

/** Wat er over het contact bekend is op het moment van beoordelen. */
export type Omstandigheden = {
  /** Het adres zoals het nu in de lijst staat, of null. */
  adresInLijst: string | null;
  /** Heeft de agent in dit gesprek al eens geantwoord? */
  eerderGeantwoord: boolean;
};

/**
 * Wat het model teruggaf omzetten in iets waar een bus op mag rijden.
 *
 * Twee dingen worden hier gecontroleerd en niet geloofd.
 *
 * Het citaat moet letterlijk in zijn mail staan. Een model dat een adres
 * "herinnert" uit de instructie in plaats van het te lezen, levert een adres
 * op dat nergens op steunt — en dat merk je pas vrijdagochtend. Staat het
 * citaat er niet letterlijk in, dan is de hele uitkomst verdacht.
 *
 * En een bevestiging van een adres dat wij aandroegen telt alleen als wij het
 * ook echt hebben aangedragen: er moet een adres in de lijst staan én de agent
 * moet al eens geantwoord hebben. Anders bevestigt iemand iets wat hij nooit
 * heeft gezien.
 */
export function beoordeelWens(ruw: string, origineel: string, omst: Omstandigheden): Wens {
  const schoon = ruw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();

  let uit: { stand?: string; adres?: string; citaat?: string };
  try {
    uit = JSON.parse(schoon) as typeof uit;
  } catch {
    return { stand: "onduidelijk" };
  }

  if (uit.stand === "geen_pakket") return { stand: "geen_pakket" };
  if (uit.stand === "wil_pakket") return { stand: "wil_pakket" };
  if (uit.stand !== "bevestigd") return { stand: "onduidelijk" };

  // Vanaf hier gaat er een chauffeur rijden. Alles moet kloppen.
  const citaat = uit.citaat?.trim();
  if (!citaat) return { stand: "onduidelijk" };
  if (!normaliseer(origineel).includes(normaliseer(citaat))) return { stand: "onduidelijk" };

  const geschreven = uit.adres?.trim();
  if (geschreven) {
    // Hij heeft het adres zelf getypt. Dan is dat het adres, ook als het
    // afwijkt van wat er in de lijst stond — hij weet het beter dan wij.
    return { stand: "bevestigd", adres: geschreven, citaat, bron: "zelf_geschreven" };
  }

  // Geen adres in de mail: dit is een "ja, dat klopt" op het adres dat wij
  // noemden. Dan moeten wij het ook genoemd kunnen hebben.
  if (!omst.adresInLijst || !omst.eerderGeantwoord) {
    return { stand: "wil_pakket" };
  }
  return { stand: "bevestigd", adres: omst.adresInLijst, citaat, bron: "lijst_bevestigd" };
}

/**
 * Regelafbrekingen en dubbele spaties wegwerken voor de citaatcontrole.
 *
 * Een mailtekst komt met harde regeleindes binnen, dus een citaat dat over
 * twee regels loopt staat er letterlijk wel in maar matcht niet op tekens.
 */
function normaliseer(t: string): string {
  return t.replace(/\s+/g, " ").trim().toLowerCase();
}
