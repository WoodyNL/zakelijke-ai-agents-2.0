import { createMiddleware } from "@tanstack/react-start";

/**
 * Hangt het Supabase-bearer-token aan elke server-function-aanroep vanuit de
 * browser. Dit draait ook voor publieke aanroepen zoals het contactformulier,
 * dus het mag nooit hard falen: als de Supabase-client niet beschikbaar is of
 * er is geen sessie, gaat het verzoek zonder token door en beslist de server
 * zelf of dat is toegestaan.
 *
 * De gegenereerde variant (integrations/supabase/auth-attacher.ts) liet de
 * fout uit createSupabaseClient() doorlopen, waardoor het verzoek nooit werd
 * verstuurd zodra de VITE_SUPABASE_*-variabelen ontbraken in de build.
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  let token: string | undefined;

  try {
    const { supabase } = await import("@/lib/supabase-browser");
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  } catch (err) {
    console.warn("Supabase-sessie niet beschikbaar; verzoek gaat zonder token door", err);
  }

  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});
