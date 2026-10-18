import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mijnAgent } from "@/lib/agent-toegang";

/** Het scherm Afspraken: de lijst, de wachtlijst, en de knoppen per afspraak. */
type Rpc = {
  rpc: (
    naam: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};
// De tabellen staan pas in de gegenereerde types na de migratie.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ongetypt = { from: (t: string) => any };

export type Afspraak = {
  id: string;
  klant_naam: string | null;
  klant_email: string;
  telefoon: string | null;
  begint_op: string;
  eindigt_op: string | null;
  omschrijving: string | null;
  locatie: string | null;
  status: "gepland" | "bevestigd" | "verzet_gevraagd" | "geannuleerd" | "no_show" | "afgerond";
  herinnerd: number[];
  bevestigd_op: string | null;
  reactie_op: string | null;
  laatste_reactie: string | null;
  bron: string;
};
export type Wachtende = {
  id: string;
  naam: string | null;
  email: string;
  telefoon: string | null;
  voorkeur: string | null;
  status: "wacht" | "aangeboden" | "geplaatst" | "vervallen";
  aangemaakt_op: string;
};
export type AfspraakCijfers = {
  afspraken: number;
  bevestigd: number;
  verzet: number;
  no_shows: number;
  afgerond: number;
  komende_week: number;
  wachtlijst: number;
  no_show_percentage: number | null;
};

function naarCijfers(r: Record<string, unknown> | undefined): AfspraakCijfers | null {
  if (!r) return null;
  const n = (k: string) => Number(r[k] ?? 0);
  return {
    afspraken: n("afspraken"),
    bevestigd: n("bevestigd"),
    verzet: n("verzet"),
    no_shows: n("no_shows"),
    afgerond: n("afgerond"),
    komende_week: n("komende_week"),
    wachtlijst: n("wachtlijst"),
    no_show_percentage: r["no_show_percentage"] == null ? null : n("no_show_percentage"),
  };
}

export const haalAfspraken = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as unknown as Ongetypt;
    const vanaf = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [rijen, wacht, afz, agent, cijfers] = await Promise.all([
      sb
        .from("afspraken")
        .select(
          "id, klant_naam, klant_email, telefoon, begint_op, eindigt_op, omschrijving, locatie, status, herinnerd, bevestigd_op, reactie_op, laatste_reactie, bron",
        )
        .eq("agent_id", data.agentId)
        .gte("begint_op", vanaf)
        .order("begint_op", { ascending: true })
        .limit(500),
      sb
        .from("afspraak_wachtlijst")
        .select("id, naam, email, telefoon, voorkeur, status, aangemaakt_op")
        .eq("agent_id", data.agentId)
        .order("aangemaakt_op", { ascending: true })
        .limit(200),
      sb
        .from("support_instellingen")
        .select("afzender_naam, afzender_email, ondertekening")
        .eq("agent_id", data.agentId)
        .maybeSingle(),
      sb.from("agents").select("inbound_local, opties").eq("id", data.agentId).maybeSingle(),
      (context.supabase as unknown as Rpc).rpc("afspraken_kerncijfers", {
        _agent_id: data.agentId,
        _dagen: 30,
      }),
    ]);
    const domein = process.env["RESEND_INBOUND_DOMEIN"] ?? null;
    const rij = agent.data as {
      inbound_local?: string | null;
      opties?: Record<string, unknown> | null;
    } | null;
    const opties = rij?.opties ?? {};
    return {
      beschikbaar: !rijen.error,
      afspraken: (rijen.data ?? []) as Afspraak[],
      wachtlijst: (wacht.data ?? []) as Wachtende[],
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
      herinnerUren: Array.isArray(opties["herinneren_op"])
        ? (opties["herinneren_op"] as string[])
        : ["48", "2"],
      wachtlijstAan: opties["wachtlijst"] === true,
      naNoShow: opties["na_no_show"] !== false,
    };
  });

