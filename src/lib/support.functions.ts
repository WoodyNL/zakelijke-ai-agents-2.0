import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mijnAgent, nietGepauzeerd } from "@/lib/agent-toegang";

/**
 * Het supportscherm van de inbox-assistent.
 *
 * Lezen gaat met de sessie van de gebruiker, dus RLS bepaalt wat hij ziet: de
 * eigenaar alles van zijn agent, een meekijker alleen lezend. Alles wat iets
 * verstuurt of wijzigt, controleert eerst eigendom met mijnAgent(). Dat is de
 * grens die meekijken buiten houdt; lezen is niet genoeg.
 */

type Rpc = {
  rpc: (
    naam: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

/** Tabellen van de supportmail staan nog niet in de gegenereerde types. */
type Ongetypt = {
  from: (t: string) => any;
};

export type SupportMail = {
  id: string;
  van_email: string;
  van_naam: string | null;
  onderwerp: string | null;
  vraag: string;
  ontvangen_op: string;
  status: "nieuw" | "bezig" | "concept" | "mens_nodig" | "verzonden" | "zelf" | "mislukt";
  concept_onderwerp: string | null;
  concept_tekst: string | null;
  bronnen: string[];
  zekerheid: "hoog" | "laag" | null;
  toelichting: string | null;
  verzonden_tekst: string | null;
  verzonden_op: string | null;
  verzonden_door: string | null;
  fout: string | null;
};

export type SupportInstellingen = {
  kanaal: "doorsturen" | "gmail" | "outlook";
  modus: "concept" | "direct";
  afzender_naam: string | null;
  afzender_email: string | null;
  ondertekening: string | null;
};

export type SupportCijfers = {
  binnen: number;
  automatisch: number;
  via_concept: number;
  ongewijzigd: number;
  mens_nodig: number;
  open: number;
  reactie_minuten: number | null;
};

const STANDAARD: SupportInstellingen = {
  kanaal: "doorsturen",
  modus: "concept",
  afzender_naam: null,
  afzender_email: null,
  ondertekening: null,
};

export const haalSupport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as unknown as Ongetypt;
    const [mails, inst, agent, cijfers] = await Promise.all([
      sb
        .from("support_mails")
        .select(
          "id, van_email, van_naam, onderwerp, vraag, ontvangen_op, status, concept_onderwerp, concept_tekst, bronnen, zekerheid, toelichting, verzonden_tekst, verzonden_op, verzonden_door, fout",
        )
        .eq("agent_id", data.agentId)
        .order("ontvangen_op", { ascending: false })
        .limit(150),
      sb.from("support_instellingen").select("*").eq("agent_id", data.agentId).maybeSingle(),
      context.supabase
        .from("agents")
        .select("inbound_local, status")
        .eq("id", data.agentId)
        .maybeSingle(),
      (context.supabase as unknown as Rpc).rpc("support_kerncijfers", {
        _agent_id: data.agentId,
        _dagen: 30,
      }),
    ]);

    // Staat de migratie er nog niet, dan is er ook nog niets om te tonen.
    const beschikbaar = !mails.error;
    const domein = process.env["RESEND_INBOUND_DOMEIN"] ?? null;
    const local = (agent.data as { inbound_local?: string | null } | null)?.inbound_local ?? null;

    return {
      beschikbaar,
      mails: (mails.data ?? []) as SupportMail[],
      instellingen: { ...STANDAARD, ...((inst.data ?? {}) as Partial<SupportInstellingen>) },
      cijfers: (((cijfers.data ?? []) as SupportCijfers[])[0] ?? null) as SupportCijfers | null,
      // Waar de klant zijn supportadres naartoe doorstuurt.
      doorstuurAdres: local ? (domein ? `${local}@${domein}` : local) : null,
      doorstuurDomeinBekend: !!domein,
    };
  });

export const bewaarSupportInstellingen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        agentId: z.string().uuid(),
        kanaal: z.enum(["doorsturen", "gmail", "outlook"]),
        modus: z.enum(["concept", "direct"]),
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
      .upsert({
        agent_id: data.agentId,
        kanaal: data.kanaal,
        modus: data.modus,
        afzender_naam: data.afzenderNaam || null,
        afzender_email: data.afzenderEmail || null,
        ondertekening: data.ondertekening || null,
        bijgewerkt_op: new Date().toISOString(),
      });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** De mail erbij zoeken en vaststellen dat hij van een agent van deze gebruiker is. */
