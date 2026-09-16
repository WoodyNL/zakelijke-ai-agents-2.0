/**
 * Een prijslijst uitlezen zonder dat er een model aan te pas komt.
 *
 * De gewone kennisimport laat een model een document lezen en er zinnen van
 * maken. Voor beleid, voorwaarden en veelgestelde vragen werkt dat prima: als
 * er een nuance verkeerd overkomt, valt dat op in het antwoord.
 *
 * Voor prijzen niet. Een model dat 12,50 als 12,05 leest of € 1.250 afrondt
 * naar € 1.300, levert een fout op die nergens opvalt totdat een klant op een
 * bedrag afrekent dat nooit is afgesproken. En bij een uitgaande agent staat
 * dat bedrag al in honderd verzonden mails voordat iemand het merkt.
 *
 * Daarom leest dit bestand de rijen zelf, met vaste regels. Wat er niet
 * eenduidig uit te lezen is, wordt overgeslagen met een reden — nooit geraden.
 */

export type Prijsregel = {
  omschrijving: string;
  /** Het bedrag in euro's, exact zoals het in het bestand stond. */
  bedrag: number;
  /** "per kilo", "per stuk", "per doos" — leeg als het er niet bij stond. */
  eenheid?: string;
  artikelnummer?: string;
};

export type PrijsOvergeslagen = { rij: number; reden: string; inhoud: string };

/**
 * Leest een bedrag uit een cel.
 *
 * De lastigste beslissing zit in de punt. In Nederland is "1.250" twaalfhonderd
 * vijftig en in Engelse opmaak is "12.50" twaalf euro vijftig. Eén regel lost
 * dat op: staan er precies drie cijfers achter de punt, dan is het een
 * duizendtalscheiding; staan er één of twee, dan is het een decimaalteken.
 *
 * Staan er allebei in, dan is het laatste leesteken het decimaalteken. Dat geldt
 * in beide opmaken.
 */
export function leesBedrag(cel: string): number | null {
  let t = cel.trim();
  if (!t) return null;

  // Alles weghalen wat geen getal of leesteken is: het euroteken, "EUR",
  // "excl. btw", "p/kg". Wat overblijft moet een bedrag zijn.
  t = t.replace(/[€$]|eur\b|euro\b/gi, "").trim();
  const treffer = t.match(/-?\d[\d.,\s]*/);
  if (!treffer) return null;

  let getal = treffer[0].replace(/\s/g, "");
  const laatstePunt = getal.lastIndexOf(".");
  const laatsteKomma = getal.lastIndexOf(",");

  if (laatstePunt >= 0 && laatsteKomma >= 0) {
    // Allebei aanwezig: het laatste leesteken scheidt de centen.
    const decimaal = Math.max(laatstePunt, laatsteKomma);
    const heel = getal.slice(0, decimaal).replace(/[.,]/g, "");
    const centen = getal.slice(decimaal + 1).replace(/[.,]/g, "");
    getal = `${heel}.${centen}`;
  } else if (laatsteKomma >= 0) {
    // Alleen een komma: in Nederlandse opmaak altijd het decimaalteken.
    getal = getal.slice(0, laatsteKomma).replace(/[.,]/g, "") + "." + getal.slice(laatsteKomma + 1);
  } else if (laatstePunt >= 0) {
    const achter = getal.length - laatstePunt - 1;
    getal =
      achter === 3
        ? getal.replace(/\./g, "") // 1.250 is twaalfhonderdvijftig
        : getal; // 12.50 is twaalf euro vijftig
  }

  const n = Number(getal);
  if (!Number.isFinite(n) || n < 0) return null;
  // Meer dan twee decimalen is geen prijs maar een gewicht of een aantal dat
  // per ongeluk in de prijskolom staat.
  if (Math.round(n * 100) / 100 !== n) return null;
  return n;
}

const PRIJSKOPPEN = ["prijs", "bedrag", "tarief", "verkoopprijs", "price", "kostprijs", "euro"];
const OMSCHRIJVINGKOPPEN = ["omschrijving", "product", "artikel", "naam", "artikelomschrijving", "description"];
const EENHEIDKOPPEN = ["eenheid", "per", "verpakking", "unit", "inhoud"];
const NUMMERKOPPEN = ["artikelnummer", "artikelcode", "code", "nummer", "sku"];

