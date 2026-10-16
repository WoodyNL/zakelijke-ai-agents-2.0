#!/usr/bin/env node
/**
 * Test dat er geen bedrag in een mail kan belanden.
 *
 * Besloten op 15 oktober 2026: de agent noemt geen prijzen. Wie ernaar vraagt
 * wordt doorgegeven aan een mens die zelf een offerte maakt.
 *
 * Dat is niet met een instructie af te dwingen, want de prijslijst van Frank
 * staat in de kennisbank — en de kennisbank is precies wat de agent wél mag
 * navertellen. Een instructie om iets te negeren dat er wel staat, wordt een
 * keer niet gevolgd. Daarom gaan prijsregels er structureel uit, en meet deze
 * test dat er aan de andere kant geen euro meer uitkomt.
 *
 * Er wordt geen model aangeroepen: dit controleert de prompt zelf. Dat is ook
 * precies de plek waar de garantie hoort te zitten — wat niet in de prompt
 * staat, kan het model niet opschrijven.
 *
 *   node scripts/test-geen-prijzen.ts
 */

import {
  stelBerichtOp,
  systeemprompt,
  zonderPrijzen,
} from "../src/lib/bericht-opstellen.server.ts";
import { bevatBedrag, zonderBedragen } from "../src/lib/bedragen.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};

const PRIJSKENNIS = [
  { category: "prijzen", title: "Kipsaté 50gr", content: "Kipsaté 50gr kost € 0,89 per stuk." },
  { category: "Prijzen", title: "Frikandel", content: "Frikandel kost €0,42 per stuk." },
  { category: "tarieven", title: "Bezorging", content: "Bezorging kost 12,50 euro onder 150 euro." },
  // Een bedrag onder een onschuldige categorie. Het oude filter keek naar het
  // etiket en liet deze er dus doorheen.
  { category: "Levering", title: "Rittoeslag", content: "Buiten de route rekenen we 25 euro." },
  { category: "Levering", title: "Bezorgdag", content: "De chauffeur rijdt op vrijdag." },
  { category: "Proefpakket", title: "Inhoud", content: "Vier stokjes kipsaté van 50 gram." },
  // En het omgekeerde: specificaties die de kennisupload onder "prijzen" zette
  // terwijl er geen bedrag in staat. Die horen de agent juist te bereiken,
  // anders weet hij niet wat hij verkoopt.
  {
    category: "prijzen",
    title: "Specificaties rondstok 18 cm",
    content: "De rondstok van 18 cm weegt 50 gram per spies, bevat 81 stuks per doos en heeft een inhoud per doos van 4,05 kg.",
  },
];

console.log("\nPrijsregels gaan niet naar het model\n" + "=".repeat(52));

{
  const over = zonderPrijzen(PRIJSKENNIS);
  const titels = over.map((k) => k.title);

  meld(over.length === 3, "drie van de zeven blijven over", titels.join(" · "));
  meld(
    !titels.includes("Kipsaté 50gr") && !titels.includes("Frikandel"),
    "regels met een euroteken gaan eruit",
  );
  meld(!titels.includes("Bezorging"), "en met het woord euro ook");

  // Dit is wat het etiket-filter niet ving.
  meld(
    !titels.includes("Rittoeslag"),
    "een bedrag onder categorie Levering gaat ook eruit",
    titels.join(" · "),
  );

  // En dit is wat het etiket-filter ten onrechte weggooide.
  meld(
    titels.includes("Specificaties rondstok 18 cm"),
    "specificaties zonder bedrag blijven, ook onder categorie prijzen",
    titels.join(" · "),
  );
  meld(
    titels.includes("Bezorgdag") && titels.includes("Inhoud"),
    "de gewone kennis blijft wel staan",
  );
  meld(
    zonderPrijzen([{ category: "Aanbod", title: "Doos", content: "Een doos bevat 4,05 kg." }]).length === 1,
    "een kale decimaal als 4,05 kg is geen bedrag",
  );
}

console.log("\nGeen bedrag in de prompt, in elke modus\n" + "=".repeat(52));

const basis = {
  kennis: PRIJSKENNIS,
  bedrijfsnaam: "FJ Snacks",
  ondertekening: "Frank Ransijn",
  aanbod: "Een gratis proefpakket met vier stokjes kipsaté.",
};

// Een notitie zoals die uit Franks boekhouding komt: daar staan oude bedragen
// in, en dat is precies de val. Wat iemand in 2019 betaalde, als huidige prijs
// opschrijven is een belofte waaraan je wordt gehouden.
const NOTITIE = "Kocht in 2019 voor € 1.240 per maand, kipsaté voor 0,76 per stuk.";

const modi = ["eerste", "opvolging", "navraag", "bevestiging"] as const;

for (const soort of modi) {
  const prompt = systeemprompt({
    contact: { naam: "Jan Bakker", bedrijf: "De Zeemeeuw", herkomst: "oud_klant", notitie: NOTITIE },
    ...basis,
    soort,
    ...(soort === "bevestiging"
      ? { bezorging: { dag: "vrijdag 23 oktober", adres: "Boulevard 12, Katwijk" } }
      : {}),
  });

  // Alleen wat geld is. De prompt mag het woord "prijs" bevatten — de regel
  // erover staat er juist in — en een kale decimaal is geen bedrag: "4,05 kg"
  // is een doosinhoud. Op die verwarring ging het filter zelf eerst mis.
  const bedragen = [
    ...prompt.matchAll(/€\s?\d/g),
    ...prompt.matchAll(/\d[\d.,]*\s*(?:euro|eur\b|cent)/gi),
    ...prompt.matchAll(/\d+[.,]\d{2}\s*per\s+stuk/gi),
  ].map((m) => m[0]);

  meld(bedragen.length === 0, `${soort}: geen bedrag in de prompt`, bedragen.join(" "));
  meld(!prompt.includes("0,89") && !prompt.includes("0,42"), `${soort}: geen prijs uit de lijst`);
  meld(!prompt.includes("1.240") && !prompt.includes("0,76"), `${soort}: geen bedrag uit de notitie`);
}

