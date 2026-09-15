-- FASE 0 — scheiding per klant, voordat er een tweede klant bij komt.
--
-- Tot nu toe was er één kennisbank: die van Zakelijke AI Agents zelf. De policy
-- "Anyone can read active knowledge" van 15 september laat elke anonieme
-- bezoeker die lezen, wat klopt zolang het je eigen kennis is: de assistent
-- vertelt het toch hardop. Zodra de kennis van een klant in dezelfde tabel
-- staat, kan iedereen met een browser die van alle klanten uitlezen.
--
-- Deze migratie koppelt kennis en leads aan een agent, vervangt die brede
-- policy door een variant die per agent filtert, en sluit het rechtstreeks
-- wegschrijven van leads vanuit de browser.
--
-- De volgorde is belangrijk: eerst een eigenaar geven aan de bestaande items,
-- pas daarna het strenge slot erop. Andersom valt de live assistent stil omdat
-- hij zijn eigen kennis niet meer mag lezen.

-- ---------------------------------------------------------------------------
-- 1. Kennis hoort bij een agent
-- ---------------------------------------------------------------------------

ALTER TABLE public.knowledge_items
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS knowledge_items_agent_idx
  ON public.knowledge_items(agent_id);

-- ---------------------------------------------------------------------------
-- 2. De bestaande kennis krijgt een eigenaar: onze eigen website-assistent
--
--    Zakelijke AI Agents wordt hiermee klant nummer één van zijn eigen
--    platform. Dat is geen truc maar het punt: wat op de eigen site draait is
--    exact wat een klant koopt, dus loopt het voortaan door hetzelfde pad.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  eigenaar uuid;
  eigen_agent uuid;
  zonder_eigenaar integer;
BEGIN
  -- Bij voorkeur de beheerder; anders het oudste profiel. Zonder profiel kan
  -- deze migratie niets zinnigs doen en moet hij stoppen in plaats van een
  -- halve staat achterlaten.
  SELECT ur.user_id INTO eigenaar
  FROM public.user_roles ur
  WHERE ur.role = 'admin'
  ORDER BY ur.user_id
  LIMIT 1;

  IF eigenaar IS NULL THEN
    SELECT p.id INTO eigenaar FROM public.profiles p ORDER BY p.created_at LIMIT 1;
  END IF;

  IF eigenaar IS NULL THEN
    RAISE EXCEPTION
      'Geen profiel gevonden om de bestaande kennisbank aan te koppelen. Maak eerst een account aan en ken de rol admin toe, en draai deze migratie daarna opnieuw.';
  END IF;

  SELECT a.id INTO eigen_agent
  FROM public.agents a
  WHERE a.client_id = eigenaar AND a.name = 'Website-assistent'
  LIMIT 1;

  IF eigen_agent IS NULL THEN
    INSERT INTO public.agents (client_id, name, description, metric_label, score_label, status)
    VALUES (
      eigenaar,
      'Website-assistent',
      'De assistent op zakelijkeaiagents.nl. Beantwoordt bezoekersvragen uit de kennisbank en legt contactgegevens vast.',
      'gesprekken',
      'beantwoord zonder doorverwijzing',
      'live'
    )
    RETURNING id INTO eigen_agent;
  END IF;

  UPDATE public.knowledge_items
  SET agent_id = eigen_agent
  WHERE agent_id IS NULL;

  SELECT count(*) INTO zonder_eigenaar
  FROM public.knowledge_items
  WHERE agent_id IS NULL;

  IF zonder_eigenaar > 0 THEN
    RAISE EXCEPTION 'Er zijn nog % kennisitems zonder agent. Stoppen voordat het strenge leesbeleid erop gaat.', zonder_eigenaar;
  END IF;
END $$;

-- Pas nu verplicht stellen: elk kennisitem hoort ergens bij.
ALTER TABLE public.knowledge_items
  ALTER COLUMN agent_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Hulpfuncties die langs RLS kunnen kijken
