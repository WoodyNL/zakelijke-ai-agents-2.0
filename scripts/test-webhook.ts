#!/usr/bin/env node
/**
 * Test op de handtekeningcontrole van binnenkomende webhooks.
 *
 * De geldige handtekeningen worden hier met node:crypto gemaakt, niet met de
 * code die getest wordt. Zou ik dezelfde functie gebruiken om te ondertekenen
 * en te controleren, dan slaagt de test ook als de codering aan beide kanten
 * verkeerd is.
 *
 *   node scripts/test-webhook.ts
 */

import { createHmac, randomBytes } from "node:crypto";
import { controleerHandtekening } from "../src/lib/webhook-handtekening.ts";

let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};

const geheimBytes = randomBytes(24);
const geheim = "whsec_" + geheimBytes.toString("base64");
const body = JSON.stringify({ type: "email.received", data: { from: "piet@vandam.nl" } });
const id = "msg_2abcDEF";
const nu = Math.floor(Date.now() / 1000);

const tekenMet = (i: string, t: number, b: string, sleutel: Buffer) =>
  "v1," + createHmac("sha256", sleutel).update(`${i}.${t}.${b}`).digest("base64");

console.log("\nWebhook-handtekening\n" + "=".repeat(52));

const goed = tekenMet(id, nu, body, geheimBytes);

meld(
  (await controleerHandtekening({ geheim, id, timestamp: String(nu), handtekening: goed, body, nu })).ok,
  "geldige handtekening wordt geaccepteerd",
);

meld(
  !(await controleerHandtekening({ geheim, id, timestamp: String(nu), handtekening: goed, body: body + " ", nu })).ok,
  "één spatie extra in de body maakt hem ongeldig",
);

meld(
  !(await controleerHandtekening({ geheim, id: "msg_anders", timestamp: String(nu), handtekening: goed, body, nu })).ok,
  "een ander bericht-id maakt hem ongeldig",
);

const ander = randomBytes(24);
meld(
  !(await controleerHandtekening({
    geheim: "whsec_" + ander.toString("base64"),
    id, timestamp: String(nu), handtekening: goed, body, nu,
  })).ok,
  "een ander geheim maakt hem ongeldig",
);

// Oud verzoek: correct ondertekend, maar te lang geleden.
const oud = nu - 3600;
meld(
  !(await controleerHandtekening({
    geheim, id, timestamp: String(oud), handtekening: tekenMet(id, oud, body, geheimBytes), body, nu,
  })).ok,
  "een uur oud verzoek wordt geweigerd",
  (await controleerHandtekening({
    geheim, id, timestamp: String(oud), handtekening: tekenMet(id, oud, body, geheimBytes), body, nu,
  })).ok ? "" : "reden: " + ((await controleerHandtekening({
    geheim, id, timestamp: String(oud), handtekening: tekenMet(id, oud, body, geheimBytes), body, nu,
  })) as { reden: string }).reden,
);

const netAan = nu - 4 * 60;
meld(
  (await controleerHandtekening({
    geheim, id, timestamp: String(netAan), handtekening: tekenMet(id, netAan, body, geheimBytes), body, nu,
  })).ok,
  "vier minuten oud mag nog wel",
);

// Sleutelwissel: twee handtekeningen, waarvan er één klopt.
meld(
  (await controleerHandtekening({
    geheim, id, timestamp: String(nu),
    handtekening: tekenMet(id, nu, body, ander) + " " + goed,
    body, nu,
  })).ok,
  "meerdere handtekeningen: één geldige is genoeg",
);

for (const [naam, kop] of [
  ["geen id", { id: null }],
  ["geen timestamp", { timestamp: null }],
  ["geen handtekening", { handtekening: null }],
] as const) {
  const r = await controleerHandtekening({
    geheim, id, timestamp: String(nu), handtekening: goed, body, nu, ...kop,
  } as Parameters<typeof controleerHandtekening>[0]);
  meld(!r.ok, `ontbrekende kopregel wordt geweigerd (${naam})`);
}

meld(
  !(await controleerHandtekening({
    geheim, id, timestamp: "geen-getal", handtekening: goed, body, nu,
  })).ok,
  "timestamp die geen getal is wordt geweigerd",
);

meld(
  !(await controleerHandtekening({
    geheim, id, timestamp: String(nu), handtekening: "onzin-zonder-versie", body, nu,
  })).ok,
  "handtekening zonder v1-voorvoegsel wordt geweigerd",
);

console.log("\n" + "=".repeat(52));
if (gezakt === 0) console.log("Alles in orde.\n");
else { console.log(`${gezakt} controle(s) gezakt.\n`); process.exit(1); }
