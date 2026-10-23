import assert from "node:assert/strict";
import { controleerTweedeStap } from "../src/lib/tweestaps-eis.ts";

const bevestigd = { data: [{ ingesteld: true, niveau: "aal2" }], error: null };
assert.throws(() => controleerTweedeStap(true, {
  ...bevestigd, error: { message: "RPC unavailable" },
}), /niet worden gecontroleerd/);
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