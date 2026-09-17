-- De trechter: van lijst tot doos op de toonbank.
--
-- Wat Frank wil weten is niet hoeveel berichten er zijn verstuurd, maar hoeveel
-- mensen er per stap zijn overgebleven. Dat is een ander getal: één contact kan
-- twee berichten hebben, en twee berichten aan dezelfde persoon is nog steeds
-- één aangeschreven relatie.
--
-- Daarom telt alles hier contacten en geen rijen, en wordt het in de database
-- uitgerekend. Zes losse vragen vanuit het scherm zouden zes keer dezelfde
-- tabel doorlopen, en dan nog met de kans dat er onderweg iets verandert
-- waardoor de getallen onderling niet meer kloppen.

CREATE OR REPLACE FUNCTION public.outbound_trechter(_agent_id uuid)
RETURNS TABLE (
  contacten bigint,
  bereikbaar bigint,
  aangeschreven bigint,
  opgevolgd bigint,
  in_gesprek bigint,
  afspraak bigint,
  bezorgd bigint,
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
      count(*) FILTER (
        WHERE afgemeld_op IS NULL AND bounce_op IS NULL
      )::bigint AS bereikbaar,
      count(*) FILTER (WHERE afgemeld_op IS NOT NULL)::bigint AS afgemeld,
      count(*) FILTER (WHERE bounce_op IS NOT NULL)::bigint AS gebouncet
    FROM public.outbound_contacts
    WHERE agent_id = _agent_id
  ),
  m AS (
    -- Distinct op contact: twee berichten aan dezelfde persoon is één
    -- aangeschreven relatie. 'beantwoord' telt mee als verstuurd, want die
    -- status komt pas ná verzending.
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
    -- In gesprek is wie heeft teruggeschreven. Een antwoord van een adres dat
    -- we niet kennen telt niet mee: dat hoort bij niemand uit de lijst en zou
    -- de trechter vertekenen.
    SELECT count(DISTINCT contact_id)::bigint AS in_gesprek
    FROM public.outbound_replies
    WHERE agent_id = _agent_id AND contact_id IS NOT NULL
  ),
  d AS (
    SELECT
      count(DISTINCT contact_id)::bigint AS afspraak,
      count(DISTINCT contact_id) FILTER (WHERE status = 'bezorgd')::bigint AS bezorgd
    FROM public.outbound_deliveries
    WHERE agent_id = _agent_id
  )
  SELECT c.totaal, c.bereikbaar, m.aangeschreven, m.opgevolgd,
         r.in_gesprek, d.afspraak, d.bezorgd, c.afgemeld, c.gebouncet
  FROM c, m, r, d, toegang
$$;

REVOKE EXECUTE ON FUNCTION public.outbound_trechter(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.outbound_trechter(uuid) TO authenticated;
