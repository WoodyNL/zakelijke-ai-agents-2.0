import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mijnAgent } from "@/lib/agent-toegang";
import { legVast } from "@/lib/beheerlog";

/**
 * Koppelen en ontkoppelen vanuit het portaal.
 *
 * Het koppelen zelf gebeurt bij Google of Microsoft; wij maken alleen het
 * adres klaar waar de klant naartoe gaat. Dat adres bevat een ondertekend
 * briefje met de agent en de gebruiker erin, want als de klant terugkomt is er
 * geen sessie meer om het aan te vragen.
 *
 * Eerst eigendom controleren. Dit is de zwaarste toestemming die een klant ons
 * geeft; die hoort niet achter een leesrecht te zitten.
 */

export const startKoppeling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        agentId: z.string().uuid(),
        aanbieder: z.enum(["google", "microsoft"]),
        /** De map of het label waar de supportvragen in staan. */
        map: z.string().trim().max(100).default("INBOX"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await mijnAgent(context as never, data.agentId);

    const { beschikbaar, inlogadres } = await import("@/lib/postvak/aanbieders.server");
    const { kluisBeschikbaar, maakBriefje } = await import("@/lib/postvak/kluis.server");

    if (!kluisBeschikbaar()) {
      throw new Error(
        "Koppelen staat nog niet aan op de server (de sleutel voor het bewaren van toegang ontbreekt).",
      );
    }
    if (!beschikbaar(data.aanbieder)) {
      throw new Error(
        data.aanbieder === "google"
          ? "Koppelen met Google is nog niet ingesteld op de server."
          : "Koppelen met Microsoft is nog niet ingesteld op de server.",
      );
    }

    const state = await maakBriefje({
      agentId: data.agentId,
      userId: (context as { userId: string }).userId,
      provider: data.aanbieder,
      map: data.map || "INBOX",
    });

    return { url: inlogadres(data.aanbieder, state) };
  });

export const verbreekKoppeling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const agent = await mijnAgent(context as never, data.agentId);
    const { error } = await (
      context.supabase as unknown as {
        rpc: (
          n: string,
          a: Record<string, unknown>,
        ) => Promise<{ error: { message: string } | null }>;
      }
    ).rpc("postvak_ontkoppel", { _agent_id: data.agentId });
    if (error) throw new Error(error.message);

    await legVast(context as never, {
      actie: "postvak.ontkoppeld",
      omschrijving: `Mailboxkoppeling van ${agent.name} verbroken`,
      agentId: data.agentId,
    });
    return { ok: true as const };
  });

export const haalKoppeling = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    // De tabel staat nog niet in de gegenereerde types; die komen pas na de
    // migratie. Vandaar deze smalle ingang in plaats van een losse any.
    type Leesbaar = {
      from: (t: string) => {
        select: (k: string) => {
          eq: (k: string, w: string) => { maybeSingle: () => Promise<{ data: unknown }> };
        };
      };
    };
    const { data: rij } = await (context.supabase as unknown as Leesbaar)
      .from("postvak_koppelingen")
      .select("provider, email, naam, map, status, laatste_fout, laatste_keer, gekoppeld_op")
      .eq("agent_id", data.agentId)
      .maybeSingle();

    // Of koppelen überhaupt aangeboden kan worden, bepaalt de server: zonder
    // sleutels bij Google of Microsoft heeft een knop geen zin.
    const { beschikbaar } = await import("@/lib/postvak/aanbieders.server");
    const { kluisBeschikbaar } = await import("@/lib/postvak/kluis.server");
    const kluis = kluisBeschikbaar();

    return {
      koppeling: (rij ?? null) as {
        provider: "google" | "microsoft";
        email: string;
        naam: string | null;
        map: string;
        status: "actief" | "verlopen" | "fout";
        laatste_fout: string | null;
        laatste_keer: string | null;
        gekoppeld_op: string;
      } | null,
      kanKoppelen: {
        google: kluis && beschikbaar("google"),
        microsoft: kluis && beschikbaar("microsoft"),
      },
    };
  });
