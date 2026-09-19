-- Fase 5 van het beheerplan: teamleden per klant, en een support-rol.
--
-- De site belooft een portaal "alleen voor jou en je team". Tot nu toe hoorde
-- bij een klant precies één account. Nu kan de eigenaar collega's uitnodigen;
-- die zien hetzelfde portaal, met dezelfde agents.
--
-- En aan onze kant: een support-medewerker. Die ziet het overzicht in /admin en
-- mag meekijken, maar maakt geen klanten aan, wijzigt geen agents en ziet net
-- als de beheerder nooit de kennisbank.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';

-- ---------------------------------------------------------------------------
-- 1. Teamleden
--
--    Een klant is nog steeds één profiel: het account waar de agents aan
--    hangen. Een teamlid is een eigen login die naar dat profiel wijst. Eén
--    bedrijf per teamlid; wie bij twee bedrijven werkt, krijgt twee accounts.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.klantleden (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  toegevoegd_door uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  toegevoegd_op timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id <> client_id)
);

CREATE INDEX IF NOT EXISTS klantleden_klant_idx ON public.klantleden (client_id);

ALTER TABLE public.klantleden ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.klantleden FROM anon, authenticated;
GRANT SELECT ON public.klantleden TO authenticated;
GRANT ALL ON public.klantleden TO service_role;

