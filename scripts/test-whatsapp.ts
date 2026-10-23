#!/usr/bin/env node
/**
 * Test de regels van de WhatsApp-opvolger: het 24-uursvenster, nummers,
 * overdrachtwoorden en het lezen van Meta's webhook.
 *   node scripts/test-whatsapp.ts
 */
import {
  vensterOpen,
  leadsOmOpTeVolgen,
  leesWebhook,
  magZelfBeginnen,
  normaliseerNummer,
} from "../src/lib/whatsapp.ts";
import { vraagtOverdracht } from "../src/lib/overdrachtswoorden.ts";
let gezakt = 0;
const meld = (goed: boolean, naam: string, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};
const nu = new Date("2026-10-19T12:00:00Z");

console.log("\nHet 24-uursvenster\n" + "=".repeat(52));
meld(vensterOpen("2026-10-19T11:00:00Z", nu), "een uur geleden: open");
meld(vensterOpen("2026-10-18T12:00:01Z", nu), "net binnen 24 uur: open");
meld(!vensterOpen("2026-10-18T12:00:00Z", nu), "precies 24 uur: dicht");
meld(!vensterOpen(null, nu), "nooit iets ontvangen: dicht (alleen sjabloon)");

console.log("\nNummers\n" + "=".repeat(52));
meld(normaliseerNummer("06 12 34 56 78") === "31612345678", "Nederlands mobiel met spaties");
meld(normaliseerNummer("+31 6 1234 5678") === "31612345678", "met landcode en plus");
meld(normaliseerNummer("0031612345678") === "31612345678", "met 0031");
meld(normaliseerNummer("31612345678") === "31612345678", "al goed");
meld(normaliseerNummer("1234") === null, "te kort is null");

console.log("\nOverdracht\n" + "=".repeat(52));
const w = ["klacht", "annuleren", "jurist"];
meld(
  vraagtOverdracht("Ik heb een KLACHT over de levering", w) === "klacht",
  "woord gevonden, hoofdletters tellen niet",
);
meld(vraagtOverdracht("mijn jurist kijkt mee", w) === "jurist", "als los woord in een zin");
meld(
  vraagtOverdracht("de juristerij is ingewikkeld", w) === null,
  "niet als deel van een ander woord",
);
meld(vraagtOverdracht("alles prima hoor", w) === null, "niets gevonden");
meld(vraagtOverdracht("klacht", []) === null, "lege lijst: nooit");

console.log("\nDe webhook van Meta lezen\n" + "=".repeat(52));
const payload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "1",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "31201234567", phone_number_id: "PHONE123" },
            contacts: [{ profile: { name: "Piet Bakker" }, wa_id: "31612345678" }],
            messages: [
              {
                from: "31612345678",
                id: "wamid.A",
                timestamp: "1760875200",
                type: "text",
                text: { body: "Zijn jullie zaterdag open?" },
              },
              {
                from: "31612345678",
                id: "wamid.B",
                timestamp: "1760875260",
                type: "image",
                image: { id: "x" },
              },
              {
                from: "31612345678",
                id: "wamid.C",
                timestamp: "1760875300",
                type: "interactive",
                interactive: { type: "button_reply", button_reply: { id: "ja", title: "Ja" } },
              },
            ],
            statuses: [
              { id: "wamid.OUT1", status: "delivered", recipient_id: "31612345678" },
              { id: "wamid.OUT2", status: "failed", errors: [{ title: "Re-engagement message" }] },
              { id: "x", status: "onbekend" },
            ],
          },
        },
      ],
    },
  ],
};
const gelezen = leesWebhook(payload);
meld(gelezen.berichten.length === 3, "drie berichten", String(gelezen.berichten.length));
meld(
  gelezen.berichten[0]?.tekst === "Zijn jullie zaterdag open?" &&
    gelezen.berichten[0]?.naam === "Piet Bakker" &&
    gelezen.berichten[0]?.phoneNumberId === "PHONE123",
  "tekst, naam en nummer-id",
);
meld(
  gelezen.berichten[0]?.tijdstip === "2025-10-19T12:00:00.000Z",
  "tijdstip uit epoch-seconden",
  gelezen.berichten[0]?.tijdstip,
);
meld(
  gelezen.berichten[1]?.soort === "image" && gelezen.berichten[1]?.tekst === "",
  "een foto heeft geen tekst maar wordt niet weggegooid",
);
meld(gelezen.berichten[2]?.tekst === "Ja", "een knop-antwoord geeft de knoptekst");
meld(
  gelezen.statussen.length === 2 && gelezen.statussen[1]?.fout === "Re-engagement message",
  "twee geldige statussen, met de fout erbij",
);
meld(
  leesWebhook(null).berichten.length === 0 && leesWebhook({ entry: "x" }).berichten.length === 0,
  "onzin levert niets op en geen fout",
);

console.log("\nZelf beginnen en opvolgen\n" + "=".repeat(52));
const v = { begin: 9 * 60, eind: 18 * 60 };
meld(magZelfBeginnen(v, { weekdag: 2, minuten: 10 * 60 }), "dinsdag 10:00: ja");
meld(
  !magZelfBeginnen(v, { weekdag: 2, minuten: 18 * 60 }),
  "dinsdag 18:00: nee, het venster is dicht",
);
meld(!magZelfBeginnen(v, { weekdag: 6, minuten: 10 * 60 }), "zaterdag: nee");
const leads = [
  {
    id: "a",
    telefoon: "0612345678",
    status: "gekwalificeerd",
    verzonden_op: "2026-10-16T10:00:00Z",
  },
  { id: "b", telefoon: null, status: "gekwalificeerd", verzonden_op: "2026-10-16T10:00:00Z" },
  { id: "c", telefoon: "0612345678", status: "afgewezen", verzonden_op: "2026-10-16T10:00:00Z" },
  { id: "d", telefoon: "0612345678", status: "twijfel", verzonden_op: "2026-10-18T13:00:00Z" },
  { id: "e", telefoon: "0612345678", status: "gekwalificeerd", verzonden_op: null },
  { id: "f", telefoon: "0612345678", status: "twijfel", verzonden_op: "2026-10-16T10:00:00Z" },
  { id: "g", telefoon: "12", status: "gekwalificeerd", verzonden_op: "2026-10-16T10:00:00Z" },
];
const keus = leadsOmOpTeVolgen(leads, new Set(["f"]), 2, nu).map((l) => l.id);
meld(
  JSON.stringify(keus) === JSON.stringify(["a"]),
  "alleen de lead met nummer, open, twee dagen zonder reactie, nog niet opgevolgd",
  JSON.stringify(keus),
);
meld(
  leadsOmOpTeVolgen(leads, new Set(), 0, nu)
    .map((l) => l.id)
    .includes("d"),
  "met 0 dagen telt de verse ook mee",
);

console.log(gezakt ? `\n${gezakt} controle(s) gezakt.` : "\nAlles in orde.");
process.exit(gezakt ? 1 : 0);
