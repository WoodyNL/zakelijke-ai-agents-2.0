/**
 * Een aangeleverde lijst omzetten naar contacten.
 *
 * De lijst komt zoals hij komt: een export uit een boekhoudpakket, een
 * spreadsheet die jaren is bijgehouden door verschillende mensen, kolommen in
 * het Nederlands of Engels, lege regels ertussen, hetzelfde adres drie keer.
 * Vragen of de klant het even netjes aanlevert werkt niet — dan komt de lijst
 * niet.
 *
 * Daarom raadt dit bestand de kolommen zelf en laat het de uitkomst zien
 * voordat er iets wordt opgeslagen. Raden mag hier, want een mens kijkt er nog
 * naar. Wat niet mag is stilzwijgend iets weggooien: elke overgeslagen regel
 * krijgt een reden, zodat zichtbaar is wat er niet is geïmporteerd.
 */

export type Kolomsoort =
  | "email"
  | "naam"
  | "voornaam"
  | "achternaam"
  | "bedrijf"
  | "plaats"
  | "adres"
  | "postcode"
  | "telefoon"
  | "herkomst"
  | "notitie"
  | "prioriteit"
  | "negeren";

/**
 * Woorden die een kolom verraden. Volgorde binnen een lijst doet er niet toe;
 * de score bepaalt wat wint.
 *
 * Bewust géén losse "relatie": een CRM-export begint met "Unieke relatiecode",
 * en dat is een klantnummer, geen bedrijfsnaam. Dat is precies hoe de eerste
 * echte lijst de vorige versie onderuit haalde.
 */
const KOPPEN: Record<Exclude<Kolomsoort, "negeren">, string[]> = {
  email: ["e-mail", "email", "mail", "emailadres", "e-mailadres"],
  voornaam: ["voornaam", "first name", "firstname"],
  achternaam: ["achternaam", "last name", "lastname", "familienaam"],
  naam: ["naam", "contactpersoon", "contact", "name", "volledige naam"],
  bedrijf: ["bedrijf", "bedrijfsnaam", "relatienaam", "klantnaam", "company", "zaak", "handelsnaam"],
  plaats: ["plaats", "stad", "woonplaats", "vestigingsplaats", "city", "gemeente"],
  adres: ["adres", "straat", "straatnaam", "address", "street"],
  postcode: ["postcode", "postcodes", "zip", "postal code"],
  telefoon: ["telefoon", "tel", "telefoonnummer", "mobiel", "phone", "gsm"],
  herkomst: ["prospect/klant", "prospect / klant", "soort relatie", "relatiesoort", "type relatie"],
  notitie: ["notitie", "notities", "opmerking", "opmerkingen", "toelichting", "bijzonderheden"],
  prioriteit: ["prioriteit", "priority", "score"],
};

/**
 * Maakt van een kopregel het stuk dat er werkelijk toe doet.
 *
 * Boekhoudpakketten zetten er een categorie voor en een toelichting achter:
 * "Factuurgegevens / Bedrijfsnaam", "Algemeen / Email (algemeen)",
 * "Factuurgegevens / Bedrijfsnaam 2". Alleen het laatste stuk zegt iets.
 */
function kernVanKop(ruw: string): string {
  let t = ruw.trim().toLowerCase();
  // De categorie wordt gescheiden door een schuine streep mét spaties eromheen:
  // "Instellingen / Prospect/Klant". Knippen op de láátste schuine streep zou
  // daar "klant" van maken en de kolom onherkenbaar; knippen op " / " houdt het
  // veld heel.
  const schuin = t.lastIndexOf(" / ");
  if (schuin > 0) t = t.slice(schuin + 3);
  t = t.replace(/\([^)]*\)/g, " ");       // "(algemeen)" weg
  t = t.replace(/\s*\d+\s*$/, "");         // "Bedrijfsnaam 2" -> "bedrijfsnaam"
  return t.replace(/\s+/g, " ").trim();
}

