/**
 * Publieke Supabase-verbindingsgegevens voor de browser.
 *
 * Deze twee waarden zijn bedoeld om openbaar te zijn: bij een geslaagde build
 * staan ze sowieso in de JavaScript-bundle die elke bezoeker downloadt. De
 * beveiliging zit niet in geheimhouding maar in Row Level Security op de
 * database. De service-role-sleutel is wél geheim en staat hier dus niet — die
 * blijft server-side (zie integrations/supabase/client.server.ts).
 *
 * Ze staan hier hard in de code omdat de buildomgeving van Lovable
 * VITE_SUPABASE_URL en VITE_SUPABASE_PUBLISHABLE_KEY niet doorgeeft aan Vite,
 * waardoor import.meta.env leeg is in de gepubliceerde bundle en de hele
 * client-side Supabase-client stukliep (inloggen, /account, beheerpaneel).
 * Zodra Lovable dat oplost blijven deze waarden gewoon werken; de
 * omgevingsvariabelen krijgen hieronder voorrang.
 */
export const SUPABASE_URL =
  import.meta.env["VITE_SUPABASE_URL"] || "https://ouejghqgdxpjxhhxjbro.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
  "sb_publishable_34Rm3nwbkR4tsPtQABXQnA_KRHef8ru";
