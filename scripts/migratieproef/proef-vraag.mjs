import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const SQL = readFileSync("/Users/wouterransijn/code/zakelijke-ai-agents-2.0/supabase/migrations/20261020140000_vraag_afgehandeld.sql","utf8");
let gezakt = 0;
const meld = (g,n,d="") => { console.log(`  ${g?"✓":"✗"} ${n}${d?"  "+d:""}`); if(!g) gezakt++; };

const db = new PGlite();
await db.exec(`
  CREATE SCHEMA IF NOT EXISTS private;
  CREATE TABLE public.chatgesprekken (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agent_id uuid NOT NULL);
  CREATE TABLE public.chatberichten (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    gesprek_id uuid NOT NULL REFERENCES public.chatgesprekken(id),
    rol text NOT NULL, tekst text NOT NULL,
    onbeantwoord boolean NOT NULL DEFAULT false,
    op timestamptz NOT NULL DEFAULT now()
  );
  CREATE FUNCTION private.owns_agent(a uuid, u uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  CREATE ROLE service_role;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT gen_random_uuid() $$;
`);
// De oude versie van de functie eerst neerzetten, precies zoals hij in
// productie staat. Anders draait de migratie op een lege database en komt de
// enige interessante fout niet boven: PostgreSQL weigert CREATE OR REPLACE als
// het returntype verandert. Lovable moest daar met de hand een DROP voor
// toevoegen, en dat had deze proef moeten vangen.
await db.exec(`
  CREATE OR REPLACE FUNCTION public.onbeantwoorde_vragen(_agent_id uuid, _limiet integer DEFAULT 50)
  RETURNS TABLE (gesprek_id uuid, vraag text, antwoord text, op timestamptz)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT g.id, 'oud'::text, a.tekst, a.op
    FROM public.chatberichten a
    JOIN public.chatgesprekken g ON g.id = a.gesprek_id
    WHERE g.agent_id = _agent_id AND a.rol = 'agent' AND a.onbeantwoord
  $$;
`);

const agent = "11111111-1111-1111-1111-111111111111";
const { rows:[g] } = await db.query(`INSERT INTO public.chatgesprekken (agent_id) VALUES ($1) RETURNING id`,[agent]);
await db.query(`INSERT INTO public.chatberichten (gesprek_id, rol, tekst) VALUES ($1,'bezoeker','Leveren jullie ook op zaterdag?')`,[g.id]);
const { rows:[a] } = await db.query(`INSERT INTO public.chatberichten (gesprek_id, rol, tekst, onbeantwoord) VALUES ($1,'agent','Dat weet ik niet.',true) RETURNING id`,[g.id]);

console.log("\nMigratie: een afgehandelde vraag komt niet terug\n" + "=".repeat(52));
try { await db.exec(SQL); meld(true,"migratie draait over de bestaande functie heen"); }
catch(e){ meld(false,"migratie draait over de bestaande functie heen",e.message); process.exit(1); }
try { await db.exec(SQL); meld(true,"en kan twee keer draaien"); } catch(e){ meld(false,"en kan twee keer draaien",e.message); }

const lijst = async () => (await db.query(`SELECT * FROM public.onbeantwoorde_vragen($1,50)`,[agent])).rows;
let l = await lijst();
meld(l.length===1,"de vraag staat in de lijst",`${l.length}`);
meld(l[0]?.vraag==="Leveren jullie ook op zaterdag?","met de vraag van de bezoeker erbij",l[0]?.vraag??"");
meld(!!l[0]?.bericht_id,"en met het bericht-id, zodat het scherm weet wat het moet markeren");

await db.query(`SELECT public.markeer_vraag_afgehandeld($1)`,[a.id]);
l = await lijst();
meld(l.length===0,"na afhandelen is hij weg",`${l.length} over`);

const { rows:[b] } = await db.query(`SELECT onbeantwoord, kennis_gemaakt_op FROM public.chatberichten WHERE id=$1`,[a.id]);
meld(b.onbeantwoord===true,"maar 'onbeantwoord' blijft staan voor het dagrapport");
meld(b.kennis_gemaakt_op!==null,"en er staat wanneer het is afgehandeld");

// Twee keer afhandelen mag geen fout geven en niets stuk maken.
await db.query(`SELECT public.markeer_vraag_afgehandeld($1)`,[a.id]);
meld((await lijst()).length===0,"twee keer afhandelen verandert niets");
meld((await db.query(`SELECT public.markeer_vraag_afgehandeld($1) AS r`,[gen()])).rows[0].r===false,
  "een onbekend bericht geeft netjes false");
function gen(){ return 999999; }

console.log("\n" + "=".repeat(52));
if (gezakt) { console.log(`${gezakt} test(s) mislukt.\n`); process.exit(1); }
console.log("Alles in orde.\n");
