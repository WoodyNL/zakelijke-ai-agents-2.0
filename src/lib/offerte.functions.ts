import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mijnAgent, nietGepauzeerd } from "@/lib/agent-toegang";
import { legVast } from "@/lib/beheerlog";
import type { Offerteregel } from "@/lib/offerte-regels";

/**
 * Het scherm Aanvragen van de offerte-agent.
 *
 * Lezen gaat met de sessie van de gebruiker (RLS: eigenaar, team, meekijker
 * alleen lezend). Alles wat verstuurt of beslist, controleert eerst eigendom
 * met mijnAgent(); dat is de grens die meekijken buiten houdt.
 */

type Rpc = {
  rpc: (
    naam: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};
// De tabel staat pas in de gegenereerde types na de migratie.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ongetypt = { from: (t: string) => any };

export type OfferteAanvraag = {
  id: string;
  agent_id: string;
  van_email: string;
  van_naam: string | null;
  bedrijf: string | null;
  onderwerp: string | null;
  vraag: string;
  ontvangen_op: string;
  status:
    | "nieuw"
    | "bezig"
    | "concept"
    | "mens_nodig"
    | "verstuurd"
    | "geaccepteerd"
    | "afgewezen"
    | "zelf"
    | "mislukt";
  regels: Offerteregel[];
  totaal: number | null;
  geldig_tot: string | null;
  concept_onderwerp: string | null;
  concept_tekst: string | null;
  ontbreekt: string[];
  toelichting: string | null;
  concept_op: string | null;
  verzonden_tekst: string | null;
  verzonden_op: string | null;
  besloten_op: string | null;
  fout: string | null;
};

export type OfferteCijfers = {
  aanvragen: number;
  concepten: number;
  mens_nodig: number;
  verstuurd: number;
  geaccepteerd: number;
  afgewezen: number;
  open: number;
  reactie_minuten: number | null;
  omzet: number;
};

const regelSchema = z.object({
  omschrijving: z.string().trim().min(1).max(200),
  aantal: z.number().positive().max(100_000),
  eenheid: z.string().max(60).nullable(),
  prijs: z.number().min(0),
  bedrag: z.number().min(0),
  bron: z.string().max(200),
  opmerking: z.string().max(200).nullable(),
});

async function mijnAanvraag(context: { supabase: unknown; userId: string }, id: string) {
  const { data, error } = await (context.supabase as Ongetypt)
    .from("offerte_aanvragen")
    .select("id, agent_id, van_email")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Deze aanvraag bestaat niet, of is niet van jou.");
  const a = data as { id: string; agent_id: string };
  await mijnAgent(context, a.agent_id);
  return a;
}

export const haalAanvragen = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as unknown as Ongetypt;
    const [rijen, afz, agent, cijfers] = await Promise.all([
      sb
        .from("offerte_aanvragen")
        .select(
          "id, agent_id, van_email, van_naam, bedrijf, onderwerp, vraag, ontvangen_op, status, regels, totaal, geldig_tot, concept_onderwerp, concept_tekst, ontbreekt, toelichting, concept_op, verzonden_tekst, verzonden_op, besloten_op, fout",
        )
        .eq("agent_id", data.agentId)
        .order("ontvangen_op", { ascending: false })
        .limit(150),
      sb
        .from("support_instellingen")
        .select("afzender_naam, afzender_email, ondertekening")
        .eq("agent_id", data.agentId)
        .maybeSingle(),
      sb
        .from("agents")
        .select("inbound_local, status, opties")
        .eq("id", data.agentId)
        .maybeSingle(),
      (context.supabase as unknown as Rpc).rpc("offerte_kerncijfers", {
        _agent_id: data.agentId,
        _dagen: 30,
      }),
    ]);
    const beschikbaar = !rijen.error;
    const domein = process.env["RESEND_INBOUND_DOMEIN"] ?? null;
    const rij = agent.data as {
      inbound_local?: string | null;
      opties?: Record<string, unknown> | null;
    } | null;
    const local = rij?.inbound_local ?? null;
    const opties = rij?.opties ?? {};
    return {
      beschikbaar,
      aanvragen: (rijen.data ?? []) as OfferteAanvraag[],
      afzender: (afz.data ?? {
        afzender_naam: null,
        afzender_email: null,
        ondertekening: null,
      }) as {
        afzender_naam: string | null;
        afzender_email: string | null;
        ondertekening: string | null;
      },
      cijfers: (((cijfers.data ?? []) as OfferteCijfers[])[0] ?? null) as OfferteCijfers | null,
      aanvraagAdres: local ? (domein ? `${local}@${domein}` : local) : null,
      modus: opties["offerte_modus"] === "direct" ? "direct" : "concept",
      maxDirect: Number(opties["offerte_max_direct"]) || null,
    };
  });

