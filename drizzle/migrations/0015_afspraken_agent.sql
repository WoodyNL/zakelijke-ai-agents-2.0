-- De afsprakenagent.
--
-- Herinneren, bevestigen, verzetten met één antwoord, en na een no-show
-- vriendelijk een nieuwe afspraak voorstellen. In onderzoek van Spryng onder
-- duizend Nederlanders zegt 80% dat een herinnering helpt om een afspraak niet
-- te missen, en vindt 56% kosten voor een gemiste afspraak niet terecht als er
-- geen herinnering is gestuurd.
--
-- Dit is de eerste versie zonder agendakoppeling: de afspraken komen uit een
-- lijst of worden met de hand ingevoerd. De koppeling met Google Agenda en
-- Microsoft 365 komt erbovenop — dezelfde kluis als de mailbox — en verandert
-- alleen waar de afspraken vandaan komen, niet wat de agent ermee doet.

CREATE TABLE IF NOT EXISTS public.afspraken (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  -- Het id bij de bron (straks de agenda). Bij handmatige invoer een eigen uuid.
  extern_id text NOT NULL DEFAULT gen_random_uuid()::text,
  klant_naam text,
  klant_email text NOT NULL,
  telefoon text,
  begint_op timestamptz NOT NULL,
  eindigt_op timestamptz,
  omschrijving text,
  locatie text,
  status text NOT NULL DEFAULT 'gepland' CHECK (status IN (
    'gepland',          -- staat, nog niet bevestigd
    'bevestigd',        -- de klant antwoordde ja
    'verzet_gevraagd',  -- de klant wil een ander moment; een mens plant om
    'geannuleerd',
    'no_show',
    'afgerond'
  )),
  -- Welke herinneringen (uren vooraf) al zijn verstuurd: [48, 2].
  herinnerd jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(herinnerd) = 'array'),
  bevestigd_op timestamptz,
  reactie_op timestamptz,
  laatste_reactie text,
  no_show_opgevolgd_op timestamptz,
  bron text NOT NULL DEFAULT 'handmatig' CHECK (bron IN ('handmatig', 'bestand', 'agenda')),
  aangemaakt_op timestamptz NOT NULL DEFAULT now(),
  bijgewerkt_op timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, extern_id)
);
CREATE INDEX IF NOT EXISTS afspraken_agent_begint_idx ON public.afspraken (agent_id, begint_op);
CREATE INDEX IF NOT EXISTS afspraken_agent_status_idx ON public.afspraken (agent_id, status);

CREATE TABLE IF NOT EXISTS public.afspraak_wachtlijst (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  naam text,
  email text NOT NULL,
  telefoon text,
  voorkeur text,
  status text NOT NULL DEFAULT 'wacht' CHECK (status IN ('wacht', 'aangeboden', 'geplaatst', 'vervallen')),
  aangeboden_op timestamptz,
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS afspraak_wachtlijst_agent_idx ON public.afspraak_wachtlijst (agent_id, status, aangemaakt_op);

ALTER TABLE public.afspraken ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afspraak_wachtlijst ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.afspraken FROM anon;
REVOKE ALL ON public.afspraak_wachtlijst FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.afspraken TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.afspraak_wachtlijst TO authenticated;
GRANT ALL ON public.afspraken TO service_role;
GRANT ALL ON public.afspraak_wachtlijst TO service_role;

DROP POLICY IF EXISTS afspraken_eigenaar ON public.afspraken;
CREATE POLICY afspraken_eigenaar ON public.afspraken FOR ALL TO authenticated
  USING (private.owns_agent(agent_id, auth.uid())) WITH CHECK (private.owns_agent(agent_id, auth.uid()));
DROP POLICY IF EXISTS afspraken_meekijken ON public.afspraken;
CREATE POLICY afspraken_meekijken ON public.afspraken FOR SELECT TO authenticated
  USING (private.meekijkt_agent(agent_id, auth.uid()));
DROP POLICY IF EXISTS afspraak_wachtlijst_eigenaar ON public.afspraak_wachtlijst;
CREATE POLICY afspraak_wachtlijst_eigenaar ON public.afspraak_wachtlijst FOR ALL TO authenticated
  USING (private.owns_agent(agent_id, auth.uid())) WITH CHECK (private.owns_agent(agent_id, auth.uid()));
DROP POLICY IF EXISTS afspraak_wachtlijst_meekijken ON public.afspraak_wachtlijst;
CREATE POLICY afspraak_wachtlijst_meekijken ON public.afspraak_wachtlijst FOR SELECT TO authenticated
  USING (private.meekijkt_agent(agent_id, auth.uid()));

-- Het dashboard: het getal dat omlaag moet is de no-show.
CREATE OR REPLACE FUNCTION public.afspraken_kerncijfers(_agent_id uuid, _dagen integer DEFAULT 30)
RETURNS TABLE (
  afspraken bigint,
  bevestigd bigint,
  verzet bigint,
  no_shows bigint,
  afgerond bigint,
  komende_week bigint,
  wachtlijst bigint,
  no_show_percentage numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH toegang AS (
    SELECT 1 WHERE private.owns_agent(_agent_id, auth.uid()) OR private.is_staf(auth.uid())
  ),
  vanaf AS (SELECT now() - make_interval(days => greatest(least(coalesce(_dagen, 30), 3650), 1)) AS t),
  r AS (SELECT a.* FROM public.afspraken a, vanaf WHERE a.agent_id = _agent_id AND a.begint_op >= vanaf.t AND a.begint_op <= now()),
  voorbij AS (SELECT count(*) AS n FROM r WHERE status IN ('afgerond', 'no_show', 'bevestigd'))
  SELECT
    (SELECT count(*) FROM r),
    (SELECT count(*) FROM r WHERE bevestigd_op IS NOT NULL),
    (SELECT count(*) FROM r WHERE status = 'verzet_gevraagd'),
    (SELECT count(*) FROM r WHERE status = 'no_show'),
    (SELECT count(*) FROM r WHERE status = 'afgerond'),
    (SELECT count(*) FROM public.afspraken a WHERE a.agent_id = _agent_id AND a.begint_op > now() AND a.begint_op < now() + interval '7 days' AND a.status IN ('gepland', 'bevestigd')),
    (SELECT count(*) FROM public.afspraak_wachtlijst w WHERE w.agent_id = _agent_id AND w.status = 'wacht'),
    (SELECT CASE WHEN (SELECT n FROM voorbij) > 0 THEN round(100.0 * (SELECT count(*) FROM r WHERE status = 'no_show') / (SELECT n FROM voorbij), 0) ELSE NULL END)
  FROM toegang
$$;
REVOKE EXECUTE ON FUNCTION public.afspraken_kerncijfers(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.afspraken_kerncijfers(uuid, integer) TO authenticated;
