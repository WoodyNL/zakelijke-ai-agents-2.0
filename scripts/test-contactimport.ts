#!/usr/bin/env node
/**
 * Test op het lezen van aangeleverde contactlijsten.
 *
 * Dit is de plek waar een fout duur is en pas laat opvalt: raadt de import een
 * kolom verkeerd, dan staat er straks een bedrijfsnaam in het aanhefveld en
 * gaan er tweehonderd mails uit met "Beste Slagerij Van Dam" tegen een persoon.
 * Of erger: een adres dat niet in de lijst hoorde krijgt post.
 *
 *   node scripts/test-contactimport.ts
 */

import {
  eersteEmail,
  geldigEmail,
  heeftKopregel,
  leesContacten,
  raadKolommen,
} from "../src/lib/contactimport.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};

console.log("\nContactlijsten lezen\n" + "=".repeat(52));

console.log("Adressen herkennen");
for (const g of ["frank@fjsnacks.nl", "a.de.vries@horeca-leiden.nl", "info@café.nl"]) {
  meld(geldigEmail(g), `geldig: ${g}`);
}
for (const f of ["", "geen adres", "frank@", "@fjsnacks.nl", "frank@fjsnacks", "a..b@c.nl", "x@.nl"]) {
  meld(!geldigEmail(f), `afgekeurd: ${JSON.stringify(f)}`);
}
meld(eersteEmail("Frank <frank@fjsnacks.nl>") === "frank@fjsnacks.nl", "adres uit 'Naam <adres>'");
meld(eersteEmail("a@b.nl; c@d.nl") === "a@b.nl", "eerste adres bij twee in één cel");
meld(eersteEmail("  FRANK@FJSNACKS.NL ") === "frank@fjsnacks.nl", "spaties en hoofdletters weg");

console.log("\nKolommen raden");
const nl = [
  ["Bedrijfsnaam", "Contactpersoon", "E-mailadres", "Plaats", "Telefoon"],
  ["Slagerij Van Dam", "Piet van Dam", "piet@vandam.nl", "Leiden", "071-1234567"],
];
meld(
  JSON.stringify(raadKolommen(nl)) ===
    JSON.stringify(["bedrijf", "naam", "email", "plaats", "telefoon"]),
  "Nederlandse koppen",
  raadKolommen(nl).join(", "),
);

const en = [
  ["Company", "Name", "Email", "City"],
  ["Hotel Zuid", "J. Bakker", "j@hotelzuid.nl", "Den Haag"],
];
meld(
  JSON.stringify(raadKolommen(en)) === JSON.stringify(["bedrijf", "naam", "email", "plaats"]),
  "Engelse koppen",
  raadKolommen(en).join(", "),
);

// Zonder kopregel moet de e-mailkolom uit de inhoud volgen.
const geenKop = [
  ["Slagerij Van Dam", "piet@vandam.nl", "Leiden"],
  ["Hotel Zuid", "j@hotelzuid.nl", "Den Haag"],
];
meld(raadKolommen(geenKop)[1] === "email", "e-mailkolom gevonden zonder kopregel");
meld(!heeftKopregel(geenKop), "herkent dat er geen kopregel is");
meld(heeftKopregel(nl), "herkent dat er wél een kopregel is");

console.log("\nRijen omzetten");
const rommel = [
  ["Bedrijf", "Naam", "E-mail", "Plaats"],
  ["Slagerij Van Dam", "Piet van Dam", "piet@vandam.nl", "Leiden"],
  ["", "", "", ""], // lege regel
  ["Hotel Zuid", "J. Bakker", "j@hotelzuid.nl", "Den Haag"],
  ["Café Oud", "", "kapot-adres", "Leiden"], // onbruikbaar adres
  ["Slagerij Van Dam", "Piet van Dam", "PIET@VANDAM.NL", "Leiden"], // dubbel
  ["Snackbar Top", "", "top@snackbartop.nl", ""], // half gevuld
];
const kolommen = raadKolommen(rommel);
const r = leesContacten(rommel, kolommen, true);

meld(r.contacten.length === 3, "drie bruikbare contacten", `${r.contacten.length} gevonden`);
meld(r.overgeslagen.length === 2, "twee regels overgeslagen", `${r.overgeslagen.length}`);
meld(
  r.overgeslagen.some((o) => o.reden.includes("geldig")),
  "kapot adres krijgt een reden",
);
meld(
  r.overgeslagen.some((o) => o.reden.includes("al eerder")),
  "dubbel adres krijgt een reden",
);
meld(
  r.contacten.every((c) => c.email === c.email.toLowerCase()),
  "alle adressen in kleine letters",
);
meld(!("naam" in r.contacten[2]!), "leeg veld wordt weggelaten, niet als lege tekst opgeslagen");
meld(r.contacten[0]!.bedrijf === "Slagerij Van Dam", "bedrijfsnaam komt in het juiste veld");
meld(r.contacten[0]!.naam === "Piet van Dam", "persoonsnaam komt in het juiste veld");

// De kopregel meenemen zou een contact "E-mail" opleveren.
const metKop = leesContacten(rommel, kolommen, false);
meld(
  metKop.overgeslagen.some((o) => o.rij === 1),
  "kopregel wordt niet als contact ingelezen",
);

console.log("\n" + "=".repeat(52));
if (gezakt === 0) console.log("Alles in orde.\n");
else {
  console.log(`${gezakt} controle(s) gezakt.\n`);
  process.exit(1);
}
