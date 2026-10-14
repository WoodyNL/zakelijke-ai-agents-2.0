-- Gesprekken bewaren, en alles een houdbaarheidsdatum geven.
--
-- Twee gaten tegelijk, want ze horen bij elkaar.
--
-- Het eerste: de privacyverklaring belooft dat terug te zien is wat een agent
-- heeft gedaan. Voor de e-mailagent en supportmail klopt dat; voor de
-- chat-assistent niet, want daar werd niets bewaard. Een klant die hoort "jullie
-- bot zei iets geks tegen mijn klant" kon dat bij ons niet nakijken.
--
-- Het tweede: wie gaat bewaren, moet zeggen hoe lang. Zonder termijn groeit een
-- gespreksarchief tot het een risico op zichzelf is, en dan klopt de
-- privacyverklaring opnieuw niet.
--
-- De verdeling blijft zoals afgesproken: dit is inhoud van de klant, laag C.
-- De klant leest zijn gesprekken, wij niet — ook support niet, en ook de
-- beheerder niet. Wij zien dat er gesprekken zijn en hoeveel; wat erin staat is
-- van hem. Daarom staat `private.is_staf()` hieronder nergens.

-- ---------------------------------------------------------------------------
-- 1. De gesprekken zelf
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.chatgesprekken (
  -- Het id komt van de browser, zodat de losse beurten van één bezoeker aan
  -- elkaar geknoopt worden. De chat is namelijk staatloos: elke vraag is een
  -- nieuw verzoek.
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  begonnen_op timestamptz NOT NULL DEFAULT now(),
  laatste_op timestamptz NOT NULL DEFAULT now(),
  beurten integer NOT NULL DEFAULT 0,
  -- Waar op de site het gesprek begon. Het pad, zonder querystring: daar
  -- staan nog weleens namen of zoektermen in.
  pagina text,
  lead_vastgelegd boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS chatgesprekken_agent_idx
  ON public.chatgesprekken (agent_id, laatste_op DESC);

CREATE TABLE IF NOT EXISTS public.chatberichten (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  gesprek_id uuid NOT NULL REFERENCES public.chatgesprekken(id) ON DELETE CASCADE,
  rol text NOT NULL CHECK (rol IN ('bezoeker', 'agent')),
  tekst text NOT NULL,
  op timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chatberichten_gesprek_idx
  ON public.chatberichten (gesprek_id, op);

ALTER TABLE public.chatgesprekken ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatberichten ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.chatgesprekken FROM anon, authenticated;
REVOKE ALL ON public.chatberichten FROM anon, authenticated;
-- Lezen doet de klant. Verwijderen ook: het zijn zijn gegevens, en wie een
-- gesprek weg wil hebben hoort daar niemand voor nodig te hebben.
GRANT SELECT, DELETE ON public.chatgesprekken TO authenticated;
GRANT SELECT ON public.chatberichten TO authenticated;
GRANT ALL ON public.chatgesprekken TO service_role;
GRANT ALL ON public.chatberichten TO service_role;

DROP POLICY IF EXISTS chatgesprekken_eigenaar ON public.chatgesprekken;
CREATE POLICY chatgesprekken_eigenaar ON public.chatgesprekken
  FOR SELECT TO authenticated
  USING (private.owns_agent(agent_id, auth.uid()));

DROP POLICY IF EXISTS chatgesprekken_wissen ON public.chatgesprekken;
CREATE POLICY chatgesprekken_wissen ON public.chatgesprekken
  FOR DELETE TO authenticated
  USING (private.owns_agent(agent_id, auth.uid()));

DROP POLICY IF EXISTS chatberichten_eigenaar ON public.chatberichten;
CREATE POLICY chatberichten_eigenaar ON public.chatberichten
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chatgesprekken g
      WHERE g.id = chatberichten.gesprek_id
        AND private.owns_agent(g.agent_id, auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Eén beurt vastleggen
--
--    Alleen voor de server (service-role). De bezoeker mag dit niet aanroepen:
--    dan kon hij het archief van een vreemde agent vullen.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.noteer_chatbeurt(
  _agent_id uuid,
  _gesprek uuid,
  _vraag text,
  _antwoord text,
  _pagina text DEFAULT NULL,
  _lead boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  gid uuid;
BEGIN
  -- De klant mag het bewaren uitzetten. Dan gebeurt hier niets; het gesprek
  -- loopt gewoon door, er blijft alleen niets van over.
  IF coalesce(
       (SELECT (a.opties ->> 'gesprekken_bewaren')::boolean FROM public.agents a WHERE a.id = _agent_id),
       true
     ) IS NOT TRUE THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.chatgesprekken AS g (id, agent_id, pagina, beurten, lead_vastgelegd)
  VALUES (coalesce(_gesprek, gen_random_uuid()), _agent_id, left(_pagina, 300), 1, coalesce(_lead, false))
  ON CONFLICT (id) DO UPDATE
    SET laatste_op = now(),
        beurten = g.beurten + 1,
        lead_vastgelegd = g.lead_vastgelegd OR coalesce(_lead, false)
    -- Een id dat bij een andere agent hoort, raakt niets. Het id komt immers
    -- van de browser; dan hoort het ook niet meer te kunnen dan dit.
    WHERE g.agent_id = _agent_id
  RETURNING g.id INTO gid;

  IF gid IS NULL THEN
    RETURN NULL;
  END IF;

  -- Afgekapt op 4000 tekens. Een bezoeker die een boek plakt, hoort geen
  -- archief te kunnen vullen; de agent zelf blijft ruim binnen deze grens.
  INSERT INTO public.chatberichten (gesprek_id, rol, tekst)
  VALUES (gid, 'bezoeker', left(coalesce(_vraag, ''), 4000)),
         (gid, 'agent', left(coalesce(_antwoord, ''), 4000));

  RETURN gid;
END
$$;
REVOKE EXECUTE ON FUNCTION public.noteer_chatbeurt(uuid, uuid, text, text, text, boolean)
  FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.noteer_chatbeurt(uuid, uuid, text, text, text, boolean)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Hoe lang we iets bewaren
--
--    Eén getal per agent, want dat is het getal dat een klant snapt: "hoe lang
--    blijft de inhoud staan". Het geldt voor zijn gesprekken en zijn
--    supportmail. Niet voor de aantallen in agent_usage: die staan op de
--    factuur en vallen onder de fiscale bewaarplicht van zeven jaar.
--
--    Grenzen van een week en twee jaar. Korter dan een week en een klant kan
--    een klacht van afgelopen weekend niet meer nakijken; langer dan twee jaar
--    is geen bewaren meer maar verzamelen.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.bewaartermijn(_agent_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT greatest(least(
    coalesce((SELECT (a.opties ->> 'bewaartermijn_dagen')::integer FROM public.agents a WHERE a.id = _agent_id), 90),
    730), 7)
$$;
REVOKE EXECUTE ON FUNCTION private.bewaartermijn(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION private.bewaartermijn(uuid) TO authenticated, service_role;

-- Wanneer de opruimtaak voor het laatst liep. Eén regel per taak.
CREATE TABLE IF NOT EXISTS public.systeemtaken (
  naam text PRIMARY KEY,
  laatste_run timestamptz NOT NULL DEFAULT now(),
  uitkomst jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.systeemtaken ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.systeemtaken FROM anon, authenticated;
GRANT ALL ON public.systeemtaken TO service_role;

-- Alleen wie bij ons werkt mag zien of het opruimen draait. Een klant hoeft
-- onze huishouding niet te zien; hij ziet het resultaat aan zijn eigen archief.
DROP POLICY IF EXISTS systeemtaken_staf ON public.systeemtaken;
CREATE POLICY systeemtaken_staf ON public.systeemtaken
  FOR SELECT TO authenticated
  USING (private.is_staf(auth.uid()));
GRANT SELECT ON public.systeemtaken TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Het opruimen zelf
--
--    Geeft terug wat er weg is, zodat de uitkomst in de taakregel kan en wij
--    later kunnen laten zien dát het gebeurt. Dat laatste is wat een klant in
--    een beveiligingsvragenlijst vraagt: niet "hebben jullie een beleid" maar
--    "hoe weet je dat het ook uitgevoerd wordt".
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ruim_op()
RETURNS TABLE (soort text, verwijderd bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n bigint;
BEGIN
  -- Gesprekken: per agent zijn eigen termijn. De berichten gaan mee (cascade).
  WITH weg AS (
    DELETE FROM public.chatgesprekken g
    WHERE g.laatste_op < now() - make_interval(days => private.bewaartermijn(g.agent_id))
    RETURNING 1
  ) SELECT count(*) INTO n FROM weg;
  soort := 'chatgesprekken'; verwijderd := n; RETURN NEXT;

  -- Supportmail: dezelfde termijn als de gesprekken van die agent.
  WITH weg AS (
    DELETE FROM public.support_mails m
    WHERE m.ontvangen_op < now() - make_interval(days => private.bewaartermijn(m.agent_id))
    RETURNING 1
  ) SELECT count(*) INTO n FROM weg;
  soort := 'supportmails'; verwijderd := n; RETURN NEXT;

  -- Leads van een agent horen bij die klant en volgen zijn termijn. Leads
  -- zonder agent zijn aanvragen via ons eigen contactformulier; daarvoor staat
  -- twaalf maanden in onze privacyverklaring.
  WITH weg AS (
    DELETE FROM public.lead_requests l
    WHERE l.created_at < now() - make_interval(
      days => CASE WHEN l.agent_id IS NULL THEN 365 ELSE private.bewaartermijn(l.agent_id) END
    )
    RETURNING 1
  ) SELECT count(*) INTO n FROM weg;
  soort := 'aanvragen'; verwijderd := n; RETURN NEXT;

  -- De veiligheidslogs gaan níét mee met de termijn van de klant. Twee jaar,
  -- vast: een log dat de klant zelf kort kan zetten, bewijst niets meer. Het
  -- zijn bovendien handelingen, geen inhoud.
  WITH weg AS (
    DELETE FROM public.beheerlog b WHERE b.moment < now() - interval '730 days' RETURNING 1
  ) SELECT count(*) INTO n FROM weg;
  soort := 'beheerlog'; verwijderd := n; RETURN NEXT;

  WITH weg AS (
    DELETE FROM public.meekijksessies s WHERE s.gestart_op < now() - interval '730 days' RETURNING 1
  ) SELECT count(*) INTO n FROM weg;
  soort := 'meekijksessies'; verwijderd := n; RETURN NEXT;

  WITH weg AS (
    DELETE FROM public.agent_gebeurtenissen g WHERE g.op < now() - interval '730 days' RETURNING 1
  ) SELECT count(*) INTO n FROM weg;
  soort := 'gebeurtenissen'; verwijderd := n; RETURN NEXT;
END
$$;
REVOKE EXECUTE ON FUNCTION public.ruim_op() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.ruim_op() TO service_role;

-- Draait hoogstens eens per zes uur, ook als er honderd verzoeken per minuut
-- binnenkomen. De server roept dit aan en wacht er niet op; de database bepaalt
-- of het werkelijk tijd is. Dat is betrouwbaarder dan een klok in de app, want
-- er draaien meerdere instanties naast elkaar.
CREATE OR REPLACE FUNCTION public.ruim_op_indien_nodig()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  -- Niet "uitkomst": dan botst de variabele met de gelijknamige kolom van
  -- systeemtaken en weet Postgres in de UPDATE niet welke van de twee je bedoelt.
  telling jsonb;
  geclaimd boolean;
BEGIN
  INSERT INTO public.systeemtaken (naam, laatste_run)
  VALUES ('opruimen', now() - interval '7 days')
  ON CONFLICT (naam) DO NOTHING;

  -- Claimen en bijwerken in één stap: twee instanties tegelijk leveren zo
  -- precies één opruimbeurt op.
  UPDATE public.systeemtaken
  SET laatste_run = now()
  WHERE naam = 'opruimen' AND laatste_run < now() - interval '6 hours'
  RETURNING true INTO geclaimd;

  IF geclaimd IS NOT TRUE THEN
    RETURN jsonb_build_object('gedraaid', false);
  END IF;

  SELECT jsonb_object_agg(r.soort, r.verwijderd) INTO telling FROM public.ruim_op() r;
  UPDATE public.systeemtaken SET uitkomst = coalesce(telling, '{}'::jsonb) WHERE naam = 'opruimen';
  RETURN jsonb_build_object('gedraaid', true, 'verwijderd', coalesce(telling, '{}'::jsonb));
END
$$;
REVOKE EXECUTE ON FUNCTION public.ruim_op_indien_nodig() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.ruim_op_indien_nodig() TO service_role;
