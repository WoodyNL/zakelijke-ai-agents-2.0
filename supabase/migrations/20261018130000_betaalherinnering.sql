-- De betaalherinnering-agent.
--
-- Het hardste getal uit de Exact MKB Barometer 2026: 15% van de facturen wordt
-- te laat betaald, 3% nooit, en twee op de drie mkb-bedrijven lopen daardoor
-- gemiddeld € 20.000 per jaar mis. De reden is zelden de factuur en bijna
-- altijd de opvolging die niemand doet. Dat is wat deze agent wél doet.
--
-- Twee tabellen: de facturen zoals de klant ze aanlevert (bestand of met de
-- hand), en een log van elke herinnering die de deur uit ging. Dat log is er
-- niet voor de volledigheid: "betaald binnen zeven dagen na een herinnering"
-- is het cijfer waarop deze agent wordt beoordeeld, en dat kun je alleen
-- uitrekenen als je weet wannéér er herinnerd is.
--
-- Wat hier bewust niet in zit: een betaalstatus uit een boekhoudpakket. Zonder
-- koppeling weet de agent alleen wat de klant hem vertelt. Daarom staat er een
-- harde rem in de server: zonder actuele status gaan de latere stappen niet
-- vanzelf. Een herinnering voor een factuur die al betaald is, is de snelste
-- manier om het vertrouwen in een agent kwijt te raken.

CREATE TABLE IF NOT EXISTS public.facturen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  nummer text NOT NULL,
  klant_naam text,
  klant_email text NOT NULL,
  bedrag numeric(12,2) NOT NULL CHECK (bedrag >= 0),
  factuurdatum date NOT NULL,
  vervaldatum date NOT NULL,
  betaald_op date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',        -- de reeks loopt
    'betaald',
    'gepauzeerd',  -- de klant heeft een afspraak gemaakt; de agent wacht
    'uit_handen'   -- de ondernemer neemt het zelf over; de agent stopt
  )),
  -- Hoeveel herinneringen er zijn verstuurd; wijst naar de volgende stap in de
  -- reeks die de klant instelde.
  laatste_stap integer NOT NULL DEFAULT 0 CHECK (laatste_stap >= 0),
  laatste_herinnering_op timestamptz,
  pauze_tot date,
  -- Als de debiteur antwoordt op een herinnering: wanneer, en wat (kort).
  reactie_op timestamptz,
  laatste_reactie text,
  bron text NOT NULL DEFAULT 'bestand' CHECK (bron IN ('bestand', 'handmatig', 'koppeling')),
  notitie text,
  aangemaakt_op timestamptz NOT NULL DEFAULT now(),
  bijgewerkt_op timestamptz NOT NULL DEFAULT now(),
  -- Eén factuurnummer per agent. Een lijst die opnieuw wordt aangeleverd mag
  -- geen tweede reeks starten voor dezelfde factuur.
  UNIQUE (agent_id, nummer)
);

CREATE INDEX IF NOT EXISTS facturen_agent_status_idx ON public.facturen (agent_id, status, vervaldatum);

