/**
 * Bij welke klant hoort dit verzoek?
 *
 * Twee vragen die op elkaar lijken maar niet hetzelfde zijn:
 *
 *   eigenKlant  van wie ben ik? Voor alles wat iets wijzigt, en voor elke
 *               controle of een agent "van mij" is. Een teamlid hoort bij het
 *               account van zijn bedrijf (fase 5).
 *   leesKlant   naar wie kijk ik? Hetzelfde, behalve tijdens meekijken: dan is
 *               het de klant bij wie de beheerder meekijkt. Alleen voor lezen.
 *
 * Het verschil is de hele beveiliging van meekijken. Gebruik je leesKlant voor
 * een controle vóór een actie, dan kan een meekijkende beheerder namens de
 * klant een campagne versturen. De database houdt schrijven ook tegen, maar
 * een server function die met de service-role werkt, loopt daar omheen.
 *
 * Staat de functie nog niet in de database, omdat de migratie nog niet is
 * gedraaid, dan valt dit terug op de gebruiker zelf. Dat is de strengste keuze.
 */

type MetRpc = {
  rpc: (naam: string) => Promise<{ data: unknown; error: { message: string } | null }>;
};

async function vraag(context: { supabase: unknown; userId: string }, functie: string) {
  const { data, error } = await (context.supabase as MetRpc).rpc(functie);
  if (error || typeof data !== "string") return context.userId;
  return data;
}

export function eigenKlant(context: { supabase: unknown; userId: string }) {
  return vraag(context, "mijn_klant");
}

export function leesKlant(context: { supabase: unknown; userId: string }) {
  return vraag(context, "werk_klant");
}
