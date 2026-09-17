#!/usr/bin/env node
/**
 * Schrijft public/sitemap.xml opnieuw, op basis van de routebestanden.
 *
 * De sitemap stond hier met de hand bijgehouden. Dat werkt precies zolang
 * iedereen eraan denkt, en daarna niet meer: er komt een pagina bij, die staat
 * er niet in, en dat merk je pas als hij maanden later nog niet geïndexeerd
 * blijkt. Nu leest dit script de routes uit en is vergeten onmogelijk.
 *
 * Twee dingen zijn met opzet anders dan in de oude sitemap:
 *
 *   - `priority` is eruit. Google gebruikt het niet en heeft dat ook gezegd;
 *     het gaf alleen de indruk van sturing die er niet is.
 *   - `lastmod` is erin, met de datum van de laatste commit op dat bestand.
 *     Dat is de waarde die wél wordt gelezen, en git weet hem al.
 *
 *   node scripts/sitemap.ts          schrijft de sitemap
 *   node scripts/sitemap.ts --check  faalt als hij niet meer klopt (voor CI)
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const WORTEL = new URL("..", import.meta.url).pathname;
const ROUTES = join(WORTEL, "src/routes");
const SITEMAP = join(WORTEL, "public/sitemap.xml");
const DOMEIN = "https://zakelijkeaiagents.nl";

/**
 * Wat er niet in hoort. Alles wat hier niet onder valt, gaat er automatisch
 * in — zo is de standaard "wel opnemen" en moet uitsluiten een keuze zijn.
 *
 * Het klantportaal (_authenticated) stuurt bezoekers zonder account door naar
 * het inlogscherm; de rest draagt een noindex in de pagina zelf.
 */
const UITGESLOTEN = [
  /^__root\./,
  /^_authenticated\//,
  /^auth\./,
  /^reset-password\./,
  /^afmelden\./,
  /^embed\./,
  /\$/, // routes met een parameter hebben geen vast adres
  /^README/,
];

function routeBestanden(map: string, prefix = ""): string[] {
  const uit: string[] = [];
  for (const naam of readdirSync(map)) {
    const pad = join(map, naam);
    if (statSync(pad).isDirectory()) {
      uit.push(...routeBestanden(pad, `${prefix}${naam}/`));
    } else if (naam.endsWith(".tsx")) {
      uit.push(`${prefix}${naam}`);
    }
  }
  return uit;
}

/** "blog/index.tsx" → "/blog", "index.tsx" → "/", "ai-scan.tsx" → "/ai-scan". */
function naarPad(bestand: string) {
  const zonderExt = bestand.replace(/\.tsx$/, "");
  const zonderIndex = zonderExt.replace(/(^|\/)index$/, "$1");
  const pad = `/${zonderIndex}`.replace(/\/+$/, "");
  return pad === "" ? "/" : pad;
}

/** De datum van de laatste commit op dit bestand, als JJJJ-MM-DD. */
function laatstGewijzigd(bestand: string) {
  const relatief = relative(WORTEL, join(ROUTES, bestand));
  try {
    const uit = execFileSync("git", ["log", "-1", "--format=%cs", "--", relatief], {
      cwd: WORTEL,
      encoding: "utf8",
    }).trim();
    if (uit) return uit;
  } catch {
    // Geen git, of het bestand is nog niet vastgelegd.
  }
  return new Date().toISOString().slice(0, 10);
}

const paden = routeBestanden(ROUTES)
  .filter((b) => !UITGESLOTEN.some((r) => r.test(b)))
  .map((b) => ({ pad: naarPad(b), lastmod: laatstGewijzigd(b) }))
  // De homepage voorop, de rest alfabetisch: prettig leesbaar in een diff.
  .sort((a, z) => (a.pad === "/" ? -1 : z.pad === "/" ? 1 : a.pad.localeCompare(z.pad)));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paden
  .map(
    (p) =>
      `  <url>\n    <loc>${DOMEIN}${p.pad}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n  </url>`,
  )
  .join("\n")}
</urlset>
`;

if (process.argv.includes("--check")) {
  const huidig = readFileSync(SITEMAP, "utf8");
  if (huidig !== xml) {
    console.error("sitemap.xml loopt achter op de routes. Draai: node scripts/sitemap.ts");
    process.exit(1);
  }
  console.log(`sitemap.xml klopt (${paden.length} pagina's).`);
} else {
  // Dit draait als prebuild mee. Een sitemap die niet weggeschreven kan
  // worden is vervelend, maar het is geen reden om de hele build te laten
  // klappen: dan staat de site offline om een bestand dat Google een dag
  // later ook nog wel had kunnen lezen.
  try {
    writeFileSync(SITEMAP, xml);
    console.log(`sitemap.xml geschreven met ${paden.length} pagina's:`);
    for (const p of paden) console.log(`  ${p.lastmod}  ${p.pad}`);
  } catch (fout) {
    console.warn("sitemap.xml kon niet worden geschreven; de bestaande blijft staan.", fout);
  }
}
