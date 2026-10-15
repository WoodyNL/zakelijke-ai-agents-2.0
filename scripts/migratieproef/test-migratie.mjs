import { readFileSync } from "node:fs";
import { nieuweDb } from "./opzet.mjs";

const SQL = readFileSync(
  process.env.MIGRATIE ??
    "../supabase/migrations/20261015130000_testadressen.sql",
  "utf8",
);

let gezakt = 0;
const meld = (goed, naam, detail = "") => {
  console.log(`  ${goed ? "✓" : "✗"} ${naam}${detail ? `  ${detail}` : ""}`);
  if (!goed) gezakt++;
};
const tel = async (db) =>
  Number((await db.query(`SELECT count(*)::int AS n FROM public.outbound_contacts`)).rows[0].n);

console.log("\nMigratie 20261015130000_testadressen\n" + "=".repeat(52));

// --- precies één agent: de normale situatie ---------------------------------
{
  const db = await nieuweDb(1);
  await db.exec(SQL);
  meld((await tel(db)) === 5, "vijf testadressen erin", String(await tel(db)));

  const { rows } = await db.query(
    `SELECT count(*)::int AS n FROM public.outbound_contacts WHERE herkomst = 'test'`,
  );
  meld(rows[0].n === 5, "allemaal op herkomst 'test'");

  // Dit is waar het eerder op misging: de migratietool kan een bestand opnieuw
  // aanbieden, en dan mag er geen tweede set contacten bij komen.
  await db.exec(SQL);
  meld((await tel(db)) === 5, "tweemaal draaien levert geen dubbele contacten", String(await tel(db)));

  // Gaan ze naar de juiste agent?
  const { rows: a } = await db.query(`
    SELECT a.kind::text AS kind, count(*)::int AS n
    FROM public.outbound_contacts c JOIN public.agents a ON a.id = c.agent_id
    GROUP BY a.kind`);
  meld(
    a.length === 1 && a[0].kind === "uitgaande_email" && a[0].n === 5,
    "alle vijf bij de agent voor uitgaande e-mail",
    JSON.stringify(a),
  );
  await db.close();
}

// --- geen agent: moet overslaan, niet knallen -------------------------------
{
  const db = await nieuweDb(0);
  let fout = null;
  try { await db.exec(SQL); } catch (e) { fout = e.message; }
  meld(fout === null, "zonder agent draait de migratie zonder fout", fout ?? "");
  meld((await tel(db)) === 0, "en zet niets neer");
  await db.close();
}

// --- twee agents: moet overslaan, want welke? -------------------------------
{
  const db = await nieuweDb(2);
  let fout = null;
  try { await db.exec(SQL); } catch (e) { fout = e.message; }
  meld(fout === null, "bij twee agents draait hij zonder fout", fout ?? "");
  meld(
    (await tel(db)) === 0,
    "en zet niets neer, want hij weet niet welke klant het is",
    String(await tel(db)),
  );
  await db.close();
}

console.log("\n" + "=".repeat(52));
if (gezakt > 0) { console.log(`${gezakt} test(s) mislukt.\n`); process.exit(1); }
console.log("Alles in orde.\n");
