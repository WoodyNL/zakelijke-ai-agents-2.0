-- Fase 4 van het beheerplan: kerncijfers per agent, en een waarschuwing vóór
-- iemand over zijn fair use gaat.
--
-- De site belooft: "Boven de grens? Dan waarschuwen we vooraf, niet pas op de
-- factuur." Tot nu toe was er alleen een balk op het dashboard, en die ziet
-- alleen wie toevallig inlogt.

-- ---------------------------------------------------------------------------
-- 1. Kerncijfers per agent
--
--    Laag B: aantallen, geen inhoud. Gesprekken zijn de facturabele verzoeken,
--    dezelfde teller als de maandstand, zodat het dashboard en de factuur
--    nooit iets anders zeggen.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.agent_kerncijfers(_agent_id uuid, _dagen integer DEFAULT 30)
RETURNS TABLE (gesprekken bigint, leads bigint, laatste_activiteit timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH toegang AS (
    SELECT 1
    WHERE private.owns_agent(_agent_id, auth.uid())
       OR private.has_role(auth.uid(), 'admin'::app_role)
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
REVOKE EXECUTE ON FUNCTION public.agent_kerncijfers(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.agent_kerncijfers(uuid, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Fair-use-meldingen
--
--    Bij 80% en bij 100% van de fair use, één keer per maand per drempel. De
--    tabel is het geheugen: een melding die er al staat, gaat niet nog eens.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fair_use_meldingen (
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  maand date NOT NULL,
  drempel integer NOT NULL CHECK (drempel IN (80, 100)),
  gebruikt bigint NOT NULL,
  grens integer NOT NULL,
  gemeld_op timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, maand, drempel)
);

ALTER TABLE public.fair_use_meldingen ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fair_use_meldingen FROM anon, authenticated;
GRANT SELECT ON public.fair_use_meldingen TO authenticated;
GRANT ALL ON public.fair_use_meldingen TO service_role;

DROP POLICY IF EXISTS fair_use_meldingen_lezen ON public.fair_use_meldingen;
CREATE POLICY fair_use_meldingen_lezen ON public.fair_use_meldingen
  FOR SELECT TO authenticated
  USING (
    private.owns_agent(agent_id, auth.uid())
    OR private.has_role(auth.uid(), 'admin'::app_role)
  );

-- Wordt na elk geteld gesprek aangeroepen, door de server. Geeft alleen de
-- drempels terug die dit gesprek voor het eerst overschreed, met wat er nodig
-- is om de mail te schrijven. De INSERT ... ON CONFLICT DO NOTHING maakt het
-- veilig als twee gesprekken tegelijk over de grens gaan: er komt één mail.
CREATE OR REPLACE FUNCTION public.fair_use_melding(_agent_id uuid)
RETURNS TABLE (
  drempel integer,
  gebruikt bigint,
  grens integer,
  agent text,
  klant text,
  klant_email text,
  meld_email text
)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  WITH a AS (
    SELECT ag.id, ag.name, ag.fair_use_per_month AS grens, ag.notify_email,
           p.email AS klant_email, coalesce(nullif(p.name, ''), p.email) AS klant
    FROM public.agents ag
    JOIN public.profiles p ON p.id = ag.client_id
    WHERE ag.id = _agent_id AND ag.fair_use_per_month IS NOT NULL AND ag.fair_use_per_month > 0
  ),
  periode AS (
    SELECT date_trunc('month', (now() AT TIME ZONE 'Europe/Amsterdam')) AS start
  ),
  verbruik AS (
    SELECT coalesce(sum(u.billable_requests), 0)::bigint AS gebruikt
    FROM public.agent_usage u, periode p
    WHERE u.agent_id = _agent_id
      AND (u.hour AT TIME ZONE 'Europe/Amsterdam') >= p.start
      AND (u.hour AT TIME ZONE 'Europe/Amsterdam') < p.start + interval '1 month'
  ),
  nieuw AS (
    INSERT INTO public.fair_use_meldingen (agent_id, maand, drempel, gebruikt, grens)
    SELECT a.id, (SELECT start::date FROM periode), d.drempel, v.gebruikt, a.grens
    FROM a, verbruik v, (VALUES (80), (100)) AS d(drempel)
    WHERE v.gebruikt * 100 >= a.grens::bigint * d.drempel
    ON CONFLICT DO NOTHING
    RETURNING drempel, gebruikt, grens
  )
  SELECT n.drempel, n.gebruikt, n.grens, a.name, a.klant, a.klant_email, a.notify_email
  FROM nieuw n, a
  ORDER BY n.drempel
$$;
REVOKE EXECUTE ON FUNCTION public.fair_use_melding(uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.fair_use_melding(uuid) TO service_role;
