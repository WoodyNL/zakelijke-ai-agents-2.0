-- Navragen na de bezorging, en wat er daarna met een mens gebeurt.
--
-- Dit is het station waar het geld zit. Iemand die een proefpakket heeft
-- geproefd en tevreden is, staat het dichtst bij klant worden van iedereen in
-- de lijst — maar alleen als er iemand belt of langsgaat. Een mail die probeert
-- af te sluiten verspilt precies dat moment.
--
-- Daarom doet de agent hier één ding: vragen hoe het bevallen is en aanbieden
-- om te bellen. Wat daarna volgt is mensenwerk, en dat moet worden bijgehouden,
-- anders verdwijnt een warme klant tussen de andere honderd.

ALTER TABLE public.outbound_campaigns
  ADD COLUMN IF NOT EXISTS navraag_na_dagen integer NOT NULL DEFAULT 7
    CHECK (navraag_na_dagen BETWEEN 1 AND 60);

-- ---------------------------------------------------------------------------
-- Wat er na de bezorging gebeurt
--
--    Aan de bezorging en niet aan het contact: het gaat om de opvolging van
--    dít pakket. Krijgt iemand over een jaar een tweede proefpakket, dan is dat
--    een nieuw gesprek met een eigen afloop.
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.opvolging_stand AS ENUM (
    'open',           -- pakket bezorgd, nog niets mee gedaan
    'navraag_uit',    -- de agent heeft gevraagd hoe het was
    'wil_gesprek',    -- heeft geantwoord en staat open voor contact
    'gebeld',
    'bezocht',
    'klant',          -- waar het allemaal om begonnen was
    'geen_interesse'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.outbound_deliveries
  ADD COLUMN IF NOT EXISTS opvolging public.opvolging_stand NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS opvolging_notitie text,
  ADD COLUMN IF NOT EXISTS opvolging_op timestamptz;

CREATE INDEX IF NOT EXISTS outbound_deliveries_opvolging
  ON public.outbound_deliveries (agent_id, opvolging);

-- ---------------------------------------------------------------------------
-- De trechter loopt door tot klant
--
--    Bezorgd was het eindpunt, en dat was te vroeg. Een bezorgd pakket is geen
--    resultaat; een klant wel. De twee stappen die erbij komen zijn allebei
--    mensenwerk, en juist daarom horen ze op het dashboard: wat niemand meet,
--    doet niemand.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.outbound_trechter(_agent_id uuid)
RETURNS TABLE (
  contacten bigint,
  bereikbaar bigint,
  aangeschreven bigint,
  opgevolgd bigint,
  in_gesprek bigint,
  afspraak bigint,
  bezorgd bigint,
  gesproken bigint,
  klant bigint,
  afgemeld bigint,
  gebouncet bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH toegang AS (
    SELECT 1
    WHERE private.owns_agent(_agent_id, auth.uid())
       OR private.has_role(auth.uid(), 'admin'::app_role)
  ),
  c AS (
    SELECT
      count(*)::bigint AS totaal,
      count(*) FILTER (WHERE afgemeld_op IS NULL AND bounce_op IS NULL)::bigint AS bereikbaar,
      count(*) FILTER (WHERE afgemeld_op IS NOT NULL)::bigint AS afgemeld,
      count(*) FILTER (WHERE bounce_op IS NOT NULL)::bigint AS gebouncet
    FROM public.outbound_contacts
    WHERE agent_id = _agent_id
  ),
  m AS (
    SELECT
      count(DISTINCT contact_id) FILTER (
        WHERE stap = 1 AND status IN ('verzonden', 'beantwoord')
      )::bigint AS aangeschreven,
      count(DISTINCT contact_id) FILTER (
        WHERE stap = 2 AND status IN ('verzonden', 'beantwoord')
      )::bigint AS opgevolgd
    FROM public.outbound_messages
    WHERE agent_id = _agent_id
  ),
  r AS (
    SELECT count(DISTINCT contact_id)::bigint AS in_gesprek
    FROM public.outbound_replies
    WHERE agent_id = _agent_id AND contact_id IS NOT NULL
  ),
  d AS (
    SELECT
      count(DISTINCT contact_id)::bigint AS afspraak,
      count(DISTINCT contact_id) FILTER (WHERE status = 'bezorgd')::bigint AS bezorgd,
      -- Gesproken telt ook wie daarna klant werd: iemand die klant is, is
      -- onderweg gesproken. Een trechter waarin een latere stap groter is dan
      -- een eerdere, klopt niet.
      count(DISTINCT contact_id) FILTER (
        WHERE opvolging IN ('gebeld', 'bezocht', 'klant')
      )::bigint AS gesproken,
      count(DISTINCT contact_id) FILTER (WHERE opvolging = 'klant')::bigint AS klant
    FROM public.outbound_deliveries
    WHERE agent_id = _agent_id
  )
  SELECT c.totaal, c.bereikbaar, m.aangeschreven, m.opgevolgd, r.in_gesprek,
         d.afspraak, d.bezorgd, d.gesproken, d.klant, c.afgemeld, c.gebouncet
  FROM c, m, r, d, toegang
$$;

REVOKE EXECUTE ON FUNCTION public.outbound_trechter(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.outbound_trechter(uuid) TO authenticated;
