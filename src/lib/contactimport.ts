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

export type Kolomsoort = "email" | "naam" | "bedrijf" | "plaats" | "telefoon" | "negeren";

/** Wat we in een kop zoeken om een kolom te herkennen, in volgorde van zekerheid. */
const KOPPEN: Record<Exclude<Kolomsoort, "negeren">, string[]> = {
  email: ["e-mail", "email", "mail", "emailadres", "e-mailadres"],
  naam: ["naam", "contactpersoon", "contact", "name", "achternaam", "voornaam"],
  bedrijf: ["bedrijf", "bedrijfsnaam", "klant", "relatie", "company", "zaak", "debiteur"],
  plaats: ["plaats", "stad", "woonplaats", "vestiging", "city", "gemeente"],
  telefoon: ["telefoon", "tel", "telefoonnummer", "mobiel", "phone", "gsm"],
};

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
 * Eerst op de kopregel, want die is het betrouwbaarst. Levert dat voor e-mail
 * niets op, dan kijken we naar de inhoud: de kolom met de meeste geldige
 * adressen is de e-mailkolom. Een lijst zonder kopregel komt vaak genoeg voor
 * om dat op te vangen.
 */
export function raadKolommen(rijen: string[][]): Kolomsoort[] {
  const kop = rijen[0] ?? [];
  const breedte = Math.max(...rijen.map((r) => r.length), 0);
  const uitkomst: Kolomsoort[] = Array(breedte).fill("negeren");
  const gebruikt = new Set<Kolomsoort>();

  const soorten = Object.entries(KOPPEN) as [Exclude<Kolomsoort, "negeren">, string[]][];
  const tekstVan = (i: number) => (kop[i] ?? "").trim().toLowerCase();

  // Twee rondes, en de volgorde is het hele punt. "Bedrijfsnaam" bevat het
  // woord "naam", dus een enkele ronde die per kolom de eerste de beste
  // treffer pakt maakt er een persoonsnaam van — waarna de kolom die
  // wérkelijk de contactpersoon bevat nergens meer heen kan, en er straks
  // tweehonderd mails uitgaan die een slagerij met "Beste Slagerij Van Dam"
  // aanspreken.
  //
  // Ronde 1 kent alleen kolommen toe waarvan de kop precies gelijk is aan een
  // bekend woord. Pas in ronde 2 mag "bevat" meedoen, en dan wint het langste
  // woord, zodat een specifieke kop het wint van een algemene.
  for (let i = 0; i < breedte; i++) {
    const tekst = tekstVan(i);
    if (!tekst) continue;
    const treffer = soorten.find(([soort, woorden]) => !gebruikt.has(soort) && woorden.includes(tekst));
    if (treffer) {
      uitkomst[i] = treffer[0];
      gebruikt.add(treffer[0]);
    }
  }

  for (let i = 0; i < breedte; i++) {
    if (uitkomst[i] !== "negeren") continue;
    const tekst = tekstVan(i);
    if (!tekst) continue;

    let beste: { soort: Exclude<Kolomsoort, "negeren">; lengte: number } | null = null;
    for (const [soort, woorden] of soorten) {
      if (gebruikt.has(soort)) continue;
      for (const woord of woorden) {
        if (tekst.includes(woord) && (!beste || woord.length > beste.lengte)) {
          beste = { soort, lengte: woord.length };
        }
      }
    }
    if (beste) {
      uitkomst[i] = beste.soort;
      gebruikt.add(beste.soort);
    }
  }

  if (!gebruikt.has("email")) {
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

export type GelezenContact = {
  email: string;
  naam?: string;
  bedrijf?: string;
  plaats?: string;
  telefoon?: string;
};

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

    // Alleen velden meesturen die werkelijk iets bevatten. Een leeg veld
    // weglaten is niet hetzelfde als er een lege tekst in zetten: dat laatste
    // maakt van "onbekend" een bewering.
    const contact: GelezenContact = { email };
    for (const soort of ["naam", "bedrijf", "plaats", "telefoon"] as const) {
      const waarde = pak(soort);
      if (waarde) contact[soort] = waarde;
    }
    contacten.push(contact);
  });

  return { contacten, overgeslagen };
}
