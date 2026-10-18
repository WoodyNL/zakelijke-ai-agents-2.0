import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mijnAgent, nietGepauzeerd } from "@/lib/agent-toegang";
import { legVast } from "@/lib/beheerlog";
import { vensterOpen } from "@/lib/whatsapp";

/** Het scherm WhatsApp van de WhatsApp-opvolger. */
type Rpc = {
  rpc: (
    naam: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};
// De tabellen staan pas in de gegenereerde types na de migratie.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ongetypt = { from: (t: string) => any };

export type WaGesprek = {
  id: string;
  telefoon: string;
  naam: string | null;
  status: "open" | "overgedragen" | "gesloten";
  laatste_inkomend_op: string | null;
  laatste_bericht: string | null;
  laatste_op: string;
  overgedragen_op: string | null;
  overdracht_reden: string | null;
  lead_id: string | null;
  gestart_op: string | null;
  /** Mag er nu nog vrij geantwoord worden? */
  venster_open: boolean;
};
export type WaBericht = {
  id: number;
  richting: "in" | "uit";
  door: "agent" | "mens" | "sjabloon";
  tekst: string;
  status: string;
  fout: string | null;
  op: string;
};
export type WaCijfers = {
  gesprekken: number;
  berichten_in: number;
  berichten_uit: number;
  door_agent: number;
  overdrachten: number;
  open_overgedragen: number;
  reactie_seconden: number | null;
};
function naarCijfers(r: Record<string, unknown> | undefined): WaCijfers | null {
  if (!r) return null;
  const n = (k: string) => Number(r[k] ?? 0);
  return {
    gesprekken: n("gesprekken"),
    berichten_in: n("berichten_in"),
    berichten_uit: n("berichten_uit"),
    door_agent: n("door_agent"),
    overdrachten: n("overdrachten"),
    open_overgedragen: n("open_overgedragen"),
    reactie_seconden: r["reactie_seconden"] == null ? null : n("reactie_seconden"),
  };
}

export const haalWhatsApp = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as unknown as Ongetypt;
    const [rijen, agent, cijfers] = await Promise.all([
      sb
        .from("whatsapp_gesprekken")
        .select(
          "id, telefoon, naam, status, laatste_inkomend_op, laatste_bericht, laatste_op, overgedragen_op, overdracht_reden, lead_id, gestart_op",
        )
        .eq("agent_id", data.agentId)
        .order("laatste_op", { ascending: false })
        .limit(200),
      sb.from("agents").select("opties").eq("id", data.agentId).maybeSingle(),
      (context.supabase as unknown as Rpc).rpc("whatsapp_kerncijfers", {
        _agent_id: data.agentId,
        _dagen: 30,
      }),
    ]);
    const opties = ((agent.data as { opties?: Record<string, unknown> | null } | null)?.opties ??
      {}) as Record<string, unknown>;
    const { ingesteld, leadsVoorOpvolging } = await import("@/lib/whatsapp.server");
    const opServer = ingesteld();
    const leads = opServer ? await leadsVoorOpvolging(data.agentId).catch(() => []) : [];
    return {
      beschikbaar: !rijen.error,
      gesprekken: ((rijen.data ?? []) as Array<Omit<WaGesprek, "venster_open">>).map((g) => ({
        ...g,
        venster_open: vensterOpen(g.laatste_inkomend_op),
      })) as WaGesprek[],
      cijfers: naarCijfers(((cijfers.data ?? []) as Array<Record<string, unknown>>)[0]),
      koppeling: {
        opServer,
        nummer: typeof opties["nummer"] === "string" ? (opties["nummer"] as string) : null,
        nummerId: !!opties["phone_number_id"],
        sjabloon: typeof opties["sjabloon"] === "string" && !!opties["sjabloon"],
      },
      automatisch: opties["automatisch_opvolgen"] === true,
      naDagen: Number(opties["opvolgen_na_dagen"] ?? 2),
      overdrachtWoorden: Array.isArray(opties["overdracht_woorden"])
        ? (opties["overdracht_woorden"] as unknown[]).map(String)
        : ["klacht", "annuleren", "jurist"],
      leads,
    };
  });

export const haalWhatsAppCijfers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({ agentId: z.string().uuid(), dagen: z.number().int().min(1).max(3650).default(30) })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<WaCijfers | null> => {
    const { data: rijen, error } = await (context.supabase as unknown as Rpc).rpc(
      "whatsapp_kerncijfers",
      { _agent_id: data.agentId, _dagen: data.dagen },
    );
    if (error) return null;
    return naarCijfers(((rijen ?? []) as Array<Record<string, unknown>>)[0]);
  });

export const haalWaBerichten = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ agentId: z.string().uuid(), gesprekId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }): Promise<WaBericht[]> => {
    const { data: rijen, error } = await (context.supabase as unknown as Ongetypt)
      .from("whatsapp_berichten")
      .select("id, richting, door, tekst, status, fout, op")
      .eq("agent_id", data.agentId)
      .eq("gesprek_id", data.gesprekId)
      .order("op", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return (rijen ?? []) as WaBericht[];
  });

export const stuurWaBericht = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        agentId: z.string().uuid(),
        gesprekId: z.string().uuid(),
        tekst: z.string().trim().min(1).max(4000),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    await nietGepauzeerd(context as never, data.agentId);
    const { stuurAlsMens } = await import("@/lib/whatsapp.server");
    const uit = await stuurAlsMens(data.agentId, data.gesprekId, data.tekst);
    if (!uit.ok) throw new Error(uit.melding);
    await legVast(context as never, {
      actie: "whatsapp.beantwoord",
      omschrijving: "Zelf een WhatsApp-bericht gestuurd",
      agentId: data.agentId,
    });
    return { ok: true as const };
  });

export const zetWaStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        agentId: z.string().uuid(),
        gesprekId: z.string().uuid(),
        status: z.enum(["open", "overgedragen", "gesloten"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    const velden: Record<string, unknown> = { status: data.status };
    if (data.status === "overgedragen") {
      velden["overgedragen_op"] = new Date().toISOString();
      velden["overdracht_reden"] = "Zelf overgenomen in het portaal.";
    }
    const { error } = await (context.supabase as unknown as Ongetypt)
      .from("whatsapp_gesprekken")
      .update(velden)
      .eq("id", data.gesprekId)
      .eq("agent_id", data.agentId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const volgLeadOpViaWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ agentId: z.string().uuid(), leadId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    await nietGepauzeerd(context as never, data.agentId);
    const { volgLeadOp } = await import("@/lib/whatsapp.server");
    const uit = await volgLeadOp(data.agentId, data.leadId, "mens");
    if (!uit.ok) throw new Error(uit.melding);
    await legVast(context as never, {
      actie: "whatsapp.opgevolgd",
      omschrijving: "Een lead via WhatsApp opgevolgd",
      agentId: data.agentId,
    });
    return { ok: true as const };
  });