/** Komt het woord als heel woord voor, en niet als deel van een langer woord? */
function heelWoord(tekst: string, woord: string): boolean {
  const i = tekst.indexOf(woord);
  if (i < 0) return false;
  const voor = i === 0 ? "" : tekst[i - 1]!;
  const na = tekst[i + woord.length] ?? "";
  const grens = (c: string) => c === "" || !/[a-z0-9]/.test(c);
  return grens(voor) && grens(na);
}

/**
 * Herkent een e-mailadres goed genoeg om een lijst te schonen.
 *
 * Bewust niet de volledige RFC: die laat adressen toe die in de praktijk nooit
 * voorkomen, en het doel hier is niet correctheid maar voorkomen dat er onzin
 * de lijst in glipt waar later een mail naartoe gaat.
 */
export function geldigEmail(waarde: string): boolean {
  const s = waarde.trim();
  if (s.length < 6 || s.length > 254) return false;
  if (!/^[^\s@,;]+@[^\s@,;]+\.[a-z]{2,}$/i.test(s)) return false;
  // Twee punten achter elkaar of een punt tegen de apenstaart aan is bijna
  // altijd een verminkte export.
  if (s.includes("..") || s.includes(".@") || s.includes("@.")) return false;
  return true;
}

export function normaliseerEmail(waarde: string): string {
  return waarde.trim().toLowerCase();
}

