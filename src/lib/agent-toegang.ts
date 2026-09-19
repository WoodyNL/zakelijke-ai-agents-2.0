import { eigenKlant } from "@/lib/klant";

/**
 * Hoort deze agent bij de ingelogde gebruiker?
 *
 * De vraag wordt met de sleutel van de gebruiker zelf gesteld, niet met die van
 * de server, zodat RLS meekijkt. Maar RLS alleen is niet genoeg: een beheerder
 * ziet via RLS álle agents, want die heeft hij nodig in /admin. Zonder het
 * filter op client_id kon een beheerder hier dus bij de agent van elke klant.
 * Het klantportaal is voor ieder zijn eigen portaal, ook voor een beheerder.
 *
 * Bewust eigenKlant en niet leesKlant: wie dit aanroept, gaat daarna iets
 * doen. Meekijken is alleen lezen.
 *
 * Het staat apart omdat het op meer dan één plek nodig is. Een
 * toegangscontrole die je kopieert, is een toegangscontrole die op één van die
 * plekken verandert en op de andere niet.
 */
export async function mijnAgent(
  context: { supabase: unknown; userId: string },
  agentId: string,
): Promise<{ id: string; name: string }> {
  const sb = context.supabase as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          k: string,
          w: string,
        ) => {
          eq: (
            k: string,
            w: string,
          ) => {
            maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
          };
        };
      };
    };
  };
  const { data, error } = await sb
    .from("agents")
    .select("id, name")
    .eq("id", agentId)
    .eq("client_id", await eigenKlant(context))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Deze agent bestaat niet, of is niet van jou.");
  return data as { id: string; name: string };
}

/**
 * Hoort deze campagne bij een agent van de ingelogde gebruiker?
 *
 * Nodig vóór alles wat met de service-role doorgaat: berichten klaarzetten en
 * versturen. "Kan ik deze campagne lezen" is daarvoor niet genoeg, want een
 * meekijkende beheerder kan hem lezen. Hij mag hem niet versturen.
 */
export async function mijnCampagne(
  context: { supabase: unknown; userId: string },
  campagneId: string,
): Promise<{ id: string; agent_id: string }> {
  const sb = context.supabase as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          k: string,
          w: string,
        ) => {
          maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
        };
      };
    };
  };
  const { data, error } = await sb
    .from("outbound_campaigns")
    .select("id, agent_id")
    .eq("id", campagneId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Deze campagne bestaat niet, of is niet van jou.");
  const campagne = data as { id: string; agent_id: string };
  await mijnAgent(context, campagne.agent_id);
  await nietGepauzeerd(context, campagne.agent_id);
  return campagne;
}

/**
 * Staat deze agent op pauze, dan gaat er niets de deur uit. De klant drukte op
 * pauze; een knop verderop in het portaal hoort dat niet ongedaan te maken.
 *
 * Alleen 'paused' houdt tegen. Een agent in opbouw mag nog wel versturen: zo
 * test je hem voordat hij live gaat.
 */
export async function nietGepauzeerd(context: { supabase: unknown }, agentId: string) {
  const sb = context.supabase as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          k: string,
          w: string,
        ) => {
          maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
        };
      };
    };
  };
  const { data } = await sb.from("agents").select("status").eq("id", agentId).maybeSingle();
  if ((data as { status?: string } | null)?.status === "paused") {
    throw new Error("Deze agent staat op pauze. Zet hem eerst weer aan op zijn agentpagina.");
  }
}