CREATE TABLE IF NOT EXISTS public.factuur_herinneringen (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  factuur_id uuid NOT NULL REFERENCES public.facturen(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  stap integer NOT NULL,
  -- Het moment uit de reeks, in dagen ten opzichte van de vervaldatum.
  moment integer NOT NULL,
  verstuurd_op timestamptz NOT NULL DEFAULT now(),
  provider_id text,
  onderwerp text,
  tekst text
);

CREATE INDEX IF NOT EXISTS factuur_herinneringen_factuur_idx ON public.factuur_herinneringen (factuur_id, verstuurd_op DESC);
CREATE INDEX IF NOT EXISTS factuur_herinneringen_agent_idx ON public.factuur_herinneringen (agent_id, verstuurd_op DESC);

ALTER TABLE public.facturen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factuur_herinneringen ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.facturen FROM anon;
REVOKE ALL ON public.factuur_herinneringen FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facturen TO authenticated;
GRANT SELECT ON public.factuur_herinneringen TO authenticated;
GRANT ALL ON public.facturen TO service_role;
GRANT ALL ON public.factuur_herinneringen TO service_role;

-- Inhoud van de klant (wie hem wat schuldig is): laag C.
DROP POLICY IF EXISTS facturen_eigenaar ON public.facturen;
CREATE POLICY facturen_eigenaar ON public.facturen
  FOR ALL TO authenticated
  USING (private.owns_agent(agent_id, auth.uid()))
  WITH CHECK (private.owns_agent(agent_id, auth.uid()));
DROP POLICY IF EXISTS facturen_meekijken ON public.facturen;
CREATE POLICY facturen_meekijken ON public.facturen
  FOR SELECT TO authenticated
  USING (private.meekijkt_agent(agent_id, auth.uid()));

DROP POLICY IF EXISTS factuur_herinneringen_lezen ON public.factuur_herinneringen;
CREATE POLICY factuur_herinneringen_lezen ON public.factuur_herinneringen
  FOR SELECT TO authenticated
  USING (private.owns_agent(agent_id, auth.uid()) OR private.meekijkt_agent(agent_id, auth.uid()));

-- Aantallen en bedragen voor het dashboard. Geen namen, geen nummers: wij
-- mogen dit ook zien, en dat is bewust — "hoeveel staat er open" is status.
CREATE OR REPLACE FUNCTION public.facturen_kerncijfers(_agent_id uuid, _dagen integer DEFAULT 30)
RETURNS TABLE (
  open_aantal bigint,
  open_bedrag numeric,
  over_termijn_aantal bigint,
  over_termijn_bedrag numeric,
  herinnerd bigint,
  betaald bigint,
  betaald_na_herinnering bigint,
  betaaltermijn_dagen numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH toegang AS (
    SELECT 1 WHERE private.owns_agent(_agent_id, auth.uid()) OR private.is_staf(auth.uid())
  ),
  vanaf AS (
    SELECT now() - make_interval(days => greatest(least(coalesce(_dagen, 30), 3650), 1)) AS t
  ),
  betaald_recent AS (
    SELECT f.* FROM public.facturen f, vanaf
    WHERE f.agent_id = _agent_id AND f.status = 'betaald' AND f.betaald_op IS NOT NULL
      AND f.betaald_op >= vanaf.t::date
  )
  SELECT
    (SELECT count(*) FROM public.facturen f WHERE f.agent_id = _agent_id AND f.status IN ('open', 'gepauzeerd')),
    (SELECT coalesce(sum(bedrag), 0) FROM public.facturen f WHERE f.agent_id = _agent_id AND f.status IN ('open', 'gepauzeerd')),
    (SELECT count(*) FROM public.facturen f WHERE f.agent_id = _agent_id AND f.status IN ('open', 'gepauzeerd') AND f.vervaldatum < current_date),
    (SELECT coalesce(sum(bedrag), 0) FROM public.facturen f WHERE f.agent_id = _agent_id AND f.status IN ('open', 'gepauzeerd') AND f.vervaldatum < current_date),
    (SELECT count(*) FROM public.factuur_herinneringen h, vanaf WHERE h.agent_id = _agent_id AND h.verstuurd_op >= vanaf.t),
    (SELECT count(*) FROM betaald_recent),
    -- Betaald binnen zeven dagen nadat er herinnerd was: het cijfer van deze agent.
    (SELECT count(*) FROM betaald_recent b
      WHERE b.laatste_herinnering_op IS NOT NULL
        AND b.betaald_op >= b.laatste_herinnering_op::date
        AND b.betaald_op <= b.laatste_herinnering_op::date + 7),
    (SELECT round(avg(b.betaald_op - b.factuurdatum)::numeric, 0) FROM betaald_recent b)
  FROM toegang
$$;
REVOKE EXECUTE ON FUNCTION public.facturen_kerncijfers(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.facturen_kerncijfers(uuid, integer) TO authenticated;
