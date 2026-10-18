-- De review-agent.
--
-- Uit het consumentenonderzoek van BrightLocal (2026): 97% leest reviews van
-- lokale bedrijven, 32% kijkt alleen naar reviews van de laatste twee weken,
-- 89% verwacht dat de eigenaar reageert, en 50% haakt af bij een
-- sjabloonantwoord. Dus twee dingen: op het juiste moment om een review
-- vragen, en op elke review antwoorden in de eigen toon van de klant.
--
-- Twee tabellen. De verzoeken: wie na welke klus wanneer gevraagd wordt. En de
-- reviews zelf, met het voorgestelde antwoord. Die laatste komen er vandaag
-- handmatig in (plakken) of straks via de koppeling met het Google
-- Bedrijfsprofiel; het antwoord opstellen werkt in beide gevallen.
--
-- Geen "review gating": iedereen die een klus kreeg, krijgt dezelfde vraag.
-- Google verbiedt het, en het is ook gewoon niet eerlijk. Wat wél mag en in de
-- instellingen staat: niet vragen na een klacht.

CREATE TABLE IF NOT EXISTS public.review_verzoeken (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  email text NOT NULL,
  naam text,
  -- Wanneer de klus, levering of afspraak klaar was. Het verzoek volgt zoveel
  -- dagen later als de klant instelde.
  klaar_op date NOT NULL DEFAULT current_date,
  -- Gemarkeerd als klacht: dan vragen we niet (instelling).
  klacht boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'gepland' CHECK (status IN ('gepland', 'verstuurd', 'overgeslagen', 'mislukt')),
  verstuurd_op timestamptz,
  provider_id text,
  notitie text,
  aangemaakt_op timestamptz NOT NULL DEFAULT now(),
  -- Eén verzoek per adres per klusdatum; een lijst die opnieuw wordt
  -- aangeleverd mag niemand twee keer vragen.
  UNIQUE (agent_id, email, klaar_op)
);
CREATE INDEX IF NOT EXISTS review_verzoeken_agent_idx ON public.review_verzoeken (agent_id, status, klaar_op);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  bron text NOT NULL DEFAULT 'handmatig' CHECK (bron IN ('handmatig', 'google')),
  extern_id text,
  sterren integer NOT NULL CHECK (sterren BETWEEN 1 AND 5),
  naam text,
  tekst text NOT NULL DEFAULT '',
  geplaatst_op date NOT NULL DEFAULT current_date,
  concept_antwoord text,
  concept_op timestamptz,
  antwoord text,
  beantwoord_op timestamptz,
  aangemaakt_op timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, bron, extern_id)
);
CREATE INDEX IF NOT EXISTS reviews_agent_idx ON public.reviews (agent_id, geplaatst_op DESC);

ALTER TABLE public.review_verzoeken ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.review_verzoeken FROM anon;
REVOKE ALL ON public.reviews FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_verzoeken TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.review_verzoeken TO service_role;
GRANT ALL ON public.reviews TO service_role;

-- Wie bij wie een review vroeg, en wat een klant van de klant schreef: van de
-- klant. Eigenaar en team; meekijker alleen lezend.
DROP POLICY IF EXISTS review_verzoeken_eigenaar ON public.review_verzoeken;
CREATE POLICY review_verzoeken_eigenaar ON public.review_verzoeken
  FOR ALL TO authenticated
  USING (private.owns_agent(agent_id, auth.uid())) WITH CHECK (private.owns_agent(agent_id, auth.uid()));
DROP POLICY IF EXISTS review_verzoeken_meekijken ON public.review_verzoeken;
CREATE POLICY review_verzoeken_meekijken ON public.review_verzoeken
  FOR SELECT TO authenticated USING (private.meekijkt_agent(agent_id, auth.uid()));
DROP POLICY IF EXISTS reviews_eigenaar ON public.reviews;
CREATE POLICY reviews_eigenaar ON public.reviews
  FOR ALL TO authenticated
  USING (private.owns_agent(agent_id, auth.uid())) WITH CHECK (private.owns_agent(agent_id, auth.uid()));
DROP POLICY IF EXISTS reviews_meekijken ON public.reviews;
CREATE POLICY reviews_meekijken ON public.reviews
  FOR SELECT TO authenticated USING (private.meekijkt_agent(agent_id, auth.uid()));

-- Het dashboard: wat het onderzoek zegt dat telt. Recente reviews (90 dagen),
-- het gemiddelde daarvan, en hoeveel er onbeantwoord staan.
CREATE OR REPLACE FUNCTION public.review_kerncijfers(_agent_id uuid, _dagen integer DEFAULT 90)
RETURNS TABLE (
  verzoeken bigint,
  reviews bigint,
  gemiddelde numeric,
  onbeantwoord bigint,
  reviews_per_verzoek numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH toegang AS (
    SELECT 1 WHERE private.owns_agent(_agent_id, auth.uid()) OR private.is_staf(auth.uid())
  ),
  vanaf AS (
    SELECT (now() - make_interval(days => greatest(least(coalesce(_dagen, 90), 3650), 1)))::date AS t
  ),
  v AS (SELECT count(*) AS n FROM public.review_verzoeken r, vanaf WHERE r.agent_id = _agent_id AND r.status = 'verstuurd' AND r.verstuurd_op >= vanaf.t),
  rv AS (SELECT * FROM public.reviews r, vanaf WHERE r.agent_id = _agent_id AND r.geplaatst_op >= vanaf.t)
  SELECT
    (SELECT n FROM v),
    (SELECT count(*) FROM rv),
    (SELECT round(avg(sterren)::numeric, 1) FROM rv),
    (SELECT count(*) FROM public.reviews r WHERE r.agent_id = _agent_id AND r.beantwoord_op IS NULL),
    (SELECT CASE WHEN (SELECT n FROM v) > 0 THEN round((SELECT count(*) FROM rv)::numeric / (SELECT n FROM v), 2) ELSE NULL END)
  FROM toegang
$$;
REVOKE EXECUTE ON FUNCTION public.review_kerncijfers(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.review_kerncijfers(uuid, integer) TO authenticated;
