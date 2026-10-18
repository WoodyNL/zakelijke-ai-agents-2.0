import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mijnAgent } from "@/lib/agent-toegang";
import { legVast } from "@/lib/beheerlog";

/**
 * Het scherm Facturen van de betaalherinnering-agent.
 *
 * De klant beheert zijn eigen lijst: inlezen, invoeren, betaald of gepauzeerd
 * of uit handen zetten. Dat gaat met zijn eigen sessie (RLS: eigenaar en team;
 * een meekijker alleen lezend). Het versturen doet de server in zijn ronde.
 */

type Rpc = {
  rpc: (
    naam: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};
// De tabellen staan pas in de gegenereerde types na de migratie.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ongetypt = { from: (t: string) => any };

export type Factuur = {
  id: string;
  nummer: string;
  klant_naam: string | null;
  klant_email: string;
  bedrag: number;
  factuurdatum: string;
  vervaldatum: string;
  betaald_op: string | null;
  status: "open" | "betaald" | "gepauzeerd" | "uit_handen";
  laatste_stap: number;
  laatste_herinnering_op: string | null;
  pauze_tot: string | null;
  reactie_op: string | null;
  laatste_reactie: string | null;
  bron: string;
  notitie: string | null;
  bijgewerkt_op: string;
};

export type FactuurCijfers = {
  open_aantal: number;
  open_bedrag: number;
  over_termijn_aantal: number;
  over_termijn_bedrag: number;
  herinnerd: number;
  betaald: number;
  betaald_na_herinnering: number;
  betaaltermijn_dagen: number | null;
};

const factuurSchema = z.object({
  nummer: z.string().trim().min(1).max(60),
  klant_naam: z.string().trim().max(120).nullable(),
  klant_email: z.string().trim().toLowerCase().email(),
  bedrag: z.number().min(0).max(10_000_000),
  factuurdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  vervaldatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  betaald_op: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

function naarCijfers(r: Record<string, unknown> | undefined): FactuurCijfers | null {
  if (!r) return null;
  const n = (k: string) => Number(r[k] ?? 0);
  return {
    open_aantal: n("open_aantal"),
    open_bedrag: n("open_bedrag"),
    over_termijn_aantal: n("over_termijn_aantal"),
    over_termijn_bedrag: n("over_termijn_bedrag"),
    herinnerd: n("herinnerd"),
    betaald: n("betaald"),
    betaald_na_herinnering: n("betaald_na_herinnering"),
    betaaltermijn_dagen: r["betaaltermijn_dagen"] == null ? null : n("betaaltermijn_dagen"),
  };
}

export const haalFacturen = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as unknown as Ongetypt;
    const [rijen, afz, agent, cijfers, log] = await Promise.all([
      sb
        .from("facturen")
        .select("*")
        .eq("agent_id", data.agentId)
        .order("status")
        .order("vervaldatum", { ascending: true })
        .limit(500),
      sb
        .from("support_instellingen")
        .select("afzender_naam, afzender_email, ondertekening")
        .eq("agent_id", data.agentId)
        .maybeSingle(),
      sb.from("agents").select("inbound_local, opties").eq("id", data.agentId).maybeSingle(),
      (context.supabase as unknown as Rpc).rpc("facturen_kerncijfers", {
        _agent_id: data.agentId,
        _dagen: 30,
      }),
      sb
        .from("factuur_herinneringen")
        .select("factuur_id, stap, moment, verstuurd_op, onderwerp")
        .eq("agent_id", data.agentId)
        .order("verstuurd_op", { ascending: false })
        .limit(300),
    ]);
    const domein = process.env["RESEND_INBOUND_DOMEIN"] ?? null;
    const rij = agent.data as {
      inbound_local?: string | null;
      opties?: Record<string, unknown> | null;
    } | null;
    const opties = rij?.opties ?? {};
    return {
      beschikbaar: !rijen.error,
      facturen: (rijen.data ?? []) as Factuur[],
      herinneringen: (log.data ?? []) as Array<{
        factuur_id: string;
        stap: number;
        moment: number;
        verstuurd_op: string;
        onderwerp: string | null;
      }>,
      afzender: (afz.data ?? {
        afzender_naam: null,
        afzender_email: null,
        ondertekening: null,
      }) as {
        afzender_naam: string | null;
        afzender_email: string | null;
        ondertekening: string | null;
      },
      cijfers: naarCijfers(((cijfers.data ?? []) as Array<Record<string, unknown>>)[0]),
      antwoordAdres: rij?.inbound_local
        ? domein
          ? `${rij.inbound_local}@${domein}`
          : rij.inbound_local
        : null,
      momenten: Array.isArray(opties["herinnering_momenten"])
        ? (opties["herinnering_momenten"] as string[])
        : ["-3", "3", "14", "30"],
      max: Number(opties["herinnering_max"]) || 3,
      koppeling:
        typeof opties["boekhoudkoppeling"] === "string" && opties["boekhoudkoppeling"] !== "geen",
    };
  });

export const haalFactuurCijfers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({ agentId: z.string().uuid(), dagen: z.number().int().min(1).max(3650).default(30) })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<FactuurCijfers | null> => {
    const { data: rijen, error } = await (context.supabase as unknown as Rpc).rpc(
      "facturen_kerncijfers",
      { _agent_id: data.agentId, _dagen: data.dagen },
    );
    if (error) return null;
    return naarCijfers(((rijen ?? []) as Array<Record<string, unknown>>)[0]);
  });

