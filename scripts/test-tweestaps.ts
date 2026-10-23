#!/usr/bin/env node
/**
 * Test op de eis van een tweede stap.
 *
 * Twee fouten zijn hier allebei duur. Te los: een beheerdersaccount dat bij
 * alle klantdata kan, hangt aan één wachtwoord. Te streng: de enige
 * beheerder sluit zichzelf buiten, en op Lovable Cloud is er geen
 * databaseconsole om jezelf weer binnen te laten.
 *
 *   node scripts/test-tweestaps.ts
 */

import { beoordeelTweedeStap, controleerTweedeStap } from "../src/lib/tweestaps-eis.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};

const AAN_EN_BEVESTIGD = { ingesteld: true, niveau: "aal2" };
const AAN_MAAR_NIET = { ingesteld: true, niveau: "aal1" };
const UIT = { ingesteld: false, niveau: "aal1" };

console.log("\nEen beheerder\n" + "=".repeat(52));

meld(beoordeelTweedeStap(true, AAN_EN_BEVESTIGD).stand === "mag", "met code ingevuld: gewoon door");
meld(
  beoordeelTweedeStap(true, AAN_MAAR_NIET).stand === "moet_bevestigen",
  "wel ingesteld, deze sessie niet gebruikt: eerst bevestigen",
);
meld(
  beoordeelTweedeStap(true, UIT).stand === "moet_aanzetten",
  "helemaal niet ingesteld: eerst aanzetten",
);
meld(
  beoordeelTweedeStap(true, null).stand === "moet_aanzetten",
  "niets bekend telt voor een beheerder als niet ingesteld",
);

console.log("\nIedereen die geen beheerder is\n" + "=".repeat(52));

meld(beoordeelTweedeStap(false, UIT).stand === "mag", "zonder tweede stap: gewoon door");
meld(beoordeelTweedeStap(false, null).stand === "mag", "niets bekend: gewoon door");
meld(
  beoordeelTweedeStap(false, AAN_EN_BEVESTIGD).stand === "mag",
  "met tweede stap en code ingevuld: door",
);

/*
 * Dit is het verschil dat de regel draagt: wie hem vrijwillig aanzet, moet
 * hem ook gebruiken. Anders zou aanzetten niets betekenen. Maar niet
 * aanzetten blijft voor een klant toegestaan, anders zet niemand hem aan uit
 * angst voor een dichte deur.
 */
meld(
  beoordeelTweedeStap(false, AAN_MAAR_NIET).stand === "moet_bevestigen",
  "wie hem zelf aanzette, moet hem ook gebruiken",
);

console.log("\nDe uitleg is te lezen voor een mens\n" + "=".repeat(52));

for (const [naam, eis] of [
  ["aanzetten", beoordeelTweedeStap(true, UIT)],
  ["bevestigen", beoordeelTweedeStap(true, AAN_MAAR_NIET)],
] as const) {
  const tekst = "uitleg" in eis ? eis.uitleg : "";
  meld(tekst.length > 20 && !tekst.includes("aal"), `${naam}: zegt wat je moet doen`, tekst);
}

console.log("\nAls we het niet weten\n" + "=".repeat(52));

/*
 * Dit is een eigen toestand en niet "staat uit". Het verschil zit niet in de
 * uitkomst voor de server — die weigert in beide gevallen — maar in wat de
 * gebruiker te doen staat: iets instellen, of even opnieuw proberen. Het
 * verkeerde scherm laat iemand zoeken naar een knop die er niet is.
 */
meld(
  beoordeelTweedeStap(true, null, false).stand === "onbekend",
  "een beheerder krijgt 'onbekend', niet 'moet_aanzetten'",
);
meld(
  beoordeelTweedeStap(true, AAN_EN_BEVESTIGD, false).stand === "onbekend",
  "ook als hij hem allang heeft: we wéten het op dat moment niet",
);
meld(
  beoordeelTweedeStap(false, null, false).stand === "mag",
  "voor wie geen beheerder is verandert er niets",
);
meld(
  beoordeelTweedeStap(true, AAN_EN_BEVESTIGD, true).stand === "mag",
  "en met een geslaagde controle gewoon door",
);

{
  const eis = beoordeelTweedeStap(true, null, false);
  const tekst = "uitleg" in eis ? eis.uitleg : "";
  meld(
    /opnieuw/i.test(tekst) && !/aanzetten|instellen/i.test(tekst),
    "de tekst stuurt naar opnieuw proberen, niet naar instellen",
    tekst,
  );
}

console.log("\nDe serverschil gebruikt dezelfde regel\n" + "=".repeat(52));

{
  let gegooid: string | null = null;
  try {
    controleerTweedeStap(true, { data: null, error: { message: "netwerk weg" } });
  } catch (e) {
    gegooid = e instanceof Error ? e.message : "";
  }
  meld(gegooid !== null, "een beheerder wordt geweigerd bij een fout", gegooid ?? "");
  meld(
    gegooid === ("uitleg" in beoordeelTweedeStap(true, null, false)
      ? (beoordeelTweedeStap(true, null, false) as { uitleg: string }).uitleg
      : ""),
    "met precies dezelfde tekst als het scherm toont",
  );
}

{
  let gegooid = false;
  try {
    controleerTweedeStap(false, { data: null, error: { message: "netwerk weg" } });
  } catch {
    gegooid = true;
  }
  meld(!gegooid, "support wordt bij een fout niet geweigerd");
}

console.log("\n" + "=".repeat(52));
if (gezakt > 0) {
  console.log(`${gezakt} test(s) mislukt.\n`);
  process.exit(1);
}
console.log("Alles in orde.\n");