export const haalOfferteCijfers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({ agentId: z.string().uuid(), dagen: z.number().int().min(1).max(3650).default(30) })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<OfferteCijfers | null> => {
    const { data: rijen, error } = await (context.supabase as unknown as Rpc).rpc(
      "offerte_kerncijfers",
      {
        _agent_id: data.agentId,
        _dagen: data.dagen,
      },
    );
    if (error) return null;
    const r = ((rijen ?? []) as Array<Record<string, unknown>>)[0];
    if (!r) return null;
    return {
      aanvragen: Number(r["aanvragen"] ?? 0),
      concepten: Number(r["concepten"] ?? 0),
      mens_nodig: Number(r["mens_nodig"] ?? 0),
      verstuurd: Number(r["verstuurd"] ?? 0),
      geaccepteerd: Number(r["geaccepteerd"] ?? 0),
      afgewezen: Number(r["afgewezen"] ?? 0),
      open: Number(r["open"] ?? 0),
      reactie_minuten: r["reactie_minuten"] == null ? null : Number(r["reactie_minuten"]),
      omzet: Number(r["omzet"] ?? 0),
    };
  });

/** Een aanvraag met de hand invoeren: iemand belde, of mailde naar een ander adres. */
export const nieuweAanvraag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        agentId: z.string().uuid(),
        vanEmail: z.string().trim().toLowerCase().email("Geen geldig e-mailadres."),
        vanNaam: z.string().trim().max(120).nullable().optional(),
        bedrijf: z.string().trim().max(120).nullable().optional(),
        onderwerp: z.string().trim().max(200).nullable().optional(),
        vraag: z.string().trim().min(5, "Schrijf op wat er gevraagd is.").max(12_000),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    await nietGepauzeerd(context as never, data.agentId);
    const { ontvangAanvraag, verwerkAanvraag } = await import("@/lib/offerte.server");
    const id = await ontvangAanvraag({
      agentId: data.agentId,
      providerId: `portaal:${crypto.randomUUID()}`,
      vanEmail: data.vanEmail,
      vanNaam: data.vanNaam ?? null,
      bedrijf: data.bedrijf ?? null,
      onderwerp: data.onderwerp ?? null,
      vraag: data.vraag,
    });
    if (!id) throw new Error("Opslaan mislukte.");
    const uitkomst = await verwerkAanvraag(id).catch(
      (e) => `mislukt: ${e instanceof Error ? e.message : ""}`,
    );
    return { id, uitkomst };
  });

export const verstuurOfferteVanuitPortaal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        onderwerp: z.string().trim().min(1).max(200),
        tekst: z.string().trim().min(1).max(20_000),
        regels: z.array(regelSchema).min(1, "Een offerte zonder regels kan niet."),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const a = await mijnAanvraag(context as never, data.id);
    await nietGepauzeerd(context as never, a.agent_id);
    const { verstuurOfferte } = await import("@/lib/offerte.server");
    await verstuurOfferte(data.id, {
      onderwerp: data.onderwerp,
      tekst: data.tekst,
      regels: data.regels,
      door: (context as { userId: string }).userId,
    });
    await legVast(context as never, {
      actie: "offerte.verstuurd",
      omschrijving: "Offerte verstuurd",
      agentId: a.agent_id,
    });
    return { ok: true as const };
  });

export const besluitAanvraag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({ id: z.string().uuid(), besluit: z.enum(["geaccepteerd", "afgewezen", "zelf"]) })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const a = await mijnAanvraag(context as never, data.id);
    const { besluitOfferte } = await import("@/lib/offerte.server");
    await besluitOfferte(data.id, data.besluit);
    await legVast(context as never, {
      actie: `offerte.${data.besluit}`,
      omschrijving:
        data.besluit === "geaccepteerd"
          ? "Offerte als geaccepteerd gemarkeerd"
          : data.besluit === "afgewezen"
            ? "Offerte als afgewezen gemarkeerd"
            : "Aanvraag zelf afgehandeld",
      agentId: a.agent_id,
    });
    return { ok: true as const };
  });

export const stelOfferteOpnieuwOp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const a = await mijnAanvraag(context as never, data.id);
    await nietGepauzeerd(context as never, a.agent_id);
    const sb = context.supabase as unknown as Ongetypt;
    const { error } = await sb
      .from("offerte_aanvragen")
      .update({ status: "nieuw", fout: null })
      .eq("id", data.id)
      .in("status", ["concept", "mens_nodig", "mislukt", "zelf"]);
    if (error) throw new Error(error.message);
    const { verwerkAanvraag } = await import("@/lib/offerte.server");
    const uitkomst = await verwerkAanvraag(data.id).catch(
      (e) => `mislukt: ${e instanceof Error ? e.message : ""}`,
    );
    return { uitkomst };
  });

/** Afzender en ondertekening; dezelfde tabel als supportmail, per agent. */
export const bewaarOfferteAfzender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        agentId: z.string().uuid(),
        afzenderNaam: z.string().trim().max(100).nullable(),
        afzenderEmail: z.string().trim().toLowerCase().email("Geen geldig e-mailadres.").nullable(),
        ondertekening: z.string().trim().max(500).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);
    const { error } = await (context.supabase as unknown as Ongetypt)
      .from("support_instellingen")
      .upsert(
        {
          agent_id: data.agentId,
          afzender_naam: data.afzenderNaam,
          afzender_email: data.afzenderEmail,
          ondertekening: data.ondertekening,
        },
        { onConflict: "agent_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
