/**
 * Hoort deze agent bij de ingelogde gebruiker?
 *
 * De vraag wordt met de sleutel van de gebruiker zelf gesteld, niet met die van
 * de server, zodat RLS meekijkt. Maar RLS alleen is niet genoeg: een beheerder
 * ziet via RLS álle agents, want die heeft hij nodig in /admin. Zonder het
 * filter op client_id kon een beheerder hier dus bij de agent van elke klant.
 * Het klantportaal is voor ieder zijn eigen portaal, ook voor een beheerder.
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
    .eq("client_id", context.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Deze agent bestaat niet, of is niet van jou.");
  return data as { id: string; name: string };
}
