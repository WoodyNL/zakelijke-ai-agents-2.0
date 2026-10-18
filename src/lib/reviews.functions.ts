import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mijnAgent, nietGepauzeerd } from "@/lib/agent-toegang";

/**
 * Het scherm Reviews: klussen klaarzetten voor een verzoek, reviews plakken,
 * een antwoord laten opstellen en als geplaatst markeren.
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

export type ReviewVerzoek = {
  id: string;
  email: string;
  naam: string | null;
  klaar_op: string;
  klacht: boolean;
  status: "gepland" | "verstuurd" | "overgeslagen" | "mislukt";
  verstuurd_op: string | null;
};
export type Review = {
  id: string;
  bron: string;
  sterren: number;
  naam: string | null;
  tekst: string;
  geplaatst_op: string;
  concept_antwoord: string | null;
  concept_op: string | null;
  antwoord: string | null;
  beantwoord_op: string | null;
};
export type ReviewCijfers = {
  verzoeken: number;
  reviews: number;
  gemiddelde: number | null;
  onbeantwoord: number;
  reviews_per_verzoek: number | null;
};

function naarCijfers(r: Record<string, unknown> | undefined): ReviewCijfers | null {
  if (!r) return null;
  return {
    verzoeken: Number(r["verzoeken"] ?? 0),
    reviews: Number(r["reviews"] ?? 0),
    gemiddelde: r["gemiddelde"] == null ? null : Number(r["gemiddelde"]),
    onbeantwoord: Number(r["onbeantwoord"] ?? 0),
    reviews_per_verzoek: r["reviews_per_verzoek"] == null ? null : Number(r["reviews_per_verzoek"]),
  };
}

export const haalReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as unknown as Ongetypt;
    const [verzoeken, reviews, afz, agent, cijfers] = await Promise.all([
      sb
        .from("review_verzoeken")
        .select("id, email, naam, klaar_op, klacht, status, verstuurd_op")
        .eq("agent_id", data.agentId)
        .order("klaar_op", { ascending: false })
        .limit(300),
      sb
        .from("reviews")
        .select(
          "id, bron, sterren, naam, tekst, geplaatst_op, concept_antwoord, concept_op, antwoord, beantwoord_op",
        )
        .eq("agent_id", data.agentId)
        .order("geplaatst_op", { ascending: false })
        .limit(200),
      sb
        .from("support_instellingen")
        .select("afzender_naam, afzender_email, ondertekening")
        .eq("agent_id", data.agentId)
        .maybeSingle(),
      sb.from("agents").select("opties").eq("id", data.agentId).maybeSingle(),
      (context.supabase as unknown as Rpc).rpc("review_kerncijfers", {
        _agent_id: data.agentId,
        _dagen: 90,
      }),
    ]);
    const opties = ((agent.data as { opties?: Record<string, unknown> } | null)?.opties ??
      {}) as Record<string, unknown>;
    return {
      beschikbaar: !reviews.error,
      verzoeken: (verzoeken.data ?? []) as ReviewVerzoek[],
      reviews: (reviews.data ?? []) as Review[],
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
      link: typeof opties["review_link"] === "string" ? (opties["review_link"] as string) : "",
      vragenNa: Number(opties["review_vragen_na"] ?? 1),
    };
  });

export const haalReviewCijfers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({ agentId: z.string().uuid(), dagen: z.number().int().min(1).max(3650).default(90) })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<ReviewCijfers | null> => {
    const { data: rijen, error } = await (context.supabase as unknown as Rpc).rpc(
      "review_kerncijfers",
      { _agent_id: data.agentId, _dagen: data.dagen },
    );
    if (error) return null;
    return naarCijfers(((rijen ?? []) as Array<Record<string, unknown>>)[0]);
  });

const klusSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  naam: z.string().trim().max(120).nullable().optional(),
  klaar_op: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  klacht: z.boolean().optional(),
});

/** Klussen klaarzetten: één of een lijst. Dubbele (adres + datum) worden overgeslagen. */
export const zetKlussenKlaar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({ agentId: z.string().uuid(), klussen: z.array(klusSchema).min(1).max(1000) })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    await nietGepauzeerd(context as never, data.agentId);
    const sb = context.supabase as unknown as Ongetypt;
    const rijen = data.klussen.map((k) => ({
      agent_id: data.agentId,
      email: k.email,
      naam: k.naam ?? null,
      klaar_op: k.klaar_op,
      klacht: k.klacht ?? false,
    }));
    const { error } = await sb
      .from("review_verzoeken")
      .upsert(rijen, { onConflict: "agent_id,email,klaar_op", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { aantal: rijen.length };
  });

