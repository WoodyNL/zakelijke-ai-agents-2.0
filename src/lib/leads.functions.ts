import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { eigenKlant } from "@/lib/klant";

const leadSchema = z.object({
  name: z.string().trim().min(1, "Vul je naam in").max(100),
  company: z.string().trim().min(1, "Vul je bedrijf in").max(150),
  email: z.string().trim().email("Vul een geldig e-mailadres in").max(255),
  phone: z.string().trim().max(40).optional().default(""),
  stage: z.string().trim().max(120).optional().default(""),
  message: z.string().trim().max(2000).optional().default(""),
});

export type LeadInput = z.input<typeof leadSchema>;

export const submitLeadRequest = createServerFn({ method: "POST" })
  .validator((input: LeadInput) => leadSchema.parse(input))
  .handler(async ({ data }) => {
    // Twee onafhankelijke kanalen: de database (voor het beheerpaneel) en de
    // e-mailmelding. Eén aanvraag mag niet verloren gaan omdat één van beide
    // niet geconfigureerd is, dus we proberen ze allebei en falen pas als
    // geen van beide de aanvraag heeft vastgelegd.
    const { storeLead, notifyByEmail } = await import("./leads.server");

    const [stored, mailed] = await Promise.all([
      storeLead(data).then(
        () => true,
        (err: unknown) => {
          console.error("lead_requests insert mislukt:", err);
          return false;
        },
      ),
      notifyByEmail(data).then(
        () => true,
        (err: unknown) => {
          console.error("lead notificatie mislukt:", err);
          return false;
        },
      ),
    ]);

    if (!stored && !mailed) {
      throw new Error(
        "Aanvraag kon niet worden vastgelegd: zowel de database als de e-mailmelding faalden. Controleer SUPABASE_SERVICE_ROLE_KEY en RESEND_API_KEY.",
      );
    }

    return { ok: true as const, stored, mailed };
  });

export const listLeadRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Onze eigen aanvragen: via het contactformulier (zonder agent) en via
    // onze eigen agents. Expliciet gefilterd, want tijdens meekijken laat de
    // database ook de chatleads van die klant zien, en die horen hier niet.
    const { data: eigen } = await context.supabase
      .from("agents")
      .select("id")
      .eq("client_id", await eigenKlant(context));
    const ids = ((eigen ?? []) as Array<{ id: string }>).map((a) => a.id);
    const { data, error } = await context.supabase
      .from("lead_requests")
      .select("*")
      .or(ids.length ? `agent_id.is.null,agent_id.in.(${ids.join(",")})` : "agent_id.is.null")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      name: string;
      company: string;
      email: string;
      phone: string | null;
      stage: string;
      message: string | null;
      created_at: string;
    }>;
  });

/**
 * Een aanvraag verwijderen, om het overzicht bij te houden. Wie wat mag
 * verwijderen staat in de database: de beheerder de aanvragen van het
 * contactformulier, de eigenaar van een agent de aanvragen van die agent.
 * Meekijken kan niets verwijderen.
 */
export const verwijderAanvraag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: weg, error } = await context.supabase
      .from("lead_requests")
      .delete()
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    // RLS geeft geen fout bij een rij die je niet mag verwijderen; hij wordt
    // dan gewoon niet geraakt. Zeg dat, in plaats van te doen alsof het lukte.
    if (!weg || weg.length === 0) {
      throw new Error("Deze aanvraag kon niet worden verwijderd.");
    }
    return { ok: true as const };
  });
