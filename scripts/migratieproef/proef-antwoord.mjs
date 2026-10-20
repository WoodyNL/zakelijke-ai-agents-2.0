import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const SQL = readFileSync("/Users/wouterransijn/code/zakelijke-ai-agents-2.0/supabase/migrations/20261020120000_agent_antwoordt.sql","utf8");
let gezakt = 0;
const meld = (g, n, d = "") => { console.log(`  ${g ? "✓" : "✗"} ${n}${d ? "  " + d : ""}`); if (!g) gezakt++; };

const db = new PGlite();
await db.exec(`
  CREATE SCHEMA IF NOT EXISTS public;
  CREATE TABLE public.outbound_contacts (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
  CREATE TABLE public.outbound_replies (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
  CREATE TABLE public.outbound_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id uuid NOT NULL REFERENCES public.outbound_contacts(id) ON DELETE CASCADE,
    stap smallint NOT NULL DEFAULT 1 CHECK (stap BETWEEN 1 AND 10),
    aangemaakt_op timestamptz NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX outbound_messages_stap_uniek ON public.outbound_messages (contact_id, stap);
`);
const { rows: [c] } = await db.query(`INSERT INTO public.outbound_contacts DEFAULT VALUES RETURNING id`);
const { rows: [r1] } = await db.query(`INSERT INTO public.outbound_replies DEFAULT VALUES RETURNING id`);
const { rows: [r2] } = await db.query(`INSERT INTO public.outbound_replies DEFAULT VALUES RETURNING id`);

console.log("\nMigratie: de agent antwoordt\n" + "=".repeat(52));
try { await db.exec(SQL); meld(true, "migratie draait"); }
catch (e) { meld(false, "migratie draait", e.message); process.exit(1); }
try { await db.exec(SQL); meld(true, "en kan twee keer draaien"); }
catch (e) { meld(false, "en kan twee keer draaien", e.message); }

const ins = (stap, antwoordOp = null) =>
  db.query(`INSERT INTO public.outbound_messages (contact_id, stap, in_antwoord_op) VALUES ($1,$2,$3)`,
    [c.id, stap, antwoordOp]);

console.log("\nDe vaste stappen blijven beschermd\n" + "=".repeat(52));
await ins(1);
let fout = null; try { await ins(1); } catch (e) { fout = e.message; }
meld(fout !== null, "een tweede eerste bericht wordt geweigerd");
await ins(2); await ins(3); await ins(4);
fout = null; try { await ins(4); } catch (e) { fout = e.message; }
meld(fout !== null, "een tweede bezorgbevestiging ook");

console.log("\nEen gesprek mag doorlopen\n" + "=".repeat(52));
fout = null;
try { await ins(5, r1.id); await ins(5, r2.id); } catch (e) { fout = e.message; }
meld(fout === null, "twee antwoorden op twee verschillende reacties", fout ?? "");

console.log("\nMaar nooit twee keer op hetzelfde bericht\n" + "=".repeat(52));
fout = null; try { await ins(5, r1.id); } catch (e) { fout = e.message; }
meld(fout !== null, "een tweede antwoord op dezelfde reactie wordt geweigerd",
  fout ? "(" + fout.slice(0, 48) + ")" : "ER KWAM EEN DUBBELE DOOR");

const { rows: [n] } = await db.query(`SELECT count(*)::int AS n FROM public.outbound_messages WHERE stap = 5`);
meld(n.n === 2, "er staan precies twee antwoorden", String(n.n));

console.log("\n" + "=".repeat(52));
if (gezakt) { console.log(`${gezakt} test(s) mislukt.\n`); process.exit(1); }
console.log("Alles in orde.\n");
