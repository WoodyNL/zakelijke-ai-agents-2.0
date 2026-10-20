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
};

export type Oordeel =
  | { doen: "beantwoorden" }
  | { doen: "mens"; reden: string }
  | { doen: "negeren"; reden: string };

/** Hoeveel beurten de agent een gesprek mag voeren voordat een mens het overneemt. */
export const MAX_ANTWOORDEN = 3;

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
      return !/wil je geen post meer van ons\?/i.test(kaal) &&
        !/zakelijkeaiagents\.nl\/afmelden/i.test(kaal);
    })
    .join("\n");
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

  // 3. Een adres dat niet in de lijst staat. We weten niet wie dit is, en dus
  //    ook niet waar het gesprek over gaat.
  if (!b.bekendContact) {
    return { doen: "mens", reden: "afzender staat niet in de contactenlijst" };
  }

  // 4. Een gesprek dat blijft duren. Drie beurten is genoeg om een vraag te
  //    beantwoorden en een bezorging af te spreken; daarna is er iets aan de
  //    hand wat een mens moet zien.
  if (b.eerdereAntwoorden >= MAX_ANTWOORDEN) {
    return {
      doen: "mens",
      reden: `de agent heeft al ${b.eerdereAntwoorden} keer geantwoord in dit gesprek`,
    };
  }

  // 5. Niets om op te antwoorden. Resend levert de tekst apart aan, en dat
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