/**
 * Een lijst inlezen. Bestaande nummers worden bijgewerkt (bedrag, datums,
 * betaald) en niet overgeslagen: een verse export is juist hoe de agent
 * hoort te weten wat er intussen betaald is. De reeks (laatste_stap) blijft
 * staan, anders begint hij bij elke import opnieuw bij stap één.
 */
export const importeerFacturen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({ agentId: z.string().uuid(), facturen: z.array(factuurSchema).min(1).max(2000) })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    const sb = context.supabase as unknown as Ongetypt;
    const nu = new Date().toISOString();
    const rijen = data.facturen.map((f) => ({
      agent_id: data.agentId,
      nummer: f.nummer,
      klant_naam: f.klant_naam,
      klant_email: f.klant_email,
      bedrag: f.bedrag,
      factuurdatum: f.factuurdatum,
      vervaldatum: f.vervaldatum,
      betaald_op: f.betaald_op ?? null,
      status: f.betaald_op ? "betaald" : undefined,
      bron: "bestand",
      bijgewerkt_op: nu,
    }));
    let verwerkt = 0;
    for (let i = 0; i < rijen.length; i += 200) {
      const blok = rijen
        .slice(i, i + 200)
        .map((r) => (r.status === undefined ? (({ status: _s, ...rest }) => rest)(r) : r));
      const { error } = await sb.from("facturen").upsert(blok, { onConflict: "agent_id,nummer" });
      if (error) throw new Error(`Opslaan onderbroken na ${verwerkt} facturen: ${error.message}`);
      verwerkt += blok.length;
    }
    // Wat in het bestand betaald is, is betaald — ook als de reeks liep.
    const betaald = data.facturen.filter((f) => f.betaald_op).map((f) => f.nummer);
    if (betaald.length > 0) {
      await sb
        .from("facturen")
        .update({ status: "betaald" })
        .eq("agent_id", data.agentId)
        .in("nummer", betaald);
    }
    await legVast(context as never, {
      actie: "facturen.ingelezen",
      omschrijving: `${verwerkt} facturen ingelezen`,
      agentId: data.agentId,
      details: { aantal: verwerkt, betaald: betaald.length },
    });
    return { verwerkt, betaald: betaald.length };
  });

export const nieuweFactuur = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ agentId: z.string().uuid(), factuur: factuurSchema }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    const sb = context.supabase as unknown as Ongetypt;
    const { error } = await sb
      .from("facturen")
      .insert({ ...data.factuur, agent_id: data.agentId, bron: "handmatig" });
    if (error)
      throw new Error(
        /duplicate|unique/i.test(error.message) ? "Dit factuurnummer staat er al." : error.message,
      );
    return { ok: true as const };
  });

export const zetFactuurStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        agentId: z.string().uuid(),
        status: z.enum(["open", "betaald", "gepauzeerd", "uit_handen"]),
        /** Bij pauzeren: tot wanneer (ISO-datum). */
        tot: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    const sb = context.supabase as unknown as Ongetypt;
    const velden: Record<string, unknown> = {
      status: data.status,
      bijgewerkt_op: new Date().toISOString(),
    };
    if (data.status === "betaald") velden["betaald_op"] = new Date().toISOString().slice(0, 10);
    if (data.status === "open") {
      velden["betaald_op"] = null;
      velden["pauze_tot"] = null;
    }
    if (data.status === "gepauzeerd") velden["pauze_tot"] = data.tot ?? null;
    const { error } = await sb
      .from("facturen")
      .update(velden)
      .eq("id", data.id)
      .eq("agent_id", data.agentId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const verwijderFactuur = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ id: z.string().uuid(), agentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    const { error } = await (context.supabase as unknown as Ongetypt)
      .from("facturen")
      .delete()
      .eq("id", data.id)
      .eq("agent_id", data.agentId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
