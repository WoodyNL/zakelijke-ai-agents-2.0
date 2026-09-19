import { supabase } from "@/lib/supabase-browser";

/**
 * Waar iemand na het inloggen uitkomt.
 *
 * Een beheerder komt op /admin, waar hij ziet welke agents er draaien. Het
 * klantportaal op /dashboard toont alleen de eigen agents, ook voor een
 * beheerder. Daar landen was voor hem dus een leeg portaal.
 *
 * user_roles is leesbaar voor de eigen rij, dus dit kan vanuit de browser. Het
 * is alleen een doorverwijzing: /admin controleert zelf of je beheerder bent.
 */
export async function startpagina(): Promise<"/admin" | "/dashboard"> {
  const { data: sessie } = await supabase.auth.getSession();
  const userId = sessie.session?.user.id;
  if (!userId) return "/dashboard";
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return data ? "/admin" : "/dashboard";
}