/** Haalt uit een cel het eerste bruikbare adres; exports zetten er soms twee in één veld. */
export function eersteEmail(cel: string): string | null {
  for (const ruw of cel.split(/[,;\s]+/)) {
    // Mailprogramma's exporteren vaak als "Frank <frank@...>", en een cel
    // eindigt geregeld op een punt of komma. Dat omhulsel hoort niet bij het
    // adres, dus halen we het eraf voordat we oordelen.
    const deel = ruw.replace(/^[<([{"']+/, "").replace(/[>)\]}"'.,;:]+$/, "");
    if (geldigEmail(deel)) return normaliseerEmail(deel);
  }
  return null;
}

/**
 * Raadt per kolom wat erin staat.
 *
 * De eerste echte klantlijst haalde de vorige aanpak onderuit, en het is
 * leerzaam hoe. Die liep de kolommen van links naar rechts af en gaf elke
 * kolom de eerste soort die paste. Kolom 0 heette "Unieke relatiecode", dat
 * bevatte "relatie", en dus werd het klantnummer de bedrijfsnaam. Kolom 1 heette
 * "Factuurgegevens / Bedrijfsnaam", maar bedrijf was al vergeven, en die kwam
 * terecht op naam. Resultaat: tweehonderd mails die een slagerij aanspreken
 * alsof het een persoon is.
 *
 * Twee dingen zijn daarom veranderd. Er wordt gescoord in plaats van gegrepen,
 * en pas als alles gescoord is wordt er toegewezen — hoogste score eerst. En er
 * wordt op hele woorden gematcht, zodat "relatiecode" niet meer meetelt als
 * "relatie".
 */
export function raadKolommen(rijen: string[][]): Kolomsoort[] {
  const kop = rijen[0] ?? [];
  const breedte = Math.max(...rijen.map((r) => r.length), 0);
  const uitkomst: Kolomsoort[] = Array(breedte).fill("negeren");
  const soorten = Object.entries(KOPPEN) as [Exclude<Kolomsoort, "negeren">, string[]][];

  const kandidaten: Array<{ kolom: number; soort: Kolomsoort; score: number }> = [];
  for (let i = 0; i < breedte; i++) {
    const kern = kernVanKop(kop[i] ?? "");
    if (!kern) continue;
    for (const [soort, woorden] of soorten) {
      let beste = 0;
      for (const woord of woorden) {
        if (kern === woord) beste = Math.max(beste, 100);
        else if (heelWoord(kern, woord)) beste = Math.max(beste, 50 + woord.length);
      }

      // Een export heeft vaak twee adressen: waar de factuur heen gaat en waar
      // de goederen heen gaan. Voor een bezorging is dat tweede het juiste, ook
      // al scoren de kopregels gelijk omdat er in beide gevallen "Adres" staat.
      // Bij Frank verschillen ze elf keer, en juist die elf zijn de plek waar de
      // doos moet zijn.
      const volledig = (kop[i] ?? "").toLowerCase();
      if (
        beste > 0 &&
        (soort === "adres" || soort === "postcode") &&
        /verzend|aflever|bezorg/.test(volledig)
      ) {
        beste += 10;
      }

      if (beste > 0) kandidaten.push({ kolom: i, soort, score: beste });
    }
  }

  // Hoogste score eerst; bij gelijke score wint de linkerkolom, want een export
  // zet de belangrijkste gegevens vooraan. Zo wint "Factuurgegevens / Plaats"
  // van "Verzendgegevens / Plaats" zonder dat we die regel apart hoeven op te
  // schrijven.
  kandidaten.sort((a, b) => b.score - a.score || a.kolom - b.kolom);

  const kolomBezet = new Set<number>();
  const soortBezet = new Set<Kolomsoort>();
  for (const k of kandidaten) {
    if (kolomBezet.has(k.kolom) || soortBezet.has(k.soort)) continue;
    uitkomst[k.kolom] = k.soort;
    kolomBezet.add(k.kolom);
    soortBezet.add(k.soort);
  }

  // Geen e-mailkolom herkend? Dan kijken we naar de inhoud: de kolom met de
  // meeste geldige adressen. Lijsten zonder kopregel komen vaak genoeg voor.
  if (!soortBezet.has("email")) {
    let beste = -1;
    let meeste = 0;
    for (let i = 0; i < breedte; i++) {
      if (uitkomst[i] !== "negeren") continue;
      const treffers = rijen.filter((r) => eersteEmail(r[i] ?? "") !== null).length;
      if (treffers > meeste) {
        meeste = treffers;
        beste = i;
      }
    }
    if (beste >= 0) uitkomst[beste] = "email";
  }

  return uitkomst;
}

/** Heeft de eerste rij een kopregel, of staan er meteen gegevens? */
export function heeftKopregel(rijen: string[][]): boolean {
  const eerste = rijen[0] ?? [];
  // Een kopregel bevat zelf geen e-mailadres. Dat is een betrouwbaarder
  // signaal dan bekende woorden herkennen, want de koppen kunnen van alles zijn.
  return !eerste.some((cel) => eersteEmail(cel) !== null);
}

export type Herkomst = "oud_klant" | "koud";

export type GelezenContact = {
  email: string;
  naam?: string;
  bedrijf?: string;
  plaats?: string;
  adres?: string;
  postcode?: string;
  telefoon?: string;
  /** Alleen gevuld als het bestand zelf per rij zegt wat voor relatie het is. */
  herkomst?: Herkomst;
  /**
   * Wat er over deze zaak bekend is. Achtergrond voor het bericht, geen tekst
   * die er letterlijk in komt.
   */
  notitie?: string;
  /** 1 is het hoogst; zo geeft oplopend sorteren vanzelf de beste eerst. */
  prioriteit?: 1 | 2 | 3;
};

/** "Hoog", "Midden", "Laag" — of een cijfer dat er al staat. */
export function leesPrioriteit(cel: string): 1 | 2 | 3 | null {
  const t = cel.trim().toLowerCase();
  if (!t) return null;
  if (t.startsWith("hoog") || t.startsWith("high") || t === "1") return 1;
  if (t.startsWith("midden") || t.startsWith("middel") || t.startsWith("med") || t === "2") return 2;
  if (t.startsWith("laag") || t.startsWith("low") || t === "3") return 3;
  return null;
}

/**
 * Leest uit een cel of dit een oud-klant is of een prospect.
 *
 * In de export van FJ Snacks staat een kolom "Prospect/Klant", en het verschil
 * is groot: wie ooit besteld heeft krijgt een ander bericht dan wie alleen ooit
 * in het systeem is gezet. Herkennen we de waarde niet, dan geven we niets
 * terug en valt de rij terug op de keuze die bij de import is gemaakt.
 */
export function leesHerkomst(cel: string): Herkomst | null {
  const t = cel.trim().toLowerCase();
  if (!t) return null;
  if (t.startsWith("klant") || t.startsWith("customer")) return "oud_klant";
  if (t.startsWith("prospect") || t.startsWith("lead")) return "koud";
  return null;
}

export type Overgeslagen = { rij: number; reden: string; inhoud: string };

export type Leesresultaat = {
  contacten: GelezenContact[];
  overgeslagen: Overgeslagen[];
};

/**
 * Zet rijen om naar contacten volgens de kolomindeling.
 *
 * Dubbele adressen binnen hetzelfde bestand worden hier al weggehaald. De
 * database vangt ze ook af, maar dan als foutmelding halverwege een import; het
 * is prettiger om vooraf te kunnen zeggen "er stonden er twaalf dubbel in".
 */
export function leesContacten(
  rijen: string[][],
  kolommen: Kolomsoort[],
  sla_eerste_over: boolean,
): Leesresultaat {
  const contacten: GelezenContact[] = [];
  const overgeslagen: Overgeslagen[] = [];
  const gezien = new Set<string>();
  const emailKolom = kolommen.indexOf("email");

  rijen.forEach((rij, i) => {
    if (sla_eerste_over && i === 0) return;
    const nummer = i + 1;
    const samenvatting = rij.filter(Boolean).join(" | ").slice(0, 80);

    if (rij.every((c) => !c || !c.trim())) return; // lege regels stilzwijgend overslaan

    if (emailKolom < 0) {
      overgeslagen.push({ rij: nummer, reden: "geen e-mailkolom aangewezen", inhoud: samenvatting });
      return;
    }

    const email = eersteEmail(rij[emailKolom] ?? "");
    if (!email) {
      overgeslagen.push({ rij: nummer, reden: "geen geldig e-mailadres", inhoud: samenvatting });
      return;
    }
    if (gezien.has(email)) {
      overgeslagen.push({ rij: nummer, reden: "staat al eerder in dit bestand", inhoud: email });
      return;
    }
    gezien.add(email);

    const pak = (soort: Kolomsoort) => {
      const k = kolommen.indexOf(soort);
      const waarde = k >= 0 ? (rij[k] ?? "").trim() : "";
      return waarde || undefined;
    };

    // Staat er een aparte voornaamkolom, dan wint die van een algemene
    // naamkolom. Dat lijkt omgekeerd maar volgde uit een echte lijst: naast
    // "Voornaam contact" stond daar een kolom "Eigenaar / contactpersoon" met
    // "Alfredo Smith (chef-kok) & Sonja" erin. Die won op de kop, en dan begint
    // de mail met "Beste Alfredo Smith (chef-kok) & Sonja,".
    //
    // Een kolom die uitdrukkelijk de voornaam bevat, is voor een aanhef altijd
    // betrouwbaarder dan een kolom die alles over de eigenaar verzamelt.
    const voornaam = pak("voornaam");
    const naam = voornaam
      ? [voornaam, pak("achternaam")].filter(Boolean).join(" ").trim()
      : (pak("naam") ?? "");

    // Alleen velden meesturen die werkelijk iets bevatten. Een leeg veld
    // weglaten is niet hetzelfde als er een lege tekst in zetten: dat laatste
    // maakt van "onbekend" een bewering.
    const contact: GelezenContact = { email };
    if (naam) contact.naam = naam;
    for (const soort of ["bedrijf", "plaats", "adres", "postcode", "telefoon"] as const) {
      const waarde = pak(soort);
      if (waarde) contact[soort] = waarde;
    }
    const herkomst = leesHerkomst(pak("herkomst") ?? "");
    if (herkomst) contact.herkomst = herkomst;
    const notitie = pak("notitie");
    if (notitie) contact.notitie = notitie.slice(0, 600);
    const prioriteit = leesPrioriteit(pak("prioriteit") ?? "");
    if (prioriteit) contact.prioriteit = prioriteit;
    contacten.push(contact);
  });

  return { contacten, overgeslagen };
}
