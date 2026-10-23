/**
 * Mag de agent op dit binnengekomen bericht antwoorden?
 *
 * Automatisch antwoorden op e-mail is de gevaarlijkste functie in dit
 * platform. Niet omdat het antwoord fout kan zijn — dat kan een mens ook —
 * maar omdat e-mail terugpraat. Zet iemand een afwezigheidsassistent aan, dan
 * antwoordt die op ons antwoord, en dan hebben twee machines een gesprek dat
 * niemand stopt. Dat kost geen mail maar een verzenddomein, en dat herstelt
 * traag.
 *
 * Daarom staat hier één functie die van tevoren beslist, met alle redenen om
 * níét te antwoorden bij elkaar. Twijfel gaat naar een mens: die leest het
 * bericht toch al op het antwoordenscherm, dus niets beantwoorden betekent
 * niet dat er niets gebeurt.
 *
 * Puur en zonder imports, zodat het te testen is zonder netwerk.
 */

import { vraagtOverdracht } from "./overdrachtswoorden.ts";

/** Wat er over een binnengekomen bericht bekend is. */
export type Binnenkomend = {
  tekst: string;
  onderwerp: string | null;
  /** De kopregels zoals Resend ze meelevert, in kleine letters. */
  kopregels: Record<string, string>;
  /** Hoort dit adres bij een contact in de lijst? */
  bekendContact: boolean;
  /** Hoeveel keer de agent dit contact al automatisch heeft geantwoord. */
  eerdereAntwoorden: number;
  /**
   * Woorden waarbij een mens het overneemt. Laat leeg om die regel niet te
   * gebruiken; de aanroeper vult de ingestelde of de standaardlijst.
   */
  overdrachtswoorden?: readonly string[];
};

export type Oordeel =
  | { doen: "beantwoorden" }
  /**
   * Nog één keer antwoorden, en daarin het gesprek overdragen aan een mens.
   *
   * Dit is de laatste beurt en niet de eerste daarna. Zwijgen bij beurt elf
   * van een levendig gesprek is het slechtste wat er kan gebeuren: wie zo
   * lang doorschrijft heeft belangstelling, en die krijgt dan stilte op het
   * moment dat hij het meest geïnteresseerd is.
   */
  | { doen: "overdragen"; reden: string }
  | { doen: "mens"; reden: string }
  | { doen: "negeren"; reden: string };

/**
 * Hoeveel beurten de agent een gesprek mag voeren voordat een mens het
 * overneemt.
 *
 * Dit stond op drie, en dat bleek te krap voor waar het voor bedoeld is. Het
 * kortste gesprek dat tot een proefpakket leidt is al drie beurten: de vraag
 * beantwoorden, het adres voorleggen, de afspraak bevestigen. Eén tussenvraag
 * — en die komt er altijd — en de agent stopt vlak voordat het doel bereikt
 * is. Precies het tegenovergestelde van wat hij moet doen.
 *
 * Tien dus. Dat is geen afweging over veiligheid: wat een lus tussen twee
 * machines voorkomt, zijn de kopregels van een automatisch bericht, de
 * afmeldherkenning en de eis dat de afzender in de lijst staat. Die staan
 * hierboven, grijpen binnen één of twee beurten in, en veranderen niet. Dit
 * getal is een rem op een gesprek dat nergens heen gaat en op wat het kost,
 * niet op een gesprek dat vordert.
 *
 * Waarom tien en niet zes: iemand die echt belangstelling heeft, stelt meer
 * dan één vraag. Houdbaarheid, levertijden, wat er nog meer is, en pas dan
 * het adres. Stopt de agent halverwege zo'n gesprek, dan valt de stilte
 * precies op het moment dat iemand het meest geïnteresseerd is. Dat kost een
 * klant; tien beurten kosten een paar dubbeltjes aan modelgebruik.
 */
export const MAX_ANTWOORDEN = 10;

/**
 * Is dit door een machine gestuurd?
 *
 * De kopregels zijn de betrouwbare weg: een afwezigheidsassistent die zich aan
 * de afspraken houdt, zet `Auto-Submitted` of `X-Autoreply`. Maar lang niet
 * iedereen houdt zich eraan, dus kijken we ook naar de onderwerpregel — en die
 * is in het Nederlands én het Engels te herkennen.
 */
export function isAutomatischBericht(b: Binnenkomend): boolean {
  const k = b.kopregels;
  const auto = (k["auto-submitted"] ?? "").toLowerCase();
  if (auto && auto !== "no") return true;
  if (k["x-autoreply"] || k["x-autorespond"] || k["x-auto-response-suppress"]) return true;

  const pre = (k["precedence"] ?? "").toLowerCase();
  if (pre === "bulk" || pre === "auto_reply" || pre === "junk" || pre === "list") return true;

  // Een bounce of een lijstbericht is ook geen mens.
  if (k["list-unsubscribe"] || k["list-id"]) return true;
  const van = (k["from"] ?? "").toLowerCase();
  if (/mailer-daemon|postmaster|no-?reply|noreply|do-?not-?reply/.test(van)) return true;

  const o = (b.onderwerp ?? "").toLowerCase().replace(/^((re|fwd?|aw|antw)\s*:\s*)+/i, "");
  return /^(automatisch antwoord|automatic reply|out of (the )?office|afwezig|afwezigheid|vakantie|autoreply|auto-?reply|undeliverable|delivery status|mail delivery)/.test(
    o,
  );
}

