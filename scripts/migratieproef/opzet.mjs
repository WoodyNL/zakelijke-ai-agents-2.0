import { PGlite } from "@electric-sql/pglite";

export async function nieuweDb(aantalAgents = 1) {
  const db = new PGlite();
  await db.exec(`
    CREATE TYPE public.agent_kind AS ENUM ('maatwerk', 'uitgaande_email');
    CREATE TYPE public.contact_herkomst AS ENUM ('oud_klant', 'koud', 'test');

    CREATE TABLE public.agents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      kind public.agent_kind NOT NULL
    );

    CREATE TABLE public.outbound_contacts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
      email text NOT NULL,
      naam text, bedrijf text, plaats text,
      herkomst public.contact_herkomst NOT NULL DEFAULT 'koud',
      notitie text,
      afmeldsleutel uuid NOT NULL DEFAULT gen_random_uuid(),
      aangemaakt_op timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX outbound_contacts_uniek
      ON public.outbound_contacts (agent_id, lower(email));
  `);
  await db.exec(`INSERT INTO public.agents (name, kind) VALUES ('Website-assistent', 'maatwerk');`);
  for (let i = 0; i < aantalAgents; i++) {
    await db.exec(`INSERT INTO public.agents (name, kind) VALUES ('E-mailagent ${i}', 'uitgaande_email');`);
  }
  return db;
}