async function mijnMail(context: { supabase: unknown; userId: string }, id: string) {
  const { data, error } = await (context.supabase as Ongetypt)
    .from("support_mails")
    .select("id, agent_id, vraag, onderwerp")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Deze mail bestaat niet, of is niet van jou.");
  const mail = data as { id: string; agent_id: string; vraag: string; onderwerp: string | null };
  await mijnAgent(context, mail.agent_id);
  return mail;
}

/**
 * Versturen, eventueel na aanpassen. Kan ook de vraag en het antwoord meteen in
 * de kennisbank zetten, zodat de agent de volgende keer zelf weet wat hij
 * moet zeggen. Dat is hoe de kennisbank groeit: uit de vragen die echt komen.
 */
export const verstuurSupport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        onderwerp: z.string().trim().min(1).max(200),
        tekst: z.string().trim().min(1).max(20_000),
        kennis: z
          .object({
            titel: z.string().trim().min(3).max(200),
            antwoord: z.string().trim().min(3).max(5_000),
          })
          .nullable()
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const mail = await mijnMail(context as never, data.id);
    await nietGepauzeerd(context as never, mail.agent_id);

    const { verstuurSupportAntwoord } = await import("@/lib/support.server");
    await verstuurSupportAntwoord(data.id, {
      onderwerp: data.onderwerp,
      tekst: data.tekst,
      door: context.userId,
    });

    if (data.kennis) {
      await voegKennisToe(context, mail, data.kennis, true);
    }
    return { ok: true as const };
  });

async function voegKennisToe(
  context: { supabase: unknown },
  mail: { agent_id: string; vraag: string },
  kennis: { titel: string; antwoord: string },
  naVersturen = false,
) {
  const { error } = await (context.supabase as Ongetypt).from("knowledge_items").insert({
    agent_id: mail.agent_id,
    category: "veelgestelde vragen",
    title: kennis.titel,
    question: mail.vraag.slice(0, 500),
    content: kennis.antwoord,
    is_active: true,
  });
  if (error) {
    throw new Error(
      naVersturen
        ? `Verstuurd, maar toevoegen aan de kennisbank lukte niet: ${error.message}`
        : `Toevoegen aan de kennisbank lukte niet: ${error.message}`,
    );
  }
}

/** Alleen de vraag en het antwoord in de kennisbank zetten, zonder te versturen. */
export const bewaarAlsKennis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        titel: z.string().trim().min(3).max(200),
        antwoord: z.string().trim().min(3).max(5_000),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const mail = await mijnMail(context as never, data.id);
    await voegKennisToe(context, mail, { titel: data.titel, antwoord: data.antwoord });
    return { ok: true as const };
  });

/** De klant handelt het zelf af, buiten het portaal om. */
export const handelZelfAf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await mijnMail(context as never, data.id);
    const { data: rij, error } = await (context.supabase as unknown as Ongetypt)
      .from("support_mails")
      .update({ status: "zelf", bijgewerkt_op: new Date().toISOString() })
      .eq("id", data.id)
      .neq("status", "verzonden")
      .select("id");
    if (error) throw new Error(error.message);
    if (!rij || rij.length === 0) throw new Error("Deze mail is al beantwoord.");
    return { ok: true as const };
  });

/** Opnieuw laten opstellen, bijvoorbeeld na het aanvullen van de kennisbank. */
export const stelOpnieuwOp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const mail = await mijnMail(context as never, data.id);
    await nietGepauzeerd(context as never, mail.agent_id);
    const { error } = await (context.supabase as unknown as Ongetypt)
      .from("support_mails")
      .update({ status: "nieuw", bijgewerkt_op: new Date().toISOString() })
      .eq("id", data.id)
      .in("status", ["concept", "mens_nodig", "mislukt", "nieuw", "zelf"]);
    if (error) throw new Error(error.message);
    const { verwerkSupportMail } = await import("@/lib/support.server");
    return { uitkomst: await verwerkSupportMail(data.id) };
  });
