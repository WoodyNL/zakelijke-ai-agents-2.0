import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { legVast } from "@/lib/beheerlog";
import { controleerTweedeStap } from "@/lib/tweestaps-eis";

/**
 * Wie het beheer in mag.
 *
 * Tot nu toe stond dat vast in de database: één e-mailadres in de trigger die
 * bij elk nieuw account draait. Dat werkte zolang het bedrijf uit één persoon
 * bestond, en het was tegelijk een enkelvoudig faalpunt — raakte dat account
 * kwijt, dan kon niemand er meer bij.
 *
 * Hier wordt het toekennen een handeling, met de drie dingen die daarbij
 * horen: alleen een beheerder mag het, het komt in het beheerlog, en de
 * laatste beheerder kan er niet uit. Dat laatste wordt ook door de database
 * bewaakt; de controle hieronder geeft alleen een leesbaardere melding.
 */

type Rpc = {
  rpc: (naam: string) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type Ctx = { supabase: unknown; userId: string };

/** Waar een nieuw account zijn wachtwoord kiest. */
const WACHTWOORD_PAGINA = "https://zakelijkeaiagents.nl/reset-password";

export type Beheerder = {
  userId: string;
  naam: string;
  email: string;
  jijZelf: boolean;
  tweestaps: boolean;
};

/**
 * Alleen een beheerder die zijn tweede stap op orde heeft.
 *
 * Dezelfde eis als in het overige beheer, en met dezelfde functie bepaald.
 * Rechten uitdelen vanaf een sessie met alleen een wachtwoord is precies wat
 * die eis moet voorkomen.
 */
async function alleenBeheerder(context: Ctx) {
  const db = context.supabase as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          k: string,
          v: string,
        ) => {
          eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> };
        };
      };
    };
  };
  const { data } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Geen beheerdersrechten");

  const stap = await (context.supabase as Rpc).rpc("mijn_tweestaps");
  controleerTweedeStap(true, stap);
}

export const haalBeheerders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await alleenBeheerder(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rollen, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (error) throw new Error(error.message);

    const ids = (rollen ?? []).map((r: { user_id: string }) => r.user_id);
    if (ids.length === 0) return [] as Beheerder[];

    const { data: profielen } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email")
      .in("id", ids);

    /*
     * Of iemand een tweede stap heeft, staat in auth.users en niet in een
     * tabel die we kunnen bevragen. Via de beheerder-API kan het per
     * gebruiker. Het zijn er een handvol, dus dat mag.
     *
     * Dit staat er niet uit nieuwsgierigheid: sinds de tweede stap verplicht
     * is voor beheerders, is "uitgenodigd maar nog niets ingesteld" een
     * toestand waarin iemand niets kan. Dat hoort zichtbaar te zijn, anders
     * zit die persoon te wachten op iets wat hij zelf moet doen.
     */
    const stand = new Map<string, boolean>();
    for (const id of ids) {
      try {
        const { data } = await supabaseAdmin.auth.admin.getUserById(id);
        const factoren = (data?.user?.factors ?? []) as Array<{ status?: string }>;
        stand.set(
          id,
          factoren.some((f) => f.status === "verified"),
        );
      } catch {
        stand.set(id, false);
      }
    }

    return (profielen ?? []).map((p: { id: string; name: string | null; email: string | null }) => ({
      userId: p.id,
      naam: p.name ?? "",
      email: p.email ?? "",
      jijZelf: p.id === (context as Ctx).userId,
      tweestaps: stand.get(p.id) === true,
    })) as Beheerder[];
  });

/**
 * Iemand beheerder maken.
 *
 * Twee wegen, en de afzender merkt het verschil niet. Bestaat er al een
 * account met dit adres, dan krijgt dat de rol erbij — dat is het gewone
 * geval, want iemand die meewerkt heeft meestal al een login. Bestaat het
 * niet, dan wordt er een uitnodiging gemaakt en gemaild.
 *
 * In beide gevallen staat er in de mail dat een authenticator-app nodig is.
 * Zonder die stap komt hij het beheer niet in, en dat is geen verrassing die
 * je pas bij de voordeur wilt horen.
 */