export const markeerKlacht = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ id: z.string().uuid(), agentId: z.string().uuid(), klacht: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    const { error } = await (context.supabase as unknown as Ongetypt)
      .from("review_verzoeken")
      .update({ klacht: data.klacht })
      .eq("id", data.id)
      .eq("agent_id", data.agentId)
      .eq("status", "gepland");
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Een review plakken; het antwoord wordt meteen opgesteld. */
export const voegReviewToe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        agentId: z.string().uuid(),
        sterren: z.number().int().min(1).max(5),
        naam: z.string().trim().max(120).nullable().optional(),
        tekst: z.string().trim().max(5000),
        geplaatst_op: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    await nietGepauzeerd(context as never, data.agentId);
    const sb = context.supabase as unknown as Ongetypt;
    const { data: rij, error } = await sb
      .from("reviews")
      .insert({
        agent_id: data.agentId,
        sterren: data.sterren,
        naam: data.naam ?? null,
        tekst: data.tekst,
        geplaatst_op: data.geplaatst_op ?? new Date().toISOString().slice(0, 10),
        bron: "handmatig",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const id = (rij as { id: string }).id;
    let concept: string | null = null;
    try {
      const { stelReviewAntwoordOp } = await import("@/lib/reviews.server");
      concept = await stelReviewAntwoordOp(data.agentId, {
        sterren: data.sterren,
        naam: data.naam ?? null,
        tekst: data.tekst,
      });
      await sb
        .from("reviews")
        .update({ concept_antwoord: concept, concept_op: new Date().toISOString() })
        .eq("id", id);
    } catch (e) {
      console.warn("review: antwoord opstellen mislukt", e);
    }
    return { id, concept };
  });

export const stelReviewAntwoordOpnieuwOp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ id: z.string().uuid(), agentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    const sb = context.supabase as unknown as Ongetypt;
    const { data: r, error } = await sb
      .from("reviews")
      .select("sterren, naam, tekst")
      .eq("id", data.id)
      .eq("agent_id", data.agentId)
      .maybeSingle();
    if (error || !r) throw new Error(error?.message ?? "Review niet gevonden.");
    const { stelReviewAntwoordOp } = await import("@/lib/reviews.server");
    const concept = await stelReviewAntwoordOp(
      data.agentId,
      r as { sterren: number; naam: string | null; tekst: string },
    );
    await sb
      .from("reviews")
      .update({ concept_antwoord: concept, concept_op: new Date().toISOString() })
      .eq("id", data.id);
    return { concept };
  });

/** De klant plaatste het antwoord (bij Google) — vastleggen wat er stond. */
export const markeerBeantwoord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        agentId: z.string().uuid(),
        antwoord: z.string().trim().min(1).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    const { error } = await (context.supabase as unknown as Ongetypt)
      .from("reviews")
      .update({ antwoord: data.antwoord, beantwoord_op: new Date().toISOString() })
      .eq("id", data.id)
      .eq("agent_id", data.agentId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const verwijderReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        agentId: z.string().uuid(),
        tabel: z.enum(["reviews", "review_verzoeken"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    const { error } = await (context.supabase as unknown as Ongetypt)
      .from(data.tabel)
      .delete()
      .eq("id", data.id)
      .eq("agent_id", data.agentId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
