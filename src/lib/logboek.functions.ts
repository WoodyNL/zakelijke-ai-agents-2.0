import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Het logboek lezen.
 *
 * Wij zien alles, een klant ziet wat over zijn account gaat. Dat verschil
 * maakt de database (RLS), niet deze code; hier staat alleen welke velden we
 * tonen. De klant krijgt zijn eigen functie, zonder `details`, want daar staat
 * wat wij nodig hebben om een wijziging terug te vinden.
 */

/** beheerlog staat nog niet in de gegenereerde types; die komen na de migratie. */
type Ongetypt = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (tabel: string) => any;
};

type Rpc = {
  rpc: (
    naam: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export type Logregel = {
  id: number;
  moment: string;
  door_naam: string;
  door_rol: "admin" | "support" | "klant";
  actie: string;
  omschrijving: string;
  client_id: string | null;
  agent_id: string | null;
};

export type MijnLogregel = {
  id: number;
  moment: string;
  door: string;
  door_rol: "admin" | "support" | "klant";
  actie: string;
  omschrijving: string;
};

export const haalLogboek = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ aantal: z.number().int().min(1).max(200).default(60) }).parse(d),
  )
  .handler(async ({ context, data }): Promise<Logregel[]> => {
    const { data: rijen, error } = await (context.supabase as unknown as Ongetypt)
      .from("beheerlog")
      .select("id, moment, door_naam, door_rol, actie, omschrijving, client_id, agent_id")
      .order("moment", { ascending: false })
      .limit(data.aantal);
    // Staat de migratie nog niet, dan is er ook nog geen logboek.
    if (error) return [];
    return (rijen ?? []) as Logregel[];
  });

export const haalMijnLogboek = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MijnLogregel[]> => {
    const { data, error } = await (context.supabase as unknown as Rpc).rpc("mijn_logboek", {
      _aantal: 50,
    });
    if (error) return [];
    return (data ?? []) as MijnLogregel[];
  });