export const maakBeheerder = createServerFn({ method: "POST" })
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
    await alleenBeheerder(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { esc, opmaak, stuurMail } = await import("@/lib/mail.server");

    const { data: bestaand } = await supabaseAdmin
      .from("profiles")
      .select("id, name")
      .eq("email", data.email)
      .maybeSingle();

    let userId: string;
    let nieuw = false;
    let link: string | null = null;

    if (bestaand) {
      userId = (bestaand as { id: string }).id;
    } else {
      const { data: uitnodiging, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email: data.email,
        options: { data: { name: data.naam }, redirectTo: WACHTWOORD_PAGINA },
      });
      if (error || !uitnodiging.user) {
        throw new Error(error?.message ?? "Uitnodigen lukte niet");
      }
      userId = uitnodiging.user.id;
      link = uitnodiging.properties.action_link;
      nieuw = true;
    }

    const { error: rolFout } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    // Stond de rol er al, dan is er niets aan de hand en niets te doen.
    if (rolFout && !/duplicate|unique/i.test(rolFout.message)) {
      if (nieuw) await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(rolFout.message);
    }

    const { data: ik } = await supabaseAdmin
      .from("profiles")
      .select("name, email")
      .eq("id", (context as Ctx).userId)
      .maybeSingle();
    const door = ik?.name || ik?.email || "Een beheerder";

    await stuurMail({
      aan: [data.email],
      onderwerp: nieuw
        ? `${door} nodigt je uit als beheerder`
        : `Je bent nu beheerder van Zakelijke AI Agents`,
      html: opmaak(
        [
          `Hoi ${esc(data.naam)},`,
          nieuw
            ? `${esc(door)} heeft een beheerdersaccount voor je aangemaakt bij Zakelijke AI Agents. Kies via de knop een wachtwoord; die link werkt één keer.`
            : `${esc(door)} heeft je account beheerdersrechten gegeven. Je kunt meteen inloggen.`,
          "Let op: voor beheerders is tweestapsverificatie verplicht. Zet die aan bij Account met een authenticator-app. Zonder die stap kun je het beheer niet in.",
        ],
        link ? { tekst: "Wachtwoord kiezen", url: link } : undefined,
      ),
    });

    await legVast(context, {
      actie: "beheerder.toegekend",
      omschrijving: `${data.naam} is beheerder geworden`,
      details: { email: data.email, nieuwAccount: nieuw },
    });

    return { ok: true as const, nieuw };
  });

/**
 * Beheerrechten intrekken.
 *
 * Het account blijft bestaan en wordt weer klant; alleen de rol gaat eraf.
 * Iemand uit het beheer halen is iets anders dan iemand wissen, en die twee
 * door elkaar halen is hoe mensen per ongeluk gegevens kwijtraken.
 */
export const trekBeheerIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await alleenBeheerder(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rollen } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const aantal = (rollen ?? []).length;
    if (aantal <= 1) {
      throw new Error("Dit is de laatste beheerder. Maak eerst iemand anders beheerder.");
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "admin");
    if (error) throw new Error(error.message);

    // Zonder rol hoort hij nergens bij; terug naar klant. Staat die er al,
    // dan geeft de database een botsing en is er niets te doen.
    const { error: klantFout } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: "client" });
    if (klantFout && !/duplicate|unique/i.test(klantFout.message)) {
      console.warn("Klantrol terugzetten mislukt:", klantFout.message);
    }

    await legVast(context, {
      actie: "beheerder.ingetrokken",
      omschrijving: "Beheerdersrechten ingetrokken",
      details: { userId: data.userId },
    });

    return { ok: true as const };
  });