export const haalAfspraakCijfers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({ agentId: z.string().uuid(), dagen: z.number().int().min(1).max(3650).default(30) })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<AfspraakCijfers | null> => {
    const { data: rijen, error } = await (context.supabase as unknown as Rpc).rpc(
      "afspraken_kerncijfers",
      { _agent_id: data.agentId, _dagen: data.dagen },
    );
    if (error) return null;
    return naarCijfers(((rijen ?? []) as Array<Record<string, unknown>>)[0]);
  });

const afspraakSchema = z.object({
  klant_naam: z.string().trim().max(120).nullable().optional(),
  klant_email: z.string().trim().toLowerCase().email(),
  telefoon: z.string().trim().max(40).nullable().optional(),
  begint_op: z.string().datetime({ offset: true }),
  eindigt_op: z.string().datetime({ offset: true }).nullable().optional(),
  omschrijving: z.string().trim().max(200).nullable().optional(),
  locatie: z.string().trim().max(200).nullable().optional(),
  extern_id: z.string().trim().max(200).optional(),
});

export const zetAfspraken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        agentId: z.string().uuid(),
        afspraken: z.array(afspraakSchema).min(1).max(1000),
        bron: z.enum(["handmatig", "bestand"]).default("handmatig"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    const sb = context.supabase as unknown as Ongetypt;
    const rijen = data.afspraken.map((a) => ({
      agent_id: data.agentId,
      klant_naam: a.klant_naam ?? null,
      klant_email: a.klant_email,
      telefoon: a.telefoon ?? null,
      begint_op: a.begint_op,
      eindigt_op: a.eindigt_op ?? null,
      omschrijving: a.omschrijving ?? null,
      locatie: a.locatie ?? null,
      bron: data.bron,
      // Zonder eigen id: adres + tijdstip, zodat een lijst die opnieuw wordt
      // ingelezen dezelfde afspraak niet twee keer maakt.
      extern_id: a.extern_id ?? `${a.klant_email}|${a.begint_op}`,
    }));
    const { error } = await sb
      .from("afspraken")
      .upsert(rijen, { onConflict: "agent_id,extern_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { aantal: rijen.length };
  });

export const zetAfspraakStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        agentId: z.string().uuid(),
        status: z.enum([
          "gepland",
          "bevestigd",
          "verzet_gevraagd",
          "geannuleerd",
          "no_show",
          "afgerond",
        ]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    const velden: Record<string, unknown> = {
      status: data.status,
      bijgewerkt_op: new Date().toISOString(),
    };
    if (data.status === "bevestigd") velden["bevestigd_op"] = new Date().toISOString();
    const { error } = await (context.supabase as unknown as Ongetypt)
      .from("afspraken")
      .update(velden)
      .eq("id", data.id)
      .eq("agent_id", data.agentId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const verwijderAfspraak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ id: z.string().uuid(), agentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    const { error } = await (context.supabase as unknown as Ongetypt)
      .from("afspraken")
      .delete()
      .eq("id", data.id)
      .eq("agent_id", data.agentId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const zetOpWachtlijst = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        agentId: z.string().uuid(),
        naam: z.string().trim().max(120).nullable().optional(),
        email: z.string().trim().toLowerCase().email(),
        telefoon: z.string().trim().max(40).nullable().optional(),
        voorkeur: z.string().trim().max(200).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    const { error } = await (context.supabase as unknown as Ongetypt)
      .from("afspraak_wachtlijst")
      .insert({
        agent_id: data.agentId,
        naam: data.naam ?? null,
        email: data.email,
        telefoon: data.telefoon ?? null,
        voorkeur: data.voorkeur ?? null,
      });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const zetWachtlijstStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        agentId: z.string().uuid(),
        status: z.enum(["wacht", "aangeboden", "geplaatst", "vervallen"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    const { error } = await (context.supabase as unknown as Ongetypt)
      .from("afspraak_wachtlijst")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("agent_id", data.agentId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
