#!/usr/bin/env node
/**
 * Lektest voor de scheiding tussen klanten.
 *
 * Een datalek tussen twee klanten is het enige type fout waar je een klant én
 * je reputatie mee kwijtraakt, en het is niet te zien door naar de code te
 * kijken: het hangt af van RLS-policies in de database. Daarom meet dit script
 * het, met dezelfde publieke sleutel die een willekeurige bezoeker uit je
 * JavaScript-bundle kan plukken.
 *
 * Draai dit na elke wijziging aan RLS:
 *   node scripts/test-scheiding.mjs
 *
 * Leest SUPABASE_URL en SUPABASE_PUBLISHABLE_KEY uit .env.
 */

import { readFileSync } from "node:fs";

for (const regel of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = regel.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const URL_ = process.env.SUPABASE_URL;
const SLEUTEL = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!URL_ || !SLEUTEL) {
  console.error("SUPABASE_URL of SUPABASE_PUBLISHABLE_KEY ontbreekt in .env");
  process.exit(1);
}

const kop = { apikey: SLEUTEL, Authorization: `Bearer ${SLEUTEL}`, "Content-Type": "application/json" };
const rest = (pad, opties = {}) => fetch(`${URL_}/rest/v1/${pad}`, { headers: kop, ...opties });

let gezakt = 0;
function meld(geslaagd, naam, detail = "") {
  console.log(`  ${geslaagd ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!geslaagd) gezakt++;
}

console.log("\nLektest scheiding per klant\n" + "=".repeat(52));

// --- 1. Rechtstreeks lezen van de kennisbank is dicht ----------------------
console.log("Kennisbank");
const direct = await (await rest("knowledge_items?select=id,agent_id,title&limit=1000")).json();
const directDicht = !Array.isArray(direct) || direct.length === 0;
meld(
  directDicht,
  "een bezoeker kan de kennisbank niet rechtstreeks uitlezen",
  Array.isArray(direct) ? `${direct.length} items zichtbaar via een kale query` : "geweigerd",
);

// Wel via de functie, en dan alleen van de opgevraagde agent.
const viaFunctie = await (
  await rest("rpc/agent_knowledge", { method: "POST", body: JSON.stringify({ _slug: "website-assistent" }) })
).json();
const kennis = Array.isArray(viaFunctie) ? viaFunctie : [];
meld(kennis.length > 0, "de eigen agent levert zijn kennis wel via de functie", `${kennis.length} items`);

// --- 2. Agents zijn niet uit te lezen ----------------------------------------
console.log("\nAgents");
// Geweigerd worden is net zo goed als een lege lijst terugkrijgen, en zelfs
// strenger: dan komt de bezoeker niet eens bij de tabel.
const agentsDirect = await (await rest("agents?select=id,name,client_id&limit=100")).json();
const agentsDicht = Array.isArray(agentsDirect) ? agentsDirect.length === 0 : true;
meld(
  agentsDicht,
  "een bezoeker kan de agentlijst niet uitlezen",
  Array.isArray(agentsDirect) ? `${agentsDirect.length} agents zichtbaar` : "geweigerd door de database",
);

// --- 3. Alleen live agents zijn op te zoeken ---------------------------------
const bestaat = await (
  await rest("rpc/resolve_live_agent", { method: "POST", body: JSON.stringify({ _slug: "website-assistent" }) })
).json();
meld(typeof bestaat === "string" && bestaat.length > 0, "eigen agent is opzoekbaar via zijn slug");

const onzin = await (
  await rest("rpc/resolve_live_agent", { method: "POST", body: JSON.stringify({ _slug: "bestaat-niet-xyz" }) })
).json();
meld(onzin === null, "een onbekende slug levert niets op");

// --- 4. Schrijven is dicht ---------------------------------------------------
console.log("\nSchrijfrechten");
const leadPoging = await rest("lead_requests", {
  method: "POST",
  body: JSON.stringify({ name: "LEKTEST", company: "LEKTEST", email: "lektest@voorbeeld.nl" }),
});
meld(
  leadPoging.status === 401 || leadPoging.status === 403,
  "een bezoeker kan niet rechtstreeks een lead wegschrijven",
  `HTTP ${leadPoging.status}${leadPoging.status === 201 ? " — ER IS EEN TESTLEAD AANGEMAAKT, VERWIJDER DIE" : ""}`,
);

const leadLezen = await (await rest("lead_requests?select=id,email&limit=5")).json();
meld(
  Array.isArray(leadLezen) && leadLezen.length === 0,
  "een bezoeker kan geen leads lezen",
  Array.isArray(leadLezen) ? `${leadLezen.length} leads zichtbaar` : "geweigerd",
);

// Kennis wijzigen: op een bestaand item, met dezelfde waarde, zodat er hoe dan
// ook niets verandert. Een lege uitkomst betekent dat RLS het tegenhield.
if (Array.isArray(kennis) && kennis.length > 0) {
  const doelwit = kennis[0];
  const patch = await rest(`knowledge_items?id=eq.${doelwit.id}`, {
    method: "PATCH",
    headers: { ...kop, Prefer: "return=representation" },
    body: JSON.stringify({ is_active: doelwit.is_active }),
  });
  const gewijzigd = patch.ok ? await patch.json() : null;
  meld(
    !Array.isArray(gewijzigd) || gewijzigd.length === 0,
    "een bezoeker kan de kennisbank niet wijzigen",
    Array.isArray(gewijzigd) && gewijzigd.length > 0 ? "EEN RIJ IS GEWIJZIGD" : `HTTP ${patch.status}`,
  );
}

// --- 5. De beslissende test: lekt de kennis van een andere klant? ----------
//
// Dit is de controle waar het om draait. Een brede policy (alleen is_active) en
// een strenge (is_active plus live agent) geven hetzelfde resultaat zolang er
// één agent is. Het verschil wordt pas zichtbaar met een tweede agent die niet
// live staat. De agent "testklant" bestaat daarvoor, met een kennisitem waarvan
// de titel nergens anders voorkomt.
console.log("\nScheiding tussen klanten");

const MARKERING = "Geheim van de testklant";

// Twee wegen proberen: een kale query, en de functie met de slug van de andere
// klant. Allebei moeten niets opleveren.
const kaal = await (await rest("knowledge_items?select=title&limit=1000")).json();
const viaSlug = await (
  await rest("rpc/agent_knowledge", { method: "POST", body: JSON.stringify({ _slug: "testklant" }) })
).json();
const gelekt = [
  ...(Array.isArray(kaal) ? kaal : []),
  ...(Array.isArray(viaSlug) ? viaSlug : []),
].filter((k) => (k.title ?? "").includes(MARKERING));

meld(
  gelekt.length === 0,
  `kennis van een niet-live agent blijft onzichtbaar`,
  gelekt.length > 0
    ? `LEK: "${MARKERING}" is leesbaar voor een bezoeker`
    : `"${MARKERING}" niet zichtbaar`,
);

// Ook via de zoekfunctie mag een niet-live agent niet vindbaar zijn.
const testklant = await (
  await rest("rpc/resolve_live_agent", { method: "POST", body: JSON.stringify({ _slug: "testklant" }) })
).json();
meld(testklant === null, "een agent op setup is niet op te zoeken via zijn slug");

const testConfig = await (
  await rest("rpc/agent_public_config", { method: "POST", body: JSON.stringify({ _slug: "testklant" }) })
).json();
meld(
  Array.isArray(testConfig) && testConfig.length === 0,
  "een agent op setup geeft geen configuratie prijs",
  Array.isArray(testConfig) && testConfig.length > 0 ? "CONFIGURATIE ZICHTBAAR" : "leeg",
);

// En de eigen agent moet juist wél gewoon werken.
const eigenConfig = await (
  await rest("rpc/agent_public_config", { method: "POST", body: JSON.stringify({ _slug: "website-assistent" }) })
).json();
meld(
  Array.isArray(eigenConfig) && eigenConfig.length === 1,
  "de eigen agent geeft zijn publieke instellingen wel",
  Array.isArray(eigenConfig) && eigenConfig[0]
    ? `limiet ${eigenConfig[0].rate_limit_per_hour}/uur, domeinen: ${(eigenConfig[0].allowed_domains ?? []).join(", ")}`
    : "",
);
meld(
  Array.isArray(eigenConfig) && eigenConfig[0] && !("notify_email" in eigenConfig[0]),
  "het meldadres lekt niet mee in de publieke configuratie",
);

// --- 6. De teller die de factuur bepaalt, is afgeschermd ------------------
//
// claim_agent_request mag een bezoeker aanroepen: dat is de snelheidslimiet, en
// wie hem ophoogt sluit alleen zichzelf buiten. record_agent_tokens telt mee wat
// er op de factuur komt en mag dus niet aanroepbaar zijn, anders kan iemand de
// rekening van een klant opblazen. Het agent-id is namelijk te achterhalen: de
// slug staat in het embed-script en agent_public_config geeft het id daarbij.
console.log("\nFacturatie");

const NEP = "00000000-0000-4000-8000-000000000000";
const tokenPoging = await rest("rpc/record_agent_tokens", {
  method: "POST",
  body: JSON.stringify({ _agent_id: NEP, _input: 0, _output: 0, _cache_read: 0 }),
});
meld(
  tokenPoging.status === 401 || tokenPoging.status === 403,
  "een bezoeker kan het facturabele verbruik niet ophogen",
  `HTTP ${tokenPoging.status}${tokenPoging.status < 300 ? " \u2014 AANROEPBAAR, DIT HOORT DICHT" : ""}`,
);

const maandPoging = await rest("rpc/agent_month_summary", {
  method: "POST",
  body: JSON.stringify({ _agent_id: NEP, _month_offset: 0 }),
});
meld(
  maandPoging.status === 401 || maandPoging.status === 403,
  "een bezoeker kan de maandstand niet opvragen",
  `HTTP ${maandPoging.status}`,
);

console.log("\nUitgaande e-mail");

// Contactgegevens van derden zijn het gevoeligste wat hier staat: mensen die
// zelf nooit met ons platform hebben ingestemd. Anon mag er niet bij, en ook
// niet ongemerkt rijen toevoegen aan andermans lijst.
for (const tabel of [
  "outbound_contacts",
  "outbound_campaigns",
  "outbound_messages",
  "outbound_deliveries",
]) {
  const lezen = await rest(`${tabel}?select=*&limit=1`);
  meld(
    lezen.status === 401 || lezen.status === 403,
    `een bezoeker kan ${tabel} niet lezen`,
    `HTTP ${lezen.status}${lezen.status === 200 ? " \u2014 LEK" : ""}${lezen.status === 404 ? " \u2014 TABEL BESTAAT NIET" : ""}`,
  );
}

const schrijfPoging = await rest("outbound_contacts", {
  method: "POST",
  body: JSON.stringify({ agent_id: NEP, email: "lektest@voorbeeld.nl" }),
});
meld(
  schrijfPoging.status === 401 || schrijfPoging.status === 403,
  "een bezoeker kan geen contact toevoegen aan een lijst",
  `HTTP ${schrijfPoging.status}`,
);

const vrijdagPoging = await rest("rpc/outbound_vrijdagen", {
  method: "POST",
  body: JSON.stringify({ _agent_id: NEP }),
});
meld(
  vrijdagPoging.status === 401 || vrijdagPoging.status === 403,
  "een bezoeker kan de bezorgplanning niet opvragen",
  `HTTP ${vrijdagPoging.status}`,
);

// Deze moet juist wél open staan, en daarom staat hij hier. Iemand die een
// koude mail krijgt heeft geen account en gaat er geen maken; werkt de
// afmeldlink niet, dan is dat geen ongemak maar een wettelijk probleem. Een
// latere policy die "alles dichtzet" zou dit stilletjes kunnen breken, en dan
// merk je het pas als iemand zich beklaagt.
const afmeldPoging = await rest("rpc/outbound_afmelden", {
  method: "POST",
  body: JSON.stringify({ _sleutel: NEP }),
});
meld(
  afmeldPoging.status === 204 || afmeldPoging.status === 200,
  "de afmeldlink werkt zonder account",
  `HTTP ${afmeldPoging.status}${afmeldPoging.status >= 400 ? " \u2014 AFMELDEN KAN NIET MEER" : ""}`,
);

console.log("\nBinnenkomende antwoorden");

const antwoordLezen = await rest("outbound_replies?select=*&limit=1");
meld(
  antwoordLezen.status === 401 || antwoordLezen.status === 403,
  "een bezoeker kan de antwoorden van klanten niet lezen",
  `HTTP ${antwoordLezen.status}${antwoordLezen.status === 200 ? " \u2014 LEK" : ""}${antwoordLezen.status === 404 ? " \u2014 TABEL BESTAAT NIET" : ""}`,
);

const antwoordSchrijven = await rest("outbound_replies", {
  method: "POST",
  body: JSON.stringify({ agent_id: NEP, van_email: "nep@voorbeeld.nl", provider_id: "LEKTEST" }),
});
meld(
  antwoordSchrijven.status === 401 || antwoordSchrijven.status === 403,
  "een bezoeker kan geen antwoord verzinnen",
  `HTTP ${antwoordSchrijven.status}`,
);

// Het ontvangstadres hoort niet in de publieke configuratie terecht te komen.
// Wie het kent kan er post naartoe sturen die als klantantwoord wordt gelezen;
// de handtekeningcontrole vangt dat af, maar het hoort er simpelweg niet in.
const config = await rest("rpc/agent_public_config", {
  method: "POST",
  body: JSON.stringify({ _slug: "website-assistent" }),
});
const configTekst = config.ok ? await config.text() : "";
meld(
  !configTekst.includes("inbound_local"),
  "het ontvangstadres lekt niet mee in de publieke configuratie",
);

// --- Beheerplan fase 1 t/m 5 ------------------------------------------------
//
// Meekijken, de toegangslog, teamleden en de fair-use-meldingen. Allemaal
// dicht voor een bezoeker. Geeft een controle "BESTAAT NIET", dan zijn de
// migraties van 19 september nog niet gedraaid.
console.log("\nBeheer, meekijken en teams");

for (const tabel of [
  "meekijksessies",
  "meekijkpaginas",
  "klantleden",
  "agent_gebeurtenissen",
  "fair_use_meldingen",
]) {
  const lezen = await rest(`${tabel}?select=*&limit=1`);
  meld(
    lezen.status === 401 || lezen.status === 403,
    `een bezoeker kan ${tabel} niet lezen`,
    `HTTP ${lezen.status}${lezen.status === 200 ? " \u2014 LEK" : ""}${lezen.status === 404 ? " \u2014 BESTAAT NIET (migratie gedraaid?)" : ""}`,
  );
}

for (const [functie, args] of [
  ["start_meekijken", { _client_id: NEP, _reden: "lektest van een bezoeker" }],
  ["fair_use_melding", { _agent_id: NEP }],
  ["zet_agent_pauze", { _agent_id: NEP, _pauze: true }],
  ["mijn_team", {}],
  ["mijn_toegangslog", {}],
]) {
  const poging = await rest(`rpc/${functie}`, { method: "POST", body: JSON.stringify(args) });
  meld(
    poging.status === 401 || poging.status === 403,
    `een bezoeker kan ${functie} niet aanroepen`,
    `HTTP ${poging.status}${poging.status < 300 ? " \u2014 AANROEPBAAR, DIT HOORT DICHT" : ""}${poging.status === 404 ? " \u2014 BESTAAT NIET (migratie gedraaid?)" : ""}`,
  );
}

console.log("\n" + "=".repeat(52));
if (gezakt === 0) {
  console.log("Alles in orde: geen lek gevonden.\n");
} else {
  console.log(`${gezakt} controle(s) gezakt. Niet uitrollen voordat dit klopt.\n`);
  process.exit(1);
}
