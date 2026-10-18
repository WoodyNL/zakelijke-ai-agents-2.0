-- De offerte-agent.
--
-- Een aanvraag komt binnen (per mail op het ontvangstadres van de agent, of
-- met de hand ingevoerd in het portaal), de agent stelt een concept-offerte op
-- uit de prijslijst in de kennisbank, en de klant kijkt na en verstuurt. Dit is
-- dezelfde vorm als supportmail — binnenkomen, opstellen, beoordelen,
-- versturen — en daarom dezelfde opbouw: één tabel met een status, claimen
-- voor je opstelt, en inhoud die alleen de eigenaar leest.
--
-- Wat anders is dan bij supportmail: de regels. Een offerte is geen tekst maar
-- een lijst van producten met aantallen en bedragen, en elk bedrag moet
-- herleidbaar zijn naar een regel in de prijslijst. Daarom staan de regels als
-- jsonb naast de tekst, met per regel het kennisitem waar de prijs vandaan
-- komt. Een bedrag zonder bron bestaat hier niet.

CREATE TABLE IF NOT EXISTS public.offerte_aanvragen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  -- Het id bij de bron (Resend) of 'portaal:<uuid>' bij handmatige invoer.
  -- Uniek: een melding die opnieuw wordt aangeboden mag geen tweede offerte
  -- opleveren.
  provider_id text NOT NULL UNIQUE,
  message_id text,
  van_email text NOT NULL,
  van_naam text,
  bedrijf text,
  onderwerp text,
  vraag text NOT NULL DEFAULT '',
  ontvangen_op timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'nieuw' CHECK (status IN (
    'nieuw',        -- binnen, nog niet opgesteld
    'bezig',        -- de agent stelt op
    'concept',      -- wacht op de klant
    'mens_nodig',   -- past niet in de prijslijst of er ontbreekt informatie
    'verstuurd',
    'geaccepteerd', -- door de klant aangevinkt
    'afgewezen',
    'zelf',         -- de klant handelt het zelf af
    'mislukt'
  )),
  -- De regels: [{omschrijving, aantal, eenheid, prijs, bedrag, bron}].
  -- 'bron' is de titel van het kennisitem waar de prijs uit komt.
  regels jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(regels) = 'array'),
  totaal numeric(12,2),
  geldig_tot date,
  concept_onderwerp text,
  concept_tekst text,
  -- Wat de agent niet kon beantwoorden uit de aanvraag: vragen voor de klant.
  ontbreekt jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(ontbreekt) = 'array'),
  toelichting text,
  concept_op timestamptz,
  verzonden_onderwerp text,
  verzonden_tekst text,
  verzonden_op timestamptz,
  verzonden_door uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- De opvolgmail staat bij Resend ingepland; zonder dit id kunnen we hem niet
  -- meer tegenhouden als de klant intussen ja of nee zegt.
  opvolging_provider_id text,
  besloten_op timestamptz,
  fout text,
  bijgewerkt_op timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS offerte_aanvragen_agent_idx
  ON public.offerte_aanvragen (agent_id, ontvangen_op DESC);
CREATE INDEX IF NOT EXISTS offerte_aanvragen_status_idx
  ON public.offerte_aanvragen (agent_id, status);

ALTER TABLE public.offerte_aanvragen ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.offerte_aanvragen FROM anon;
GRANT SELECT, UPDATE ON public.offerte_aanvragen TO authenticated;
GRANT ALL ON public.offerte_aanvragen TO service_role;

-- Inhoud van de klant: laag C. De eigenaar en zijn team; een meekijker alleen
-- lezend. Wij niet.
DROP POLICY IF EXISTS offerte_aanvragen_eigenaar ON public.offerte_aanvragen;
CREATE POLICY offerte_aanvragen_eigenaar ON public.offerte_aanvragen
  FOR ALL TO authenticated
  USING (private.owns_agent(agent_id, auth.uid()))
  WITH CHECK (private.owns_agent(agent_id, auth.uid()));

DROP POLICY IF EXISTS offerte_aanvragen_meekijken ON public.offerte_aanvragen;
CREATE POLICY offerte_aanvragen_meekijken ON public.offerte_aanvragen
  FOR SELECT TO authenticated
  USING (private.meekijkt_agent(agent_id, auth.uid()));

-- Aantallen voor het dashboard. Het cijfer dat verkoopt is de reactietijd:
-- hoe snel staat er een concept nadat de aanvraag binnenkwam.
CREATE OR REPLACE FUNCTION public.offerte_kerncijfers(_agent_id uuid, _dagen integer DEFAULT 30)
RETURNS TABLE (
  aanvragen bigint,
  concepten bigint,
  mens_nodig bigint,
  verstuurd bigint,
  geaccepteerd bigint,
  afgewezen bigint,
  open bigint,
  reactie_minuten numeric,
  omzet numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH toegang AS (
    SELECT 1 WHERE private.owns_agent(_agent_id, auth.uid()) OR private.is_staf(auth.uid())
  ),
  vanaf AS (
    SELECT now() - make_interval(days => greatest(least(coalesce(_dagen, 30), 3650), 1)) AS t
  ),
  rijen AS (
    SELECT a.* FROM public.offerte_aanvragen a, vanaf WHERE a.agent_id = _agent_id AND a.ontvangen_op >= vanaf.t
  )
  SELECT
    (SELECT count(*) FROM rijen),
    (SELECT count(*) FROM rijen WHERE concept_op IS NOT NULL),
    (SELECT count(*) FROM rijen WHERE status = 'mens_nodig'),
    (SELECT count(*) FROM rijen WHERE verzonden_op IS NOT NULL),
    (SELECT count(*) FROM rijen WHERE status = 'geaccepteerd'),
    (SELECT count(*) FROM rijen WHERE status = 'afgewezen'),
    (SELECT count(*) FROM rijen WHERE status IN ('nieuw', 'bezig', 'concept', 'mens_nodig', 'mislukt')),
    (SELECT round(avg(extract(epoch FROM (concept_op - ontvangen_op)) / 60)::numeric, 0)
       FROM rijen WHERE concept_op IS NOT NULL),
    (SELECT coalesce(sum(totaal), 0) FROM rijen WHERE status = 'geaccepteerd')
  FROM toegang
$$;
REVOKE EXECUTE ON FUNCTION public.offerte_kerncijfers(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.offerte_kerncijfers(uuid, integer) TO authenticated;
