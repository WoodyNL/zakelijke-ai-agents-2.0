import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Teamleden per klant (fase 5 van het beheerplan).
 *
 * Een teamlid is een eigen login die naar het account van de klant wijst. Wat
 * hij mag zien, regelt de database via mijn_klant(); hier gebeurt alleen het
 * uitnodigen en verwijderen, en dat mag alleen de eigenaar.
 */

type Rpc = {
  rpc: (naam: string) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export type Teamlid = {
  user_id: string;
  naam: string;
  email: string;
  eigenaar: boolean;
  sinds: string;
};

/** Waar een nieuw account zijn wachtwoord kiest. Die pagina bestaat al. */
const WACHTWOORD_PAGINA = "https://zakelijkeaiagents.nl/reset-password";

export const haalTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase as unknown as Rpc;
    const [team, eigenaar] = await Promise.all([db.rpc("mijn_team"), db.rpc("ben_eigenaar")]);
    // Zonder migratie bestaan de functies niet; dan is er ook geen team.
    return {
      leden: team.error ? [] : ((team.data ?? []) as Teamlid[]),
      isEigenaar: eigenaar.error ? false : eigenaar.data === true,
      beschikbaar: !team.error,
    };
  });

async function alleenEigenaar(context: { supabase: unknown; userId: string }) {
  const { data, error } = await (context.supabase as Rpc).rpc("ben_eigenaar");
  if (error || data !== true) {
    throw new Error("Alleen de eigenaar van het account kan het team beheren.");
  }
}

/**
 * Nodigt een collega uit. Het account wordt aangemaakt via een uitnodigingslink
 * die we zelf mailen, in het Nederlands en met de naam van wie uitnodigt. De
 * link leidt naar de pagina waar je een wachtwoord kiest.
 */
export const nodigTeamlidUit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        naam: z.string().trim().min(1, "Vul een naam in.").max(100),
        email: z.string().trim().toLowerCase().email("Vul een geldig e-mailadres in."),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await alleenEigenaar(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: data.email,
      options: { data: { name: data.naam }, redirectTo: WACHTWOORD_PAGINA },
    });
    if (error || !link.user) {
      throw new Error(
        /already|exists|registered/i.test(error?.message ?? "")
          ? "Dit e-mailadres heeft al een account. Een account hoort bij één bedrijf."
          : (error?.message ?? "Uitnodigen lukte niet"),
      );
    }

    const nieuwId = link.user.id;
    const { error: koppelFout } = await (supabaseAdmin as unknown as Koppel)
      .from("klantleden")
      .insert({ user_id: nieuwId, client_id: context.userId, toegevoegd_door: context.userId });
    if (koppelFout) {
      // Een account zonder bedrijf hoort nergens bij; ruim het op.
      await supabaseAdmin.auth.admin.deleteUser(nieuwId);
      throw new Error(koppelFout.message);
    }

    const { data: ik } = await context.supabase
      .from("profiles")
      .select("name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const uitnodiger = ik?.name || ik?.email || "Je collega";

    const { esc, opmaak, stuurMail } = await import("@/lib/mail.server");
    await stuurMail({
      aan: [data.email],
      onderwerp: `${uitnodiger} nodigt je uit voor het klantportaal`,
      html: opmaak(
        [
          `Hoi ${esc(data.naam)},`,
          `${esc(uitnodiger)} heeft je toegevoegd aan het klantportaal van Zakelijke AI Agents. Daar zie je wat de AI-agents van jullie bedrijf doen en opleveren.`,
          "Kies via de knop een wachtwoord. De link werkt één keer.",
        ],
        { tekst: "Wachtwoord kiezen", url: link.properties.action_link },
      ),
    });

    return { ok: true as const };
  });

/** Haalt een collega uit het team. Zijn account verdwijnt daarmee. */
export const verwijderTeamlid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await alleenEigenaar(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Alleen iemand uit je eigen team. De service-role ziet alles, dus de
    // controle staat hier expliciet.
    const { data: lid } = await (supabaseAdmin as unknown as Koppel)
      .from("klantleden")
      .select("user_id")
      .eq("user_id", data.userId)
      .eq("client_id", context.userId)
      .maybeSingle();
    if (!lid) throw new Error("Deze persoon hoort niet bij jouw team.");

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** klantleden staat nog niet in de gegenereerde types. */
type Koppel = {
  from: (t: string) => {
    insert: (rij: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    select: (k: string) => {
      eq: (
        a: string,
        b: string,
      ) => {
        eq: (
          a: string,
          b: string,
        ) => { maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }> };
      };
    };
  };
};
