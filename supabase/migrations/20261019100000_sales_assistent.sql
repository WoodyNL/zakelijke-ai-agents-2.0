-- De sales-assistent.
--
-- Stond sinds september als soort in het beheer zonder dat er iets achter zat.
-- Wat hij doet: elke binnenkomende lead binnen minuten beoordelen tegen "wie
-- past bij jou" (de instelling van de klant), een eerste antwoord klaarzetten
-- of versturen, en bijhouden wat ermee gebeurt. Het onafhankelijke onderzoek
-- van Valve+Meter: 95% van de bedrijven reageert niet binnen vijf minuten op
-- een aanvraag, 40% nooit. Snelheid is hier het product.
--
-- Leads komen van drie kanten: per mail op het ontvangstadres, met de hand,
-- en uit de chat-assistent van dezelfde klant (die legt al leads vast in
-- lead_requests). De laatste worden overgenomen, niet verplaatst: de chat
-- blijft zijn eigen lijst houden.

CREATE TABLE IF NOT EXISTS public.sales_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  -- Uniek per bron: 'mail:<resend-id>', 'chat:<lead_request-id>', 'portaal:<uuid>'.
  provider_id text NOT NULL UNIQUE,
  bron text NOT NULL DEFAULT 'handmatig' CHECK (bron IN ('mail', 'chat', 'formulier', 'handmatig')),
  naam text,
  bedrijf text,
  email text NOT NULL,
  telefoon text,
  bericht text NOT NULL DEFAULT '',
  message_id text,
  ontvangen_op timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'nieuw' CHECK (status IN (
    'nieuw', 'bezig',
    'gekwalificeerd',  -- past, antwoord staat klaar of is verstuurd
    'twijfel',         -- de agent weet het niet zeker; jij kijkt
    'afgewezen',       -- past niet (door de agent, jij kunt het terugdraaien)
    'afspraak',        -- er staat een gesprek
    'gewonnen', 'verloren', 'mislukt'
  )),
  -- De beoordeling: past / past_niet / onduidelijk, met de reden in woorden.
  oordeel text CHECK (oordeel IS NULL OR oordeel IN ('past', 'past_niet', 'onduidelijk')),
  reden text,
  vragen jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(vragen) = 'array'),
  concept_onderwerp text,
  concept_tekst text,
  concept_op timestamptz,
  verzonden_tekst text,
  verzonden_op timestamptz,
  verzonden_door uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notitie text,
  fout text,
  bijgewerkt_op timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sales_leads_agent_idx ON public.sales_leads (agent_id, ontvangen_op DESC);
CREATE INDEX IF NOT EXISTS sales_leads_status_idx ON public.sales_leads (agent_id, status);

ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_leads FROM anon;
GRANT SELECT, UPDATE ON public.sales_leads TO authenticated;
GRANT ALL ON public.sales_leads TO service_role;

DROP POLICY IF EXISTS sales_leads_eigenaar ON public.sales_leads;
CREATE POLICY sales_leads_eigenaar ON public.sales_leads FOR ALL TO authenticated
  USING (private.owns_agent(agent_id, auth.uid())) WITH CHECK (private.owns_agent(agent_id, auth.uid()));
DROP POLICY IF EXISTS sales_leads_meekijken ON public.sales_leads;
CREATE POLICY sales_leads_meekijken ON public.sales_leads FOR SELECT TO authenticated
  USING (private.meekijkt_agent(agent_id, auth.uid()));

-- Het dashboard. Het cijfer dat verkoopt is opnieuw de reactietijd: minuten
-- tussen binnenkomst en het eerste antwoord (concept of verstuurd).
CREATE OR REPLACE FUNCTION public.sales_kerncijfers(_agent_id uuid, _dagen integer DEFAULT 30)
RETURNS TABLE (
  leads bigint,
  gekwalificeerd bigint,
  afgewezen bigint,
  twijfel bigint,
  afspraken bigint,
  gewonnen bigint,
  open bigint,
  reactie_minuten numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH toegang AS (
    SELECT 1 WHERE private.owns_agent(_agent_id, auth.uid()) OR private.is_staf(auth.uid())
  ),
  vanaf AS (SELECT now() - make_interval(days => greatest(least(coalesce(_dagen, 30), 3650), 1)) AS t),
  r AS (SELECT l.* FROM public.sales_leads l, vanaf WHERE l.agent_id = _agent_id AND l.ontvangen_op >= vanaf.t)
  SELECT
    (SELECT count(*) FROM r),
    (SELECT count(*) FROM r WHERE oordeel = 'past'),
    (SELECT count(*) FROM r WHERE oordeel = 'past_niet'),
    (SELECT count(*) FROM r WHERE oordeel = 'onduidelijk'),
    (SELECT count(*) FROM r WHERE status IN ('afspraak', 'gewonnen')),
    (SELECT count(*) FROM r WHERE status = 'gewonnen'),
    (SELECT count(*) FROM r WHERE status IN ('nieuw', 'bezig', 'twijfel', 'mislukt')),
    (SELECT round(avg(extract(epoch FROM (coalesce(verzonden_op, concept_op) - ontvangen_op)) / 60)::numeric, 0)
       FROM r WHERE coalesce(verzonden_op, concept_op) IS NOT NULL)
  FROM toegang
$$;
REVOKE EXECUTE ON FUNCTION public.sales_kerncijfers(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.sales_kerncijfers(uuid, integer) TO authenticated;