--
--    PostgreSQL past RLS ook toe op tabellen die je bínnen een policy bevraagt.
--    Een policy op knowledge_items die rechtstreeks in agents kijkt, zou voor
--    een anonieme bezoeker altijd onwaar opleveren: die mag agents niet lezen.
--    De kennisbank zou daarmee volledig onleesbaar worden.
--
--    Daarom dezelfde constructie als private.has_role(): een SECURITY DEFINER
--    functie met een vaste search_path, die precies één ding mag beantwoorden
--    en verder niets prijsgeeft over de agents-tabel.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.agent_is_live(_agent_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agents WHERE id = _agent_id AND status = 'live'
  )
$$;

REVOKE EXECUTE ON FUNCTION private.agent_is_live(uuid) FROM public;
GRANT EXECUTE ON FUNCTION private.agent_is_live(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.owns_agent(_agent_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agents WHERE id = _agent_id AND client_id = _user_id
  )
$$;

REVOKE EXECUTE ON FUNCTION private.owns_agent(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION private.owns_agent(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Het brede leesbeleid vervangen
--
--    Let op: dit is de tweede verdedigingslinie, niet de enige. Een bezoeker
--    die een geldig agent_id raadt komt hier nog steeds doorheen. Het eerste
--    slot zit in de server function, die het agent_id koppelt aan het domein
--    waar het verzoek vandaan komt (fase 1).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can read active knowledge" ON public.knowledge_items;
DROP POLICY IF EXISTS "Authenticated users read active knowledge" ON public.knowledge_items;

CREATE POLICY "Read knowledge of one live agent"
ON public.knowledge_items
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND private.agent_is_live(agent_id)
);

-- Een klant beheert de kennis van zijn eigen agents. Beheerders houden via
-- "Admins manage knowledge" toegang tot alles; dat beleid blijft ongewijzigd.
CREATE POLICY "Clients manage knowledge of own agents"
ON public.knowledge_items
FOR ALL
TO authenticated
USING (private.owns_agent(agent_id, auth.uid()))
WITH CHECK (private.owns_agent(agent_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- 5. Leads horen bij een agent, en gaan niet meer rechtstreeks vanuit de browser
--
--    agent_id mag leeg blijven: leads uit het contactformulier op de eigen site
--    komen niet van een agent. Leads uit een chat krijgen wel een agent mee,
--    zodat een klant straks alleen zijn eigen leads ziet.
-- ---------------------------------------------------------------------------

ALTER TABLE public.lead_requests
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS lead_requests_agent_idx
  ON public.lead_requests(agent_id);

-- Iedereen mocht rechtstreeks een lead wegschrijven via de REST-API, buiten de
-- website om, met WITH CHECK (true). Dat is een open deur voor spam, en elke
-- inzending stuurt ook nog een e-mail. Schrijven loopt voortaan via de server
-- met de service-role, die RLS sowieso omzeilt; het contactformulier en de
-- assistent gebruiken dat pad al.
DROP POLICY IF EXISTS "Anyone can submit a lead request" ON public.lead_requests;
REVOKE INSERT ON public.lead_requests FROM anon;

CREATE POLICY "Clients read leads of own agents"
ON public.lead_requests
FOR SELECT
TO authenticated
USING (private.owns_agent(agent_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- 6. Een leesbare verwijzing naar een agent
--
--    Fase 1 zet een embed-snippet op de site van een klant. Daar wil je geen
--    uuid in, maar een naam die je kunt lezen en uitspreken. De slug is de
--    publieke identificatie van een agent; het uuid blijft intern.
--
--    resolve_live_agent() is het enige wat een anonieme bezoeker over agents
--    mag weten: bestaat deze slug, en staat die agent live. Meer niet.
-- ---------------------------------------------------------------------------

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS agents_slug_key
  ON public.agents(slug) WHERE slug IS NOT NULL;

UPDATE public.agents
SET slug = 'website-assistent'
WHERE name = 'Website-assistent' AND slug IS NULL;

CREATE OR REPLACE FUNCTION public.resolve_live_agent(_slug text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.agents WHERE slug = _slug AND status = 'live'
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_live_agent(text) FROM public;
GRANT EXECUTE ON FUNCTION public.resolve_live_agent(text) TO anon, authenticated;