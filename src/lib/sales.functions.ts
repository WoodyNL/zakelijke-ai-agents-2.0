import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mijnAgent, nietGepauzeerd } from "@/lib/agent-toegang";
import { legVast } from "@/lib/beheerlog";
import type { Oordeel } from "@/lib/sales";

/** Het scherm Leads van de sales-assistent. */
type Rpc = {
  rpc: (
    naam: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};
// De tabel staat pas in de gegenereerde types na de migratie.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ongetypt = { from: (t: string) => any };

export type SalesLead = {
  id: string;
  bron: string;
  naam: string | null;
  bedrijf: string | null;
  email: string;
  telefoon: string | null;
  bericht: string;
  ontvangen_op: string;
  status:
    | "nieuw"
    | "bezig"
    | "gekwalificeerd"
    | "twijfel"
    | "afgewezen"
    | "afspraak"
    | "gewonnen"
    | "verloren"
    | "mislukt";
  oordeel: Oordeel | null;
  reden: string | null;
  vragen: string[];
  concept_onderwerp: string | null;
  concept_tekst: string | null;
  concept_op: string | null;
  verzonden_tekst: string | null;
  verzonden_op: string | null;
  notitie: string | null;
  fout: string | null;
};
export type SalesCijfers = {
  leads: number;
  gekwalificeerd: number;
  afgewezen: number;
  twijfel: number;
  afspraken: number;
  gewonnen: number;
  open: number;
  reactie_minuten: number | null;
};

function naarCijfers(r: Record<string, unknown> | undefined): SalesCijfers | null {
  if (!r) return null;
  const n = (k: string) => Number(r[k] ?? 0);
  return {
    leads: n("leads"),
    gekwalificeerd: n("gekwalificeerd"),
    afgewezen: n("afgewezen"),
    twijfel: n("twijfel"),
    afspraken: n("afspraken"),
    gewonnen: n("gewonnen"),
    open: n("open"),
    reactie_minuten: r["reactie_minuten"] == null ? null : n("reactie_minuten"),
  };
}

export const haalLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    // Eerst de chatleads van dezelfde klant overnemen; dat is goedkoop en zo
    // staat een lead uit de chat er zonder dat iemand hoeft te wachten op een
    // ronde.
    try {
      const { neemChatLeadsOver } = await import("@/lib/sales.server");
      await neemChatLeadsOver(data.agentId);
    } catch (e) {
      console.warn("sales: chatleads overnemen mislukt", e);
    }
    const sb = context.supabase as unknown as Ongetypt;
    const [rijen, afz, agent, cijfers] = await Promise.all([
      sb
        .from("sales_leads")
        .select(
          "id, bron, naam, bedrijf, email, telefoon, bericht, ontvangen_op, status, oordeel, reden, vragen, concept_onderwerp, concept_tekst, concept_op, verzonden_tekst, verzonden_op, notitie, fout",
        )
        .eq("agent_id", data.agentId)
        .order("ontvangen_op", { ascending: false })
        .limit(200),
      sb
        .from("support_instellingen")
        .select("afzender_naam, afzender_email, ondertekening")
        .eq("agent_id", data.agentId)
        .maybeSingle(),
      sb.from("agents").select("inbound_local, opties").eq("id", data.agentId).maybeSingle(),
      (context.supabase as unknown as Rpc).rpc("sales_kerncijfers", {
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
      leads: (rijen.data ?? []) as SalesLead[],
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
      leadAdres: rij?.inbound_local
        ? domein
          ? `${rij.inbound_local}@${domein}`
          : rij.inbound_local
        : null,
      kwalificatie:
        typeof opties["kwalificatie"] === "string" ? (opties["kwalificatie"] as string) : "",
      zelfAntwoorden: opties["zelf_antwoorden"] === true,
      reactietijdDoel: Number(opties["reactietijd_doel"] ?? 5),
    };
  });

export const haalSalesCijfers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({ agentId: z.string().uuid(), dagen: z.number().int().min(1).max(3650).default(30) })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<SalesCijfers | null> => {
    const { data: rijen, error } = await (context.supabase as unknown as Rpc).rpc(
      "sales_kerncijfers",
      { _agent_id: data.agentId, _dagen: data.dagen },
    );
    if (error) return null;
    return naarCijfers(((rijen ?? []) as Array<Record<string, unknown>>)[0]);
  });

export const nieuweLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        agentId: z.string().uuid(),
        naam: z.string().trim().max(120).nullable().optional(),
        bedrijf: z.string().trim().max(120).nullable().optional(),
        email: z.string().trim().toLowerCase().email(),
        telefoon: z.string().trim().max(40).nullable().optional(),
        bericht: z.string().trim().min(3).max(8000),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    await nietGepauzeerd(context as never, data.agentId);
    const { ontvangLead, verwerkLead } = await import("@/lib/sales.server");
    const id = await ontvangLead({
      agentId: data.agentId,
      providerId: `portaal:${crypto.randomUUID()}`,
      bron: "handmatig",
      naam: data.naam ?? null,
      bedrijf: data.bedrijf ?? null,
      email: data.email,
      telefoon: data.telefoon ?? null,
      bericht: data.bericht,
    });
    if (!id) throw new Error("Opslaan mislukte.");
    const uitkomst = await verwerkLead(id).catch(
      (e) => `mislukt: ${e instanceof Error ? e.message : ""}`,
    );
    return { id, uitkomst };
  });

export const verstuurAntwoordLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        agentId: z.string().uuid(),
        onderwerp: z.string().trim().min(1).max(200),
        tekst: z.string().trim().min(1).max(20_000),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    await nietGepauzeerd(context as never, data.agentId);
    const { verstuurAntwoordAanLead } = await import("@/lib/sales.server");
    await verstuurAntwoordAanLead(data.id, {
      onderwerp: data.onderwerp,
      tekst: data.tekst,
      door: (context as { userId: string }).userId,
    });
    await legVast(context as never, {
      actie: "lead.beantwoord",
      omschrijving: "Eerste antwoord aan een lead verstuurd",
      agentId: data.agentId,
    });
    return { ok: true as const };
  });

export const zetLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        agentId: z.string().uuid(),
        status: z.enum([
          "gekwalificeerd",
          "twijfel",
          "afgewezen",
          "afspraak",
          "gewonnen",
          "verloren",
        ]),
        notitie: z.string().trim().max(600).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    const velden: Record<string, unknown> = {
      status: data.status,
      bijgewerkt_op: new Date().toISOString(),
    };
    if (data.notitie !== undefined) velden["notitie"] = data.notitie;
    const { error } = await (context.supabase as unknown as Ongetypt)
      .from("sales_leads")
      .update(velden)
      .eq("id", data.id)
      .eq("agent_id", data.agentId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const beoordeelLeadOpnieuw = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ id: z.string().uuid(), agentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    await nietGepauzeerd(context as never, data.agentId);
    const { error } = await (context.supabase as unknown as Ongetypt)
      .from("sales_leads")
      .update({ status: "nieuw", fout: null })
      .eq("id", data.id)
      .eq("agent_id", data.agentId)
      .in("status", ["gekwalificeerd", "twijfel", "afgewezen", "mislukt"]);
    if (error) throw new Error(error.message);
    const { verwerkLead } = await import("@/lib/sales.server");
    const uitkomst = await verwerkLead(data.id).catch(
      (e) => `mislukt: ${e instanceof Error ? e.message : ""}`,
    );
    return { uitkomst };
  });