console.log("\nBedragen uit de notitie\n" + "=".repeat(52));

{
  const g = zonderBedragen;
  meld(!/1\.240/.test(g("Kocht voor € 1.240 per maand")), "€ 1.240 gaat eruit", g("Kocht voor € 1.240 per maand"));
  meld(!/0,76/.test(g("kipsaté voor 0,76 per stuk")), "0,76 per stuk gaat eruit", g("kipsaté voor 0,76 per stuk"));
  meld(!/12,50/.test(g("bezorging 12,50 euro")), "12,50 euro gaat eruit", g("bezorging 12,50 euro"));
  meld(!/0,42/.test(g("€0,42 per frikandel")), "€0,42 zonder spatie gaat eruit", g("€0,42 per frikandel"));

  // En wat géén bedrag is, moet blijven staan. Een notitie die halverwege
  // onleesbaar is gemaakt, is erger dan een notitie met een getal erin.
  meld(g("Familiebedrijf sinds 1992") === "Familiebedrijf sinds 1992", "een jaartal blijft staan");
  meld(g("Vier stokjes van 50 gram") === "Vier stokjes van 50 gram", "een gewicht blijft staan");
  meld(g("Maakt de saté zelf") === "Maakt de saté zelf", "gewone tekst blijft ongemoeid");
  meld(
    g("Bestelt 120 kratten per week").includes("120 kratten"),
    "een aantal zonder decimalen blijft staan",
    g("Bestelt 120 kratten per week"),
  );
}

console.log("\nWat een bedrag is, en wat een maat\n" + "=".repeat(52));

{
  // Gevonden bij de laatste controle vóór de eerste echte verzending: de
  // eerste versie keek alleen naar een euroteken, en liet dit er dus door.
  for (const t of [
    "Een doos kost 36,45.",
    "Prijs per kilo is 7,50.",
    "Vanaf 89 ct per stuk.",
    "€ 0,89 per stuk",
    "12,50 euro",
    "0,42 p/st",
    "negentig cent",
    "$ 12",
  ]) {
    meld(bevatBedrag(t), `bedrag herkend: ${t}`);
  }

  // En wat géén bedrag is. "4,05 kg" is een doosinhoud en die hoort de agent
  // juist te weten; op precies die verwarring ging het filter eerst de fout in.
  for (const t of [
    "Een doos bevat 4,05 kg.",
    "De rondstok is 18 cm en weegt 50 gram.",
    "Een doos van 3,60 kg met 45 stuks.",
    "Familiebedrijf sinds 1992.",
    "Bestelt 120 kratten per week.",
    "Vier spiesen van 50 gram.",
  ]) {
    meld(!bevatBedrag(t), `geen bedrag: ${t}`);
  }
}

console.log("\nHet aanbod van de campagne wordt geweigerd\n" + "=".repeat(52));

{
  // Dit veld typt de klant zelf en het gaat letterlijk de prompt in. Het
  // filter op de kennisbank doet er niets, dus was dit de enige weg waarlangs
  // een prijs alsnog in een mail kon belanden.
  const basisOpdracht = {
    contact: { naam: "Jan", herkomst: "koud" as const },
    kennis: [],
    bedrijfsnaam: "FJ Snacks",
    ondertekening: "Frank Ransijn",
    soort: "eerste" as const,
  };

  const weigert = async (aanbod: string, ondertekening = "Frank Ransijn") => {
    try {
      await stelBerichtOp({ ...basisOpdracht, aanbod, ondertekening });
      return false;
    } catch (e) {
      return e instanceof Error && /bedrag in/.test(e.message);
    }
  };

  meld(await weigert("Een proefpakket, daarna 0,89 per stuk."), "een bedrag in het aanbod");
  meld(await weigert("Vanaf 89 ct per stuk."), "ook zonder euroteken");
  meld(
    await weigert("Een gratis proefpakket.", "Frank Ransijn — vanaf € 0,89"),
    "en een bedrag in de ondertekening",
  );
}

console.log("\nDe uitweg staat erin\n" + "=".repeat(52));

{
  const prompt = systeemprompt({
    contact: { naam: "Jan", herkomst: "koud" },
    ...basis,
    soort: "eerste",
  });
  meld(/Over prijzen: nooit/.test(prompt), "de harde regel staat in de prompt");
  meld(/bellen/.test(prompt), "en wat er in plaats daarvan moet gebeuren: bellen");
  meld(
    /niet "ik stuur u een prijslijst"/i.test(prompt),
    "een prijslijst sturen wordt expliciet verboden",
  );
}

console.log("\n" + "=".repeat(52));
if (gezakt > 0) {
  console.log(`${gezakt} test(s) mislukt.\n`);
  process.exit(1);
}
console.log("Alles in orde.\n");
