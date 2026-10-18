#!/usr/bin/env node
/**
 * Test de beoordeling van SPF, DKIM en DMARC uit DNS-antwoorden.
 *   node scripts/test-domeingezondheid.ts
 */
import { beoordeel, domeinVan, schoonTxt } from "../src/lib/domeingezondheid.ts";
let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};

console.log("\nHet domein uit een adres\n" + "=".repeat(52));
meld(domeinVan("verkoop@fjsnacks.nl") === "fjsnacks.nl", "gewoon adres");
meld(domeinVan("Frank <verkoop@FJSnacks.NL>") === "fjsnacks.nl", "met naam en hoofdletters");
meld(domeinVan("geen adres") === null, "geen adres is null");
meld(
  schoonTxt('"v=spf1 include:_spf.resend.com ~all"') === "v=spf1 include:_spf.resend.com ~all",
  "aanhalingstekens weg",
);
meld(
  schoonTxt('"v=DMARC1; p=none; rua=" "mailto:x@y.nl"') === "v=DMARC1; p=none; rua=mailto:x@y.nl",
  "gesplitste TXT weer aan elkaar",
);

console.log("\nDe beoordeling\n" + "=".repeat(52));
const goed = beoordeel("fjsnacks.nl", {
  txt: ['"v=spf1 include:_spf.transip.email include:amazonses.com ~all"'],
  dmarc: ['"v=DMARC1; p=quarantine"'],
  dkim: "resend._domainkey.rmta.net",
});
meld(
  goed.totaal === "goed" &&
    goed.spf.oordeel === "goed" &&
    goed.dkim.oordeel === "goed" &&
    goed.dmarc.oordeel === "goed",
  "alles goed",
  JSON.stringify([goed.spf.oordeel, goed.dkim.oordeel, goed.dmarc.oordeel]),
);
const fj = beoordeel("fjsnacks.nl", {
  txt: ['"v=spf1 include:_spf.transip.email ~all"'],
  dmarc: ['"v=DMARC1; p=none"'],
  dkim: "send.forge.rmta.net",
});
meld(fj.spf.oordeel === "let_op", "SPF zonder Resend: let op");
meld(
  fj.dmarc.oordeel === "let_op" && fj.dmarc.tekst.includes("none"),
  "DMARC none: let op, met uitleg",
);
meld(fj.dkim.oordeel === "goed", "DKIM via rmta: goed");
meld(fj.totaal === "let_op", "totaal is het slechtste van de drie");
const leeg = beoordeel("x.nl", { txt: [], dmarc: [], dkim: null });
meld(
  leeg.spf.oordeel === "fout" &&
    leeg.dkim.oordeel === "fout" &&
    leeg.dmarc.oordeel === "fout" &&
    leeg.totaal === "fout",
  "niets ingesteld: drie keer fout",
);
const dubbel = beoordeel("x.nl", {
  txt: ['"v=spf1 include:a ~all"', '"v=spf1 include:b ~all"'],
  dmarc: ['"v=DMARC1; p=reject"'],
  dkim: "resend._domainkey.rmta.net",
});
meld(
  dubbel.spf.oordeel === "fout" && dubbel.spf.tekst.includes("2 SPF"),
  "twee SPF-records is fout (dan geldt er geen)",
);
const andere = beoordeel("x.nl", {
  txt: ['"v=spf1 ~all"', '"google-site-verification=abc"'],
  dmarc: [],
  dkim: null,
});
meld(andere.spf.oordeel === "let_op", "een losse verificatie-TXT telt niet als tweede SPF");

console.log(gezakt ? `\n${gezakt} controle(s) gezakt.` : "\nAlles in orde.");
process.exit(gezakt ? 1 : 0);
