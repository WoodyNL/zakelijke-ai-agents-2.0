-- De scheiding tussen twee live klanten zat nog niet in de database.
--
-- Het leesbeleid uit fase 0 luidde: is_active en de agent staat live. Dat zegt
-- niets over wélke agent je mag lezen. Zolang er één live agent is valt dat niet
-- op, maar met twee live klanten geeft één verzoek zonder filter de kennisbank
-- van allebei terug:
--
--   GET /rest/v1/knowledge_items?select=*
--
-- De scheiding zat daarmee alleen in de agent_id-filter in onze eigen code, en
-- die staat in een querystring die de aanroeper kan weglaten. De publieke
-- sleutel waarmee dat kan, staat in elke bundle die een bezoeker downloadt.
--
-- Het tegenargument dat een kennisbank toch openbaar is, gaat op voor onze eigen
-- site maar niet voor een klant. Er is verschil tussen informatie die je uit een
-- bot kunt praten in vijftig gesprekken, en de hele kennisbank van een
-- concurrent in één verzoek.
--
-- Daarom: anonieme bezoekers lezen de tabel niet meer rechtstreeks. De kennis
-- komt via een functie die per agent teruggeeft. Je kunt dan nog steeds de
-- kennis van een agent opvragen waarvan je de slug kent, maar niet die van alle
-- klanten tegelijk, en de scheiding staat in de database in plaats van in onze
-- code.

-- ---------------------------------------------------------------------------
-- 1. Rechtstreeks lezen gaat dicht voor anon
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Read knowledge of one live agent" ON public.knowledge_items;
REVOKE SELECT ON public.knowledge_items FROM anon;

-- Ingelogde gebruikers houden toegang via de bestaande policies: beheerders via
-- "Admins manage knowledge", klanten via "Clients manage knowledge of own
-- agents". Die filteren al wel per agent.

-- ---------------------------------------------------------------------------
-- 2. Kennis ophalen kan alleen nog per agent
--
--    De functie geeft niets terug voor een agent die niet live staat, en
--    niets buiten de agent die je opvraagt. Het is daarmee onmogelijk om in
--    één aanroep de kennis van meerdere klanten te krijgen.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.agent_knowledge(_slug text)
RETURNS TABLE (category text, title text, question text, content text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT k.category, k.title, k.question, k.content
  FROM public.knowledge_items k
  JOIN public.agents a ON a.id = k.agent_id
  WHERE a.slug = _slug
    AND a.status = 'live'
    AND k.is_active = true
  ORDER BY k.category, k.sort_order
$$;

REVOKE EXECUTE ON FUNCTION public.agent_knowledge(text) FROM public;
GRANT EXECUTE ON FUNCTION public.agent_knowledge(text) TO anon, authenticated;
