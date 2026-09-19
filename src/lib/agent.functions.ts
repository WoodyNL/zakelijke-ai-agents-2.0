import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Rpc = {
  rpc: (
    naam: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export type Gebeurtenis = {
  id: number;
  soort: string;
  van: string | null;
  naar: string | null;
  door: string;
  op: string;
};

/**
 * De klant zet zijn eigen agent stil, of weer aan (fase 3).
 *
 * Wie het mag en welke wissels kunnen, bepaalt de database: alleen de eigenaar,
 * alleen tussen live en gepauzeerd. Een meekijkende beheerder kan het niet.
 *
 * Bij een e-mailagent trekken we daarna in wat al bij Resend klaarstaat.
 * Anders is pauzeren een knop die niets doet: de berichten zijn al ingepland.
 * Dat gebeurt pas nadat de database de wissel heeft goedgekeurd, dus alleen
 * voor een agent die van deze gebruiker is.
 */
export const pauzeerAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid(), pauze: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const db = context.supabase as unknown as Rpc;
    const { data: status, error } = await db.rpc("zet_agent_pauze", {
      _agent_id: data.agentId,
      _pauze: data.pauze,
    });
    if (error) throw new Error(error.message);

    let ingetrokken = 0;
    let nietGelukt = 0;
    if (data.pauze) {
      const { data: agent } = await context.supabase
        .from("agents")
        .select("kind")
        .eq("id", data.agentId)
        .maybeSingle();
      if ((agent as { kind?: string } | null)?.kind === "uitgaande_email") {
        const { trekGeplandeBerichtenIn } = await import("@/lib/verzenden.server");
        ({ ingetrokken, nietGelukt } = await trekGeplandeBerichtenIn(data.agentId));
      }
    }
    return { status: status as string, ingetrokken, nietGelukt };
  });

/** Wanneer de agent live ging, gepauzeerd werd, en door wie. */
export const haalGebeurtenissen = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<Gebeurtenis[]> => {
    const { data: rijen, error } = await (context.supabase as unknown as Rpc).rpc(
      "agent_gebeurtenissen_van",
      { _agent_id: data.agentId },
    );
    // Zonder migratie bestaat de functie nog niet: dan is er ook niets te tonen.
    if (error) return [];
    return (rijen ?? []) as Gebeurtenis[];
  });

export type Kerncijfers = {
  gesprekken: number;
  leads: number;
  laatste_activiteit: string | null;
};

/** Gesprekken, leads en laatste activiteit over een periode (fase 4). */
export const haalKerncijfers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ agentId: z.string().uuid(), dagen: z.number().int().min(1).max(3650) }).parse(d),
  )
  .handler(async ({ context, data }): Promise<Kerncijfers | null> => {
    const { data: rijen, error } = await (context.supabase as unknown as Rpc).rpc(
      "agent_kerncijfers",
      { _agent_id: data.agentId, _dagen: data.dagen },
    );
    if (error) return null;
    return ((rijen ?? []) as Kerncijfers[])[0] ?? null;
  });
