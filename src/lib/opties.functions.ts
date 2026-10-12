import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mijnAgent } from "@/lib/agent-toegang";
import { verdeelOpslag, optiesVoor } from "@/lib/agent-opties";
import { legVast } from "@/lib/beheerlog";

/**
 * Opties lezen en schrijven.
 *
 * Wat er bestaat en wie het mag zetten, staat in agent-opties.ts. Hier gebeurt
 * alleen het verkeer: lezen met de sessie van de gebruiker (RLS bepaalt wat
 * hij ziet), en schrijven langs de enige route die bij hem past.
 *
 * Voor een beheerder is dat een gewone update op de agents-tabel. Voor een
 * klant mag dat niet — die tabel bevat ook status, tarief en fair use — dus
 * loopt het via twee databasefuncties die eigendom controleren en niets anders
 * aanraken dan de vier velden die van hem zijn, plus het optieveld.
 */

type Rpc = {
  rpc: (
    naam: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

/** De vier kolommen die een klant zelf mag zetten; de database bewaakt dit ook. */
const VAN_DE_KLANT = ["tone", "welcome_text", "notify_email", "capture_leads"] as const;

export type OptieAgent = {
  id: string;
  name: string;
  kind: string | null;
  status: string;
  model: string | null;
  tone: string | null;
  extra_instructions: string | null;
  notify_email: string | null;
  welcome_text: string | null;
  capture_leads: boolean | null;
  allowed_domains: string[] | null;
  rate_limit_per_hour: number | null;
  fair_use_per_month: number | null;
  inbound_local: string | null;
  opties: Record<string, OptieWaarde> | null;
};

/** Wat er in het optieveld kan staan; meer typen kent de catalogus niet. */
export type OptieWaarde = string | number | boolean | string[] | null;

const VELDEN =
  "id, name, kind, status, model, tone, extra_instructions, notify_email, welcome_text, capture_leads, allowed_domains, rate_limit_per_hour, fair_use_per_month, inbound_local, opties";

/**
 * De gegenereerde databasetypes kennen de kolom `opties` pas nadat de
 * migratie is gedraaid en Lovable ze opnieuw heeft gemaakt. Tot die tijd
 * weigert TypeScript het veld; vandaar deze ongetypte ingang. Dat scheelt een
 * aanpassing in een bestand dat bij elke sync wordt overschreven.
 */
type Ongetypt = {
  // De querybouwer van supabase-js, zonder de tabeltypes. Vandaar any: een
  // handgeschreven keten van select/eq/update levert hier geen veiligheid op,
  // alleen ruis, en de echte grens ligt toch bij RLS.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (tabel: string) => any;
};

export const haalAgentOpties = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<OptieAgent | null> => {
    const sb = context.supabase as unknown as Ongetypt;
    const { data: agent, error } = await sb
      .from("agents")
      .select(VELDEN)
      .eq("id", data.agentId)
      .maybeSingle();
    // Staat de migratie er nog niet, dan bestaat opties nog niet; dan werken
    // de bestaande instellingen gewoon en is de rest leeg.
    if (error) {
      const { data: zonder } = await sb
        .from("agents")
        .select(VELDEN.replace(", opties", ""))
        .eq("id", data.agentId)
        .maybeSingle();
      return zonder ? ({ ...(zonder as object), opties: {} } as OptieAgent) : null;
    }
    return (agent as OptieAgent) ?? null;
  });

const invoer = z.object({
  agentId: z.string().uuid(),
  waarden: z.record(z.string(), z.unknown()),
});

/** De beheerder zet alles; de agents-tabel is van hem. */
export const adminZetAgentOpties = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => invoer.parse(d))
  .handler(async ({ context, data }) => {
    const { data: rol } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!rol) throw new Error("Geen beheerdersrechten");

    const { data: agent, error: leesFout } = await (context.supabase as unknown as Ongetypt)
      .from("agents")
      .select("id, kind, opties, client_id")
      .eq("id", data.agentId)
      .maybeSingle();
    if (leesFout) throw new Error(leesFout.message);
    if (!agent) throw new Error("Deze agent bestaat niet.");

    const rij = agent as { kind: string | null; opties: Record<string, OptieWaarde> | null };
    const { kolommen, opties } = verdeelOpslag(rij.kind, data.waarden, "beheerder");
    const nieuw = {
      ...kolommen,
      ...(Object.keys(opties).length ? { opties: { ...(rij.opties ?? {}), ...opties } } : {}),
    };
    if (Object.keys(nieuw).length === 0) return { ok: true as const, gewijzigd: 0 };

    const { error } = await (context.supabase as unknown as Ongetypt)
      .from("agents")
      .update(nieuw)
      .eq("id", data.agentId);
    if (error) throw new Error(error.message);

    await legVast(context, {
      actie: "functies.gewijzigd",
      omschrijving: `Functies aangepast: ${labels(rij.kind, data.waarden)}`,
      clientId: (agent as { client_id?: string }).client_id ?? null,
      agentId: data.agentId,
      details: { velden: Object.keys(data.waarden) },
    });
    return { ok: true as const, gewijzigd: Object.keys(nieuw).length };
  });