/**
 * Vraagt deze persoon om geen post meer te krijgen?
 *
 * Dan mag er geen antwoord terug. Iemand die "haal me van de lijst" schrijft en
 * een vriendelijke verkoopmail terugkrijgt, heeft gelijk als hij boos wordt —
 * en wettelijk ook.
 */
export function vraagtAfmelding(tekst: string): boolean {
  const t = tekst.toLowerCase();
  // Twee Nederlandse eigenaardigheden zitten hierin verwerkt, allebei gevonden
  // doordat de test hele zinnen gebruikt en geen losse woorden.
  //
  // "Afmeld" alleen matcht niet op "afmelden", en zo schrijft iedereen het.
  // Vandaar \w* achter de stam.
  //
  // En "schrijf" wordt "schrijven": de f verandert in een v. Een patroon dat
  // alleen naar "uitschrijf" zoekt, mist dus precies de vorm die mensen
  // gebruiken.
  return /\b(afmeld\w*|uitschrij(f|v)\w*|uitgeschreven|verwijder (mij|me)|haal (me|mij) (van|af)|geen (post|mail|e-?mails?) meer|stop met (mailen|sturen)|niet meer mailen|meld (me|mij) af|unsubscribe|opt[- ]?out)\b/.test(
    t,
  );
}

/**
 * Haalt onze eigen afmeldregel uit de tekst.
 *
 * Onder elk bericht dat wij sturen staat "Wil je geen post meer van ons? Meld
 * je af via .../afmelden?s=...". Dat moet daar staan, het is wettelijk
 * verplicht. Maar wie terugschrijft, stuurt onze mail mee onder zijn antwoord
 * — inclusief die regel. En die regel bevat precies de woorden waar
 * vraagtAfmelding op zoekt: "geen post meer" en "afmelden".
 *
 * Daardoor las de agent in elk binnengekomen antwoord een afmelding, ook in
 * "wat zit er in het proefpakket?". Niet in één geval: in álle. Geen enkel
 * antwoord kon ooit beantwoord worden, want onze eigen voettekst komt altijd
 * mee terug.
 *
 * Het weghalen gebeurt per regel en niet vanaf de streep, zodat het ook werkt
 * als het citaat midden in de tekst staat — wat het altijd doet.
 */
export function zonderOnzeAfmeldregel(tekst: string): string {
  return tekst
    .split(/\r?\n/)
    .filter((r) => {
      // Citaattekens eraf: in een antwoord staat onze regel als "> Wil je...".
      const kaal = r.replace(/^[\s>]+/, "");
      return (
        !/wil je geen post meer van ons\?/i.test(kaal) &&
        !/zakelijkeaiagents\.nl\/afmelden/i.test(kaal)
      );
    })
    .join("\n");
}

/**
 * Hoe lang stilte duurt voordat het een nieuw gesprek is.
 *
 * De teller van beurten keek naar alles wat de agent dit contact ooit had
 * geantwoord. Dat is een andere regel dan hij lijkt: een klant die in oktober
 * een gesprek voert en in maart terugschrijft, is dan voorgoed over zijn
 * beurten heen en krijgt nooit meer antwoord. Niet omdat er iets mis is, maar
 * omdat hij een halfjaar eerder al eens iets vroeg.
 *
 * Dertig dagen. Daarna is het geen doorlopend gesprek meer maar een nieuw
 * bericht, en begint de teller opnieuw. Voor waar de rem voor bedoeld is —
 * twee machines die elkaar aan de praat houden — verandert er niets: dat
 * gebeurt in minuten, niet in maanden.
 *
 * Dit bepaalt ook wat de agent als "eerder in dit gesprek" te lezen krijgt.
 * Een antwoord van een halfjaar geleden als gespreksgeschiedenis meegeven is
 * net zo verkeerd als erop doortellen.
 */
export const GESPREKSVENSTER_DAGEN = 30;

/** Het moment waarvóór een antwoord niet meer bij dit gesprek hoort. */
export function gespreksvenster(nu: Date): string {
  return new Date(nu.getTime() - GESPREKSVENSTER_DAGEN * 86_400_000).toISOString();
}

/**
 * Het oordeel.
 *
 * De volgorde is niet willekeurig: eerst de dingen die schade doen als je ze
 * mist, dan pas de dingen die alleen ongemak opleveren.
 */
