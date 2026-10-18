/**
 * De regels van de afsprakenagent, zonder database en zonder model.
 *
 * Welke herinnering nu aan de beurt is, hoe een antwoord van de klant gelezen
 * wordt (ja, verzetten, annuleren, of onduidelijk), en wat er in de berichten
 * staat. Het lezen van antwoorden is bewust conservatief: "ja" en "bevestig"
 * zijn een bevestiging, maar alles met twijfel of een nieuwe wens gaat naar een
 * mens. Een agent die "ja, maar kan het ook donderdag?" als bevestiging leest,
 * zet iemand op het verkeerde moment in de agenda.
 */

export type AfspraakVoorHerinnering = {
  begint_op: string; // ISO-tijdstip
  status: string;
  herinnerd: number[];
};

/** Leest ["48","2"] uit de instelling; gesorteerd van ver weg naar dichtbij. */
export function leesHerinnerUren(ruw: unknown): number[] {
  if (!Array.isArray(ruw)) return [48, 2];
  const n = ruw
    .map((x) => Number(String(x).trim()))
    .filter((x) => Number.isFinite(x) && x > 0 && x <= 24 * 14)
    .map(Math.round);
  const uniek = [...new Set(n)].sort((a, b) => b - a);
  return uniek.length > 0 ? uniek : [48, 2];
}

/**
 * Welke herinnering (uren vooraf) nu verstuurd moet worden, of null.
 *
 * Een herinnering die te laat zou komen (de afspraak begint over minder dan
 * de helft van het ingestelde aantal uren) wordt overgeslagen in plaats van
 * alsnog verstuurd: een "herinnering 48 uur vooraf" die drie uur vooraf
 * binnenkomt, verwart.
 */
export function herinneringNodig(
  a: AfspraakVoorHerinnering,
  uren: number[],
  nu = new Date(),
): number | null {
  if (a.status !== "gepland" && a.status !== "bevestigd") return null;
  const resterend = (new Date(a.begint_op).getTime() - nu.getTime()) / 3_600_000;
  if (resterend <= 0) return null;
  for (const u of uren) {
    if (a.herinnerd.includes(u)) continue;
    if (resterend <= u && resterend > u / 2) return u;
  }
  return null;
}

export type Antwoordsoort = "bevestigd" | "verzetten" | "annuleren" | "onbekend";

/** Leest het antwoord van een klant op een herinnering. Twijfel is onbekend. */
export function leesAntwoord(tekst: string): Antwoordsoort {
  const t = tekst
    .split(/\n(?:>|On .* wrote:|Op .* schreef)/)[0]!
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s?]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const kort = t.slice(0, 200);
  const annuleer =
    /\b(annuleer|annuleren|afzeggen|zeg af|cancel|gaat niet door|komt niet door|niet meer nodig)\b/.test(
      kort,
    );
  const verzet =
    /\b(verzet|verzetten|verplaats|verplaatsen|ander moment|andere dag|andere tijd|kan het ook|lukt niet|schikt niet|kan niet|liever)\b/.test(
      kort,
    ) || kort.includes("?");
  const ja =
    /^(ja|yes|ok|oke|oké|okay|prima|akkoord|bevestig|bevestigd|top|is goed|klopt|tot dan|zie je dan|komt goed)\b/.test(
      kort,
    ) || /\b(ik bevestig|hierbij bevestig|bij deze bevestig|afspraak staat)\b/.test(kort);
  if (annuleer && !verzet) return "annuleren";
  if (verzet) return "verzetten";
  if (ja) return "bevestigd";
  return "onbekend";
}

const nlMoment = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });

export function herinneringTekst(o: {
  uren: number;
  afspraak: {
    klant_naam: string | null;
    begint_op: string;
    omschrijving: string | null;
    locatie: string | null;
    status: string;
  };
  bedrijfsnaam: string;
  ondertekening: string;
  verzettenTotUur: number;
}): { onderwerp: string; tekst: string } {
  const a = o.afspraak;
  const aanhef = a.klant_naam ? `Beste ${a.klant_naam},` : "Beste,";
  const wat = a.omschrijving ? ` voor ${a.omschrijving}` : "";
  const waar = a.locatie ? `\nLocatie: ${a.locatie}` : "";
  const bevestigVraag =
    a.status === "bevestigd" ? "" : "\n\nKun je met een kort 'ja' bevestigen dat je komt?";
  const verzetten =
    o.verzettenTotUur > 0
      ? `\n\nSchikt het toch niet? Antwoord dan op deze mail met wanneer het wél kan; dat kan tot ${o.verzettenTotUur} uur van tevoren.`
      : "";
  return {
    onderwerp:
      o.uren >= 24
        ? `Herinnering: je afspraak op ${nlMoment(a.begint_op)}`
        : `Vandaag: je afspraak om ${new Date(a.begint_op).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" })}`,
    tekst: `${aanhef}\n\nEen herinnering aan je afspraak${wat} bij ${o.bedrijfsnaam} op ${nlMoment(a.begint_op)}.${waar}${bevestigVraag}${verzetten}\n\n${o.ondertekening}`,
  };
}

export function noShowTekst(o: {
  klant_naam: string | null;
  begint_op: string;
  bedrijfsnaam: string;
  ondertekening: string;
}): { onderwerp: string; tekst: string } {
  const aanhef = o.klant_naam ? `Beste ${o.klant_naam},` : "Beste,";
  return {
    onderwerp: `We misten je — nieuwe afspraak?`,
    tekst: `${aanhef}\n\nWe hadden een afspraak op ${nlMoment(o.begint_op)}, maar we hebben je gemist. Dat kan gebeuren. Wil je een nieuwe afspraak? Antwoord op deze mail met een dag en tijd die je schikt, dan regelen we het.\n\n${o.ondertekening}`,
  };
}

export function wachtlijstTekst(o: {
  naam: string | null;
  begint_op: string;
  bedrijfsnaam: string;
  ondertekening: string;
}): { onderwerp: string; tekst: string } {
  const aanhef = o.naam ? `Beste ${o.naam},` : "Beste,";
  return {
    onderwerp: `Er is een plek vrijgekomen bij ${o.bedrijfsnaam}`,
    tekst: `${aanhef}\n\nJe stond op onze wachtlijst. Er is net een plek vrijgekomen op ${nlMoment(o.begint_op)}. Wil je die? Antwoord met 'ja', dan is hij van jou — wie het eerst reageert, krijgt de plek.\n\n${o.ondertekening}`,
  };
}