/** De namen van de gewijzigde opties, voor in het logboek. */
function labels(kind: string | null | undefined, waarden: Record<string, unknown>): string {
  const alle = optiesVoor(kind);
  return (
    Object.keys(waarden)
      .map((k) => alle.find((o) => o.sleutel === k)?.label ?? k)
      .join(", ") || "niets"
  );
}

/** De klant zet alleen wat van hem is, en alleen bij zijn eigen agent. */
export const zetMijnAgentOpties = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => invoer.parse(d))
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);

    const { data: agent } = await context.supabase
      .from("agents")
      .select("kind, client_id")
      .eq("id", data.agentId)
      .maybeSingle();

    const { kolommen, opties } = verdeelOpslag(
      (agent as { kind?: string | null } | null)?.kind ?? null,
      data.waarden,
      "klant",
    );

    // Komt hier een andere kolom langs dan de vier van de klant, dan klopt de
    // catalogus niet met wat de database toestaat. Dan stoppen we, in plaats
    // van stil iets niet op te slaan.
    const onbekend = Object.keys(kolommen).filter(
      (k) => !(VAN_DE_KLANT as readonly string[]).includes(k),
    );
    if (onbekend.length > 0) {
      throw new Error(`Deze instelling kan de klant niet zelf zetten: ${onbekend.join(", ")}`);
    }

    const db = context.supabase as unknown as Rpc;
    if (Object.keys(kolommen).length > 0) {
      const { error } = await db.rpc("zet_mijn_agent_velden", {
        _agent_id: data.agentId,
        _tone: kolommen["tone"] ?? null,
        _welcome_text: kolommen["welcome_text"] ?? null,
        _notify_email: kolommen["notify_email"] ?? null,
        _capture_leads: kolommen["capture_leads"] ?? null,
      });
      if (error) throw new Error(error.message);
    }
    if (Object.keys(opties).length > 0) {
      const { error } = await db.rpc("zet_mijn_agent_opties", {
        _agent_id: data.agentId,
        _opties: opties,
      });
      if (error) throw new Error(error.message);
    }

    // Ook de klant zelf komt in het logboek. Zo kan hij later zien wanneer hij
    // iets omzette, en wij of een wijziging van hem kwam of van ons.
    await legVast(context, {
      actie: "functies.gewijzigd",
      omschrijving: `Eigen instellingen aangepast: ${labels((agent as { kind?: string | null } | null)?.kind, data.waarden)}`,
      clientId: (agent as { client_id?: string } | null)?.client_id ?? null,
      agentId: data.agentId,
      details: { velden: Object.keys(data.waarden) },
    });
    return { ok: true as const };
  });