export function beoordeelAntwoord(b: Binnenkomend): Oordeel {
  // Onze eigen voettekst eruit, de rest laten staan. Bewust niet alleen het
  // niet-aangehaalde deel bekijken: wie onder het citaat typt — en dat doen
  // genoeg mensen — zou dan een afmelding kunnen schrijven die wij missen.
  // Een afmelding missen is het ergste wat hier kan gebeuren.
  const zonderOns = zonderOnzeAfmeldregel(b.tekst);

  // Wat deze persoon zelf heeft getypt, zonder het aangehaalde deel.
  const eigenWoorden = zonderCitaat(b.tekst);

  // 1. Een machine. Hier zit de lus, dus dit staat vooraan. Niet naar een mens
  //    ook: een afwezigheidsmelding hoeft niemand te lezen.
  if (isAutomatischBericht(b)) {
    return { doen: "negeren", reden: "automatisch bericht, geen antwoord van een mens" };
  }

  // 2. Afmelden. Nooit een verkoopmail terug naar wie om rust vraagt.
  if (vraagtAfmelding(zonderOns)) {
    return { doen: "mens", reden: "vraagt om geen post meer te krijgen" };
  }

  /*
   * 3. Waar het over gaat. Een klacht, iets met eten, een jurist.
   *
   * Hier gaat het niet om wat de agent zou antwoorden maar om dat hij
   * antwoordt. Wie schrijft dat de vorige levering bedorven was en binnen een
   * minuut een opgewekte aanbieding voor gratis kipsaté terugkrijgt, is
   * daarna niet boos op de agent maar op het bedrijf.
   *
   * Alleen in wat hij zélf schreef, niet in het aangehaalde deel. Onder zijn
   * antwoord staat onze eigen mail, en die bevat de tekst van de campagne —
   * zou daar een van deze woorden in staan, dan ging deze regel bij élk
   * antwoord af en zweeg de agent tegen iedereen. Dat is precies wat de
   * afmeldregel op 21 oktober deed.
   */
  const woord = vraagtOverdracht(eigenWoorden, b.overdrachtswoorden ?? []);
  if (woord) {
    return { doen: "mens", reden: `schrijft over "${woord}" — dit wil je zelf lezen` };
  }

  // 4. Een adres dat niet in de lijst staat. We weten niet wie dit is, en dus
  //    ook niet waar het gesprek over gaat.
  if (!b.bekendContact) {
    return { doen: "mens", reden: "afzender staat niet in de contactenlijst" };
  }

  /*
   * 5. Een gesprek dat lang duurt.
   *
   * Precies op de grens volgt nog één bericht waarin de agent het gesprek
   * overdraagt; daarna is hij stil. Dat "precies" is geen toeval en geen
   * extra administratie: elk verstuurd antwoord telt er één bij op, dus deze
   * gelijkheid doet zich per gesprek één keer voor. De overdracht zelf is
   * ook een antwoord, dus het bericht erna valt al in de regel eronder.
   */
  if (b.eerdereAntwoorden === MAX_ANTWOORDEN) {
    return {
      doen: "overdragen",
      reden: `na ${b.eerdereAntwoorden} beurten draagt de agent het gesprek over`,
    };
  }
  if (b.eerdereAntwoorden > MAX_ANTWOORDEN) {
    return {
      doen: "mens",
      reden: `het gesprek is al overgedragen na ${MAX_ANTWOORDEN} beurten`,
    };
  }

  // 6. Niets om op te antwoorden. Resend levert de tekst apart aan, en dat
  //    kan mislukken; dan staat er een leeg bericht in het scherm. En wie
  //    alleen ons eigen citaat terugstuurt zonder er iets boven te typen,
  //    heeft ook niets gevraagd — dan krijgt het model een lege vraag.
  if (eigenWoorden.trim().length < 2) {
    return { doen: "mens", reden: "geen leesbare tekst in het bericht" };
  }

  return { doen: "beantwoorden" };
}

/**
 * Haalt het aangehaalde deel onder een antwoord weg.
 *
 * Wie terugschrijft, stuurt onze eigen mail mee onder zijn antwoord. Dat
 * ongefilterd aan het model geven is twee keer verkeerd: het is lang, en het
 * model gaat reageren op onze eigen zinnen alsof de klant ze schreef.
 */
export function zonderCitaat(tekst: string): string {
  const regels = tekst.split(/\r?\n/);
  const uit: string[] = [];
  for (const r of regels) {
    if (/^\s*>/.test(r)) break;
    // "Op 19 okt 2026 om 12:12 heeft ... geschreven:" en Engelse varianten.
    if (/^\s*(op|on)\s+.{4,60}\s+(heeft|schreef|wrote)\b.*:\s*$/i.test(r)) break;
    if (/^\s*-{2,}\s*(origineel|original|forwarded)/i.test(r)) break;
    if (/^\s*van:\s|^\s*from:\s/i.test(r)) break;
    uit.push(r);
  }
  return uit.join("\n").trim();
}
