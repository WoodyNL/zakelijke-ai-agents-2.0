/**
 * Hoort deze agent bij de ingelogde gebruiker?
 *
 * De vraag wordt met de sleutel van de gebruiker zelf gesteld, niet met die van
 * de server. RLS laat hem alleen zijn eigen agents zien, dus een agent die niet
 * van hem is bestaat voor deze query simpelweg niet. Dat is sterker dan een
 * vergelijking die je hier zou opschrijven: er valt geen controle te vergeten
 * die niet bestaat.
 *
 * Het staat apart omdat het op meer dan één plek nodig is. Een
 * toegangscontrole die je kopieert, is een toegangscontrole die op één van die
 * plekken verandert en op de andere niet.
 */
export async function mijnAgent(
  context: { supabase: unknown },
  agentId: string,
): Promise<{ id: string; name: string }> {
  const sb = context.supabase as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (k: string, w: string) => {
          maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
        };
      };
    };
  };
  const { data, error } = await sb.from("agents").select("id, name").eq("id", agentId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Deze agent bestaat niet, of is niet van jou.");
  return data as { id: string; name: string };
}
