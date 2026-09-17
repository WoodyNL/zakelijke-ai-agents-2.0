/**
 * Wat er uit een antwoord op de bezorgbevestiging komt.
 *
 * Deze regels staan los van de modelaanroep, zonder afhankelijkheden, zodat ze
 * te testen zijn zonder netwerk en zonder sleutel. Het is het enige punt in het
 * platform waar iets automatisch verandert waar een mens naar handelt — de
 * chauffeur rijdt naar het adres dat hier uit komt — en dan hoort de regel die
 * dat bewaakt op zichzelf te kunnen worden nagelopen.
 */

export type Uitkomst = {
  stand: "bevestigd" | "ander_adres" | "verzet" | "afgezegd" | "onduidelijk";
  /** Alleen bij ander_adres: het volledige nieuwe adres. */
  adres?: string;
  /** De zin uit de mail waar dat adres in stond. Letterlijk. */
  citaat?: string;
};

/**
 * "vrijdag 25 september" — zoals een mens het zegt, niet 2026-09-25.
 *
 * Een datum in cijfers in een bevestigingsmail dwingt de lezer om te rekenen
 * welke dag dat is, en dat is precies wat je niet wilt bij de enige vraag die
 * je stelt.
 */
export function alsDagInTekst(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const dagen = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
  const maanden = [
    "januari", "februari", "maart", "april", "mei", "juni",
    "juli", "augustus", "september", "oktober", "november", "december",
  ];
  return `${dagen[d.getUTCDay()]} ${d.getUTCDate()} ${maanden[d.getUTCMonth()]}`;
}

/**
 * Wat het model teruggaf omzetten in iets waar een bus op mag rijden.
 *
 * Dit staat los van de aanroep omdat het het enige stuk is dat te testen valt
 * — en het enige stuk dat de chauffeur beschermt. De instructie vraagt om een
 * letterlijk citaat; hier wordt gecontroleerd dat het er ook echt in staat.
 * Vertrouwen dat een instructie is opgevolgd, is geen controle.
 */
export function beoordeelUitkomst(ruw: string, origineel: string): Uitkomst {
  const schoon = ruw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();

  let uit: Uitkomst;
  try {
    uit = JSON.parse(schoon) as Uitkomst;
  } catch {
    return { stand: "onduidelijk" };
  }

  const geldig = ["bevestigd", "ander_adres", "verzet", "afgezegd", "onduidelijk"];
  if (!geldig.includes(uit.stand)) return { stand: "onduidelijk" };

  // Een adres zonder zin eronder is een adres dat het model heeft bedacht. Dat
  // is precies de fout die je pas op vrijdagochtend merkt, dus vangen we hem
  // hier af. Het citaat moet letterlijk in de mail staan: is dat niet zo, dan
  // is de hele uitkomst verdacht en kijkt er een mens naar.
  if (uit.stand === "ander_adres") {
    const citaat = uit.citaat?.trim();
    const adres = uit.adres?.trim();
    if (!adres || !citaat) return { stand: "onduidelijk" };
    if (!normaliseer(origineel).includes(normaliseer(citaat))) return { stand: "onduidelijk" };
    return { stand: "ander_adres", adres, citaat };
  }

  return { stand: uit.stand };
}

/**
 * Regelafbrekingen en dubbele spaties wegwerken voor de citaatcontrole.
 *
 * Een mailtekst komt met harde regeleindes binnen, dus een citaat dat over twee
 * regels loopt staat er letterlijk wel in maar matcht niet op tekens. Zonder
 * dit zou elke correctie in een langere zin op "onduidelijk" uitkomen.
 */
function normaliseer(t: string): string {
  return t.replace(/\s+/g, " ").trim().toLowerCase();
}
