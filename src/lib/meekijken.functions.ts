import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Meekijken bij een klant (fase 2 van het beheerplan).
 *
 * Alle regels staan in de database: wie mag beginnen, hoe lang het duurt, dat
 * er een reden moet zijn, dat het alleen lezen is en dat de kennisbank dicht
 * blijft. Deze functies geven alleen door. Zo kan een fout hier geen gat slaan.
 */

type Rpc = {
  rpc: (
    naam: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export type Meekijksessie = {
  id: string;
  client_id: string;
  klant: string;
  reden: string;
  verloopt_op: string;
};

export type Toegang = {
  id: string;
  beheerder: string;
  reden: string;
  gestart_op: string;
  geeindigd_op: string;
  paginas: string[];
};

export const startMeekijken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        clientId: z.string().uuid(),
        reden: z.string().trim().min(10, "Geef een reden van minstens tien tekens.").max(500),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as unknown as Rpc).rpc("start_meekijken", {
      _client_id: data.clientId,
      _reden: data.reden,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const stopMeekijken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await (context.supabase as unknown as Rpc).rpc("stop_meekijken");
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** De lopende sessie van deze beheerder, of null. */
export const haalMeekijksessie = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Meekijksessie | null> => {
    const { data, error } = await (context.supabase as unknown as Rpc).rpc("mijn_meekijksessie");
    // Zonder migratie bestaat de functie niet; dan kijkt ook niemand mee.
    if (error) return null;
    return ((data ?? []) as Meekijksessie[])[0] ?? null;
  });

export const logMeekijkpagina = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ pad: z.string().min(1).max(300) }).parse(d))
  .handler(async ({ context, data }) => {
    await (context.supabase as unknown as Rpc).rpc("log_meekijkpagina", { _pad: data.pad });
    return { ok: true as const };
  });

/** Wie bij mij heeft meegekeken: voor de toegangslog op de accountpagina. */
export const haalToegangslog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Toegang[]> => {
    const { data, error } = await (context.supabase as unknown as Rpc).rpc("mijn_toegangslog");
    if (error) return [];
    return (data ?? []) as Toegang[];
  });