function kern(kop: string): string {
  let t = kop.trim().toLowerCase();
  const schuin = t.lastIndexOf(" / ");
  if (schuin > 0) t = t.slice(schuin + 3);
  return t.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

function kiesKolom(kop: string[], woorden: string[], bezet: Set<number>): number {
  let beste = -1;
  let score = 0;
  kop.forEach((k, i) => {
    if (bezet.has(i)) return;
    const t = kern(k);
    for (const w of woorden) {
      const punten = t === w ? 100 : t.includes(w) ? 50 + w.length : 0;
      if (punten > score) {
        score = punten;
        beste = i;
      }
    }
  });
  if (beste >= 0) bezet.add(beste);
  return beste;
}

export type Prijsindeling = {
  omschrijving: number;
  bedrag: number;
  eenheid: number;
  nummer: number;
};

/**
 * Raadt welke kolom wat bevat.
 *
 * De prijskolom wordt niet alleen op de kop gekozen. Heet er geen kolom
 * "prijs", dan telt welke kolom de meeste leesbare bedragen bevat — dat is
 * betrouwbaarder dan een kop die "tarief 2026" heet of helemaal ontbreekt.
 */
export function raadPrijskolommen(rijen: string[][], heeftKop: boolean): Prijsindeling {
  const kop = heeftKop ? (rijen[0] ?? []) : [];
  const breedte = Math.max(...rijen.map((r) => r.length), 0);
  const bezet = new Set<number>();

  const bedragUitKop = heeftKop ? kiesKolom(kop, PRIJSKOPPEN, bezet) : -1;

  let bedrag = bedragUitKop;
  if (bedrag < 0) {
    const data = rijen.slice(heeftKop ? 1 : 0);
    let meeste = 0;
    for (let i = 0; i < breedte; i++) {
      if (bezet.has(i)) continue;
      const treffers = data.filter((r) => leesBedrag(r[i] ?? "") !== null).length;
      if (treffers > meeste) {
        meeste = treffers;
        bedrag = i;
      }
    }
    if (bedrag >= 0) bezet.add(bedrag);
  }

  return {
    bedrag,
    omschrijving: heeftKop ? kiesKolom(kop, OMSCHRIJVINGKOPPEN, bezet) : -1,
    eenheid: heeftKop ? kiesKolom(kop, EENHEIDKOPPEN, bezet) : -1,
    nummer: heeftKop ? kiesKolom(kop, NUMMERKOPPEN, bezet) : -1,
  };
}

/** Zonder kopregel: de eerste tekstkolom is de omschrijving. */
function valTerugOpOmschrijving(rijen: string[][], indeling: Prijsindeling): number {
  if (indeling.omschrijving >= 0) return indeling.omschrijving;
  const breedte = Math.max(...rijen.map((r) => r.length), 0);
  for (let i = 0; i < breedte; i++) {
    if (i === indeling.bedrag) continue;
    const gevuld = rijen.filter((r) => (r[i] ?? "").trim().length > 1).length;
    if (gevuld > rijen.length / 2) return i;
  }
  return -1;
}

export function leesPrijzen(
  rijen: string[][],
  indeling: Prijsindeling,
  slaEersteOver: boolean,
): { regels: Prijsregel[]; overgeslagen: PrijsOvergeslagen[] } {
  const regels: Prijsregel[] = [];
  const overgeslagen: PrijsOvergeslagen[] = [];
  const omschrijvingKolom = valTerugOpOmschrijving(rijen, indeling);

  rijen.forEach((rij, i) => {
    if (slaEersteOver && i === 0) return;
    if (rij.every((c) => !c || !c.trim())) return;

    const nummer = i + 1;
    const samenvatting = rij.filter(Boolean).join(" | ").slice(0, 80);

    if (indeling.bedrag < 0) {
      overgeslagen.push({ rij: nummer, reden: "geen prijskolom aangewezen", inhoud: samenvatting });
      return;
    }

    const bedrag = leesBedrag(rij[indeling.bedrag] ?? "");
    if (bedrag === null) {
      overgeslagen.push({ rij: nummer, reden: "geen leesbaar bedrag", inhoud: samenvatting });
      return;
    }

    const omschrijving = (omschrijvingKolom >= 0 ? (rij[omschrijvingKolom] ?? "") : "").trim();
    if (!omschrijving) {
      // Een bedrag zonder omschrijving is onbruikbaar: de agent kan er niets
      // over zeggen zonder te verzinnen waar het bij hoort.
      overgeslagen.push({
        rij: nummer,
        reden: "bedrag zonder omschrijving",
        inhoud: samenvatting,
      });
      return;
    }

    const regel: Prijsregel = { omschrijving, bedrag };
    const eenheid = (indeling.eenheid >= 0 ? (rij[indeling.eenheid] ?? "") : "").trim();
    const art = (indeling.nummer >= 0 ? (rij[indeling.nummer] ?? "") : "").trim();
    if (eenheid) regel.eenheid = eenheid;
    if (art) regel.artikelnummer = art;
    regels.push(regel);
  });

  return { regels, overgeslagen };
}

/** Het bedrag zoals het op het scherm en in de mail komt te staan. */
export function euroTekst(bedrag: number): string {
  return "€ " + bedrag.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Zet een regel om naar een kennisstuk.
 *
 * De zin wordt hier in elkaar gezet en niet door een model geschreven. Saai,
 * maar het bedrag dat erin staat is gegarandeerd het bedrag uit het bestand.
 */
export function alsKennis(r: Prijsregel): { title: string; content: string } {
  const stukken = [`${r.omschrijving} kost ${euroTekst(r.bedrag)}`];
  if (r.eenheid) stukken.push(r.eenheid.startsWith("per") ? r.eenheid : `per ${r.eenheid}`);
  const zin = stukken.join(" ") + ".";
  return {
    title: r.artikelnummer ? `${r.omschrijving} (${r.artikelnummer})` : r.omschrijving,
    content: r.artikelnummer ? `${zin} Artikelnummer ${r.artikelnummer}.` : zin,
  };
}