-- Toevoegen en verwijderen gaat via de server, na de controle dat het de
-- eigenaar is die het vraagt. Lezen: je eigen team, en wij.
DROP POLICY IF EXISTS klantleden_lezen ON public.klantleden;
CREATE POLICY klantleden_lezen ON public.klantleden
  FOR SELECT TO authenticated
  USING (client_id = private.mijn_klant(auth.uid()) OR private.is_staf(auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. Van wie ben ik, en van wie is deze agent
--
--    Hier landt wat in fase 2 is voorbereid: alles wat eigendom controleert,
--    loopt via deze twee functies. De policies op de kennisbank, de
--    outbound-tabellen, het verbruik en de leads gebruiken owns_agent(), en
--    gelden daarmee vanaf nu vanzelf ook voor teamleden.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.mijn_klant(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    (SELECT k.client_id FROM public.klantleden k WHERE k.user_id = _user_id),
    _user_id
  )
$$;

CREATE OR REPLACE FUNCTION private.owns_agent(_agent_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agents
    WHERE id = _agent_id AND client_id = private.mijn_klant(_user_id)
  )
$$;

-- De twee policies die nog rechtstreeks op client_id = auth.uid() keken.
DROP POLICY IF EXISTS "Clients read own agents" ON public.agents;
CREATE POLICY "Clients read own agents" ON public.agents
  FOR SELECT TO authenticated
  USING (client_id = private.mijn_klant(auth.uid()) OR private.is_staf(auth.uid()));

DROP POLICY IF EXISTS "Clients read own agent stats" ON public.agent_stats;
CREATE POLICY "Clients read own agent stats" ON public.agent_stats
  FOR SELECT TO authenticated
  USING (private.owns_agent(agent_id, auth.uid()) OR private.is_staf(auth.uid()));

-- ---------------------------------------------------------------------------
-- 3. Wat support mag lezen
--
--    Laag A en B, net als de beheerder: profielen, agents (hierboven), het
--    verbruik, de gebeurtenissen en de fair-use-meldingen. Alleen lezen; de
--    FOR ALL-policies van de beheerder blijven alleen voor de beheerder.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS profiles_staf_lezen ON public.profiles;
CREATE POLICY profiles_staf_lezen ON public.profiles
  FOR SELECT TO authenticated
  USING (private.is_staf(auth.uid()));

-- Support moet kunnen zien wie een collega is, anders staat die als klant in
-- het overzicht.
DROP POLICY IF EXISTS user_roles_staf_lezen ON public.user_roles;
CREATE POLICY user_roles_staf_lezen ON public.user_roles
  FOR SELECT TO authenticated
  USING (private.is_staf(auth.uid()));

DROP POLICY IF EXISTS agent_usage_staf_lezen ON public.agent_usage;
CREATE POLICY agent_usage_staf_lezen ON public.agent_usage
  FOR SELECT TO authenticated
  USING (private.is_staf(auth.uid()));

DROP POLICY IF EXISTS agent_gebeurtenissen_lezen ON public.agent_gebeurtenissen;
CREATE POLICY agent_gebeurtenissen_lezen ON public.agent_gebeurtenissen
  FOR SELECT TO authenticated
  USING (private.owns_agent(agent_id, auth.uid()) OR private.is_staf(auth.uid()));

DROP POLICY IF EXISTS fair_use_meldingen_lezen ON public.fair_use_meldingen;
CREATE POLICY fair_use_meldingen_lezen ON public.fair_use_meldingen
  FOR SELECT TO authenticated
  USING (private.owns_agent(agent_id, auth.uid()) OR private.is_staf(auth.uid()));

-- Een teamlid ziet in de gebeurtenissen de naam van een collega; wie bij ons
-- werkt heet "Zakelijke AI Agents", ook als het support is.
CREATE OR REPLACE FUNCTION public.agent_gebeurtenissen_van(_agent_id uuid)
RETURNS TABLE (id bigint, soort text, van text, naar text, door text, op timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    g.id, g.soort, g.van, g.naar,
    CASE
      WHEN g.door IS NULL THEN 'Automatisch'
      WHEN private.is_staf(g.door) THEN 'Zakelijke AI Agents'
      ELSE coalesce(nullif(p.name, ''), p.email, 'Onbekend')
    END,
    g.op
  FROM public.agent_gebeurtenissen g
  LEFT JOIN public.profiles p ON p.id = g.door
  WHERE g.agent_id = _agent_id
    AND (private.owns_agent(_agent_id, auth.uid()) OR private.is_staf(auth.uid()))
  ORDER BY g.op DESC
  LIMIT 50
$$;

CREATE OR REPLACE FUNCTION public.agent_kerncijfers(_agent_id uuid, _dagen integer DEFAULT 30)
RETURNS TABLE (gesprekken bigint, leads bigint, laatste_activiteit timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH toegang AS (
    SELECT 1
    WHERE private.owns_agent(_agent_id, auth.uid()) OR private.is_staf(auth.uid())
  ),
  vanaf AS (
    SELECT now() - make_interval(days => greatest(least(_dagen, 3650), 1)) AS t
  )
  SELECT
    (SELECT coalesce(sum(u.billable_requests), 0)::bigint
       FROM public.agent_usage u, vanaf v
       WHERE u.agent_id = _agent_id AND u.hour >= v.t),
    (SELECT count(*)::bigint
       FROM public.lead_requests l, vanaf v
       WHERE l.agent_id = _agent_id AND l.created_at >= v.t),
    (SELECT max(u.hour)
       FROM public.agent_usage u
       WHERE u.agent_id = _agent_id AND u.requests > 0)
  FROM toegang
$$;

-- ---------------------------------------------------------------------------
-- 4. Het team, voor de accountpagina
-- ---------------------------------------------------------------------------

-- Ben ik de eigenaar van mijn klantaccount, en geen teamlid?
CREATE OR REPLACE FUNCTION public.ben_eigenaar()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.klantleden WHERE user_id = auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.ben_eigenaar() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.ben_eigenaar() TO authenticated;

-- Iedereen met toegang tot dit klantaccount, eigenaar voorop.
CREATE OR REPLACE FUNCTION public.mijn_team()
RETURNS TABLE (user_id uuid, naam text, email text, eigenaar boolean, sinds timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH klant AS (SELECT private.mijn_klant(auth.uid()) AS id)
  SELECT p.id, p.name, p.email, true, p.created_at
  FROM public.profiles p, klant
  WHERE p.id = klant.id AND auth.uid() IS NOT NULL
  UNION ALL
  SELECT p.id, p.name, p.email, false, k.toegevoegd_op
  FROM public.klantleden k
  JOIN public.profiles p ON p.id = k.user_id, klant
  WHERE k.client_id = klant.id AND auth.uid() IS NOT NULL
  ORDER BY 4 DESC, 5
$$;
REVOKE EXECUTE ON FUNCTION public.mijn_team() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.mijn_team() TO authenticated;
