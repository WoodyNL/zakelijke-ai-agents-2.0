import assert from "node:assert/strict";
import { controleerTweedeStap } from "../src/lib/tweestaps-eis.ts";

/*
 * Het patroon hieronder keek eerst naar één exacte formulering. De melding is
 * daarna herschreven zodat hij onderscheidt tussen "staat uit" en "konden we
 * niet controleren" — dezelfde uitkomst, andere woorden. Waar het hier om
 * gaat is dat een beheerder geweigerd wordt, niet hoe de zin loopt.
 */
const GAAT_OVER_CONTROLEREN = /controleren|gecontroleerd/;

const bevestigd = { data: [{ ingesteld: true, niveau: "aal2" }], error: null };
assert.throws(() => controleerTweedeStap(true, {
  ...bevestigd, error: { message: "RPC unavailable" },
}), GAAT_OVER_CONTROLEREN);
assert.throws(() => controleerTweedeStap(true, { data: null, error: null }));
assert.throws(() => controleerTweedeStap(true, {
  data: [{ ingesteld: true, niveau: "aal1" }], error: null,
}));
assert.doesNotThrow(() => controleerTweedeStap(true, bevestigd));
assert.doesNotThrow(() => controleerTweedeStap(false, {
  data: null, error: { message: "RPC unavailable" },
}));
assert.doesNotThrow(() => controleerTweedeStap(false, {
  data: [{ ingesteld: false, niveau: "aal1" }], error: null,
}));
console.log("Tweestapscontrole: beheerder faalt gesloten; support ongewijzigd.");