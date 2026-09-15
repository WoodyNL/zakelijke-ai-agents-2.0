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

// --- 1. Kennis is gekoppeld aan een agent -----------------------------------
console.log("\nKennisbank");
const kennis = await (await rest("knowledge_items?select=id,agent_id,is_active&limit=1000")).json();

if (!Array.isArray(kennis)) {
  meld(false, "kennisbank leesbaar", JSON.stringify(kennis).slice(0, 120));
} else {
  meld(kennis.length > 0, "er is kennis zichtbaar voor een bezoeker", `${kennis.length} items`);
  meld(
    kennis.every((k) => k.agent_id),
    "elk zichtbaar item hoort bij een agent",
    `${kennis.filter((k) => !k.agent_id).length} zonder agent`,
  );
  meld(
    kennis.every((k) => k.is_active),
    "geen concepten zichtbaar",
    `${kennis.filter((k) => !k.is_active).length} inactieve items zichtbaar`,
  );

  const agents = [...new Set(kennis.map((k) => k.agent_id))];
  console.log(`  ℹ zichtbare kennis verdeeld over ${agents.length} agent(s)`);
}

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

// --- 5. De beslissende test: ziet een bezoeker kennis van een niet-live agent?
//
// Dit is het lek dat de eerdere versie van deze test niet vond. Zolang er één
// agent is, geeft een brede policy (alleen is_active) hetzelfde resultaat als
// een strenge (is_active én live agent). Het verschil wordt pas zichtbaar
// zodra er een agent bestaat die niet live staat. Een beheerder kan die
// aanmaken; deze test controleert wat een bezoeker er dan van ziet.
console.log("\nScheiding tussen agents");

const agentsInKennis = Array.isArray(kennis) ? [...new Set(kennis.map((k) => k.agent_id))] : [];
if (agentsInKennis.length < 2) {
  console.log(
    "  \u2139 overgeslagen: er is kennis van \u00e9\u00e9n agent. Maak een tweede agent met status",
  );
  console.log(
    "    'setup' plus een kennisitem, en draai deze test opnieuw. Pas dan is bewezen",
  );
  console.log("    dat een bezoeker de kennis van een andere klant niet ziet.");
} else {
  const perAgent = agentsInKennis.map(
    (id) => `${id.slice(0, 8)}: ${kennis.filter((k) => k.agent_id === id).length}`,
  );
  meld(
    false,
    "bezoeker ziet kennis van meer dan \u00e9\u00e9n agent",
    perAgent.join(", ") + " \u2014 controleer of al deze agents live horen te zijn",
  );
}

console.log("\n" + "=".repeat(52));
if (gezakt === 0) {
  console.log("Alles in orde: geen lek gevonden.\n");
} else {
  console.log(`${gezakt} controle(s) gezakt. Niet uitrollen voordat dit klopt.\n`);
  process.exit(1);
}
