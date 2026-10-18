import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { legVast } from "@/lib/beheerlog";

/**
 * Het dashboard van de heractivatie-agent, en het ene vinkje dat telt.
 *
 * Wij zien geen bestellingen; of een slapende klant terug is, weet alleen de
 * klant zelf. Daarom is "teruggekomen" een vinkje op het contact, en rekent het
 * dashboard daarmee: teruggekomen × de orderwaarde die de klant zelf heeft
 * ingevuld. Een schatting, en dat staat erbij — maar het is zijn schatting, en
 * het is het getal waarmee hij de agent beoordeelt.
 */

type Rpc = {
  rpc: (
    naam: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export type Heractivatiecijfers = {
  aangeschreven: number;
  gereageerd: number;
  teruggekomen: number;
  afgemeld: number;
  in_lijst: number;
  /** Wat de klant zelf als gemiddelde orderwaarde opgaf; null als hij dat niet deed. */
  orderwaarde: number | null;
  /** teruggekomen × orderwaarde, of null zonder orderwaarde. */
  waarde: number | null;
  dagen: number;
};

export const haalHeractivatie = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({ agentId: z.string().uuid(), dagen: z.number().int().min(1).max(3650).default(90) })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<Heractivatiecijfers | null> => {
    const [{ data: rijen, error }, agent] = await Promise.all([
      (context.supabase as unknown as Rpc).rpc("heractivatie_kerncijfers", {
        _agent_id: data.agentId,
        _dagen: data.dagen,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- kolommen die de gegenereerde types pas na de migratie kennen
      (context.supabase as unknown as { from: (t: string) => any })
        .from("agents")
        .select("opties")
        .eq("id", data.agentId)
        .maybeSingle(),
    ]);
    // Staat de migratie er nog niet, dan is er niets te tonen — geen fout.
    if (error) return null;
    const r = ((rijen ?? []) as Array<Record<string, number | string>>)[0];
    if (!r) return null;

    const opties = ((agent?.data as { opties?: Record<string, unknown> } | null)?.opties ??
      {}) as Record<string, unknown>;
    const ruw = Number(opties["orderwaarde"]);
    const orderwaarde = Number.isFinite(ruw) && ruw > 0 ? ruw : null;
    const teruggekomen = Number(r["teruggekomen"] ?? 0);

    return {
      aangeschreven: Number(r["aangeschreven"] ?? 0),
      gereageerd: Number(r["gereageerd"] ?? 0),
      teruggekomen,
      afgemeld: Number(r["afgemeld"] ?? 0),
      in_lijst: Number(r["in_lijst"] ?? 0),
      orderwaarde,
      waarde: orderwaarde === null ? null : teruggekomen * orderwaarde,
      dagen: data.dagen,
    };
  });

/**
 * De klant vinkt aan dat iemand terug is (of haalt het vinkje weer weg). De
 * database controleert eigendom; meekijken komt hier niet doorheen, want
 * owns_agent kijkt naar de eigenaar en niet naar wie meekijkt.
 */
export const markeerTeruggekomen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ contactId: z.string().uuid(), terug: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: wanneer, error } = await (context.supabase as unknown as Rpc).rpc(
      "markeer_teruggekomen",
      { _contact_id: data.contactId, _terug: data.terug },
    );
    if (error) throw new Error(error.message);
    await legVast(context as never, {
      actie: data.terug ? "contact.teruggekomen" : "contact.teruggekomen_ongedaan",
      omschrijving: data.terug
        ? "Een slapende klant als teruggekomen gemarkeerd"
        : "Markering 'teruggekomen' weer weggehaald",
    });
    return { teruggekomenOp: (wanneer as string | null) ?? null };
  });
