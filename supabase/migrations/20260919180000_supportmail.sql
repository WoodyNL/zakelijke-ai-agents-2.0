-- De inbox-assistent beantwoordt supportmail.
--
-- Een klant stuurt zijn supportadres door (of koppelt later zijn mailbox), de
-- agent zoekt het antwoord in de kennisbank en stelt een mail op. Standaard
-- wordt dat een concept dat de klant goedkeurt. Pas als hij de antwoorden
-- vertrouwt, zet hij zelf "direct versturen" aan; ook dan gaan twijfelgevallen
-- en vragen zonder antwoord in de kennisbank naar een mens.
--
-- Besloten op 19 september 2026: een uitbreiding van de inbox-assistent, geen
-- nieuwe soort; doorsturen en mailbox koppelen zijn allebei een keuze van de
-- klant; concept is de standaard.

-- ---------------------------------------------------------------------------
-- 1. Instellingen per agent
--
--    Apart van agents, omdat de klant deze zelf beheert: hij zet direct
--    versturen aan of uit, niet wij. In agents staan de afspraken die wij
--    maken (fair use, tarief), en die past de klant niet aan.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.support_instellingen (
  agent_id uuid PRIMARY KEY REFERENCES public.agents(id) ON DELETE CASCADE,
  -- Hoe de mail binnenkomt. Gmail en Outlook vragen een koppeling die per
  -- provider wordt ingericht; tot die er is, werkt alleen doorsturen.
  kanaal text NOT NULL DEFAULT 'doorsturen' CHECK (kanaal IN ('doorsturen', 'gmail', 'outlook')),
  -- concept: alles wacht op de klant. direct: zeker antwoord uit de
  -- kennisbank gaat meteen weg, de rest wordt een concept.
  modus text NOT NULL DEFAULT 'concept' CHECK (modus IN ('concept', 'direct')),
  afzender_naam text CHECK (afzender_naam IS NULL OR length(afzender_naam) <= 100),
  afzender_email text CHECK (afzender_email IS NULL OR afzender_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  ondertekening text CHECK (ondertekening IS NULL OR length(ondertekening) <= 500),
  bijgewerkt_op timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_instellingen ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_instellingen FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.support_instellingen TO authenticated;
GRANT ALL ON public.support_instellingen TO service_role;

DROP POLICY IF EXISTS support_instellingen_eigenaar ON public.support_instellingen;
CREATE POLICY support_instellingen_eigenaar ON public.support_instellingen
  FOR ALL TO authenticated
  USING (private.owns_agent(agent_id, auth.uid()))
  WITH CHECK (private.owns_agent(agent_id, auth.uid()));

-- Laag A: of een agent op concept of direct staat, en hoe de mail binnenkomt.
DROP POLICY IF EXISTS support_instellingen_staf ON public.support_instellingen;
CREATE POLICY support_instellingen_staf ON public.support_instellingen
  FOR SELECT TO authenticated
  USING (private.is_staf(auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. De supportmails
--
--    Laag C: de vraag van een klant van de klant, met naam en adres. Alleen de
--    eigenaar, en meekijken alleen lezend. Geen uitzondering voor beheer.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.support_mails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  -- Het id bij de bron (Resend, Gmail, Outlook). Uniek: een melding die
  -- opnieuw wordt aangeboden, mag geen tweede mail en geen tweede antwoord
  -- opleveren.
  provider_id text NOT NULL UNIQUE,
  message_id text,
  van_email text NOT NULL,
  van_naam text,
  onderwerp text,
  vraag text NOT NULL DEFAULT '',
  ontvangen_op timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'nieuw' CHECK (status IN (
    'nieuw',       -- binnen, nog niet opgesteld (of de agent stond op pauze)
    'bezig',       -- de agent stelt op
    'concept',     -- wacht op de klant
    'mens_nodig',  -- het antwoord staat niet in de kennisbank
    'verzonden',
    'zelf',        -- de klant handelt het zelf af
    'mislukt'
  )),
  concept_onderwerp text,
  concept_tekst text,
  -- Waar het antwoord op rust: de titels van de gebruikte kennisitems.
  bronnen text[] NOT NULL DEFAULT '{}',
  zekerheid text CHECK (zekerheid IS NULL OR zekerheid IN ('hoog', 'laag')),
  -- Waarom een mens nodig is, of waarom het een concept werd.
  toelichting text,
  verzonden_onderwerp text,
  verzonden_tekst text,
  verzonden_op timestamptz,
  -- Wie op versturen drukte; leeg bij automatisch versturen.
  verzonden_door uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  fout text,
  bijgewerkt_op timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_mails_agent_idx
  ON public.support_mails (agent_id, ontvangen_op DESC);
CREATE INDEX IF NOT EXISTS support_mails_open_idx
  ON public.support_mails (agent_id, status)
  WHERE status IN ('nieuw', 'concept', 'mens_nodig', 'mislukt');

ALTER TABLE public.support_mails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_mails FROM anon;
GRANT SELECT, UPDATE ON public.support_mails TO authenticated;
GRANT ALL ON public.support_mails TO service_role;

DROP POLICY IF EXISTS support_mails_eigenaar ON public.support_mails;
CREATE POLICY support_mails_eigenaar ON public.support_mails
  FOR ALL TO authenticated
  USING (private.owns_agent(agent_id, auth.uid()))
  WITH CHECK (private.owns_agent(agent_id, auth.uid()));

DROP POLICY IF EXISTS support_mails_meekijken ON public.support_mails;
CREATE POLICY support_mails_meekijken ON public.support_mails
  FOR SELECT TO authenticated
  USING (private.meekijkt_agent(agent_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- 3. Kerncijfers (laag B: aantallen, geen inhoud)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.support_kerncijfers(_agent_id uuid, _dagen integer DEFAULT 30)
RETURNS TABLE (
  binnen bigint,
  automatisch bigint,
  via_concept bigint,
  ongewijzigd bigint,
  mens_nodig bigint,
  open bigint,
  reactie_minuten numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH toegang AS (
    SELECT 1
    WHERE private.owns_agent(_agent_id, auth.uid()) OR private.is_staf(auth.uid())
  ),
  m AS (
    SELECT s.*
    FROM public.support_mails s, toegang
    WHERE s.agent_id = _agent_id
      AND s.ontvangen_op >= now() - make_interval(days => greatest(least(_dagen, 3650), 1))
  )
  SELECT
    count(*)::bigint,
    count(*) FILTER (WHERE status = 'verzonden' AND verzonden_door IS NULL)::bigint,
    count(*) FILTER (WHERE status = 'verzonden' AND verzonden_door IS NOT NULL)::bigint,
    -- Goedgekeurd zonder één letter te veranderen: de maat voor vertrouwen,
    -- en waar de klant naar kijkt voordat hij direct versturen aanzet.
    count(*) FILTER (
      WHERE status = 'verzonden' AND verzonden_door IS NOT NULL
        AND verzonden_tekst IS NOT DISTINCT FROM concept_tekst
    )::bigint,
    count(*) FILTER (WHERE status = 'mens_nodig')::bigint,
    count(*) FILTER (WHERE status IN ('nieuw', 'concept', 'mens_nodig', 'mislukt'))::bigint,
    round(
      (avg(extract(epoch FROM (verzonden_op - ontvangen_op)) / 60)
        FILTER (WHERE status = 'verzonden'))::numeric,
      0
    )
  FROM m
  -- Zonder toegang geen rij, in plaats van een rij met nullen.
  HAVING EXISTS (SELECT 1 FROM toegang)
$$;
REVOKE EXECUTE ON FUNCTION public.support_kerncijfers(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.support_kerncijfers(uuid, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Het nieuwe scherm mag in de schermlijst van een agent staan
-- ---------------------------------------------------------------------------

ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_modules_bekend;
ALTER TABLE public.agents
  ADD CONSTRAINT agents_modules_bekend CHECK (
    modules IS NULL
    OR modules <@ ARRAY['contacten', 'campagnes', 'berichten', 'antwoorden', 'bezorgen', 'support']::text[]
  );

-- ---------------------------------------------------------------------------
-- 5. Statuswissels in een vaste volgorde
--
--    Twee wissels op hetzelfde moment (pauzeren en direct weer aanzetten)
--    kwamen in willekeurige volgorde terug. Bij gelijke tijd telt nu de laatst
--    vastgelegde. Verder gelijk aan de versie uit fase 5.
-- ---------------------------------------------------------------------------

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
  ORDER BY g.op DESC, g.id DESC
  LIMIT 50
$$;
