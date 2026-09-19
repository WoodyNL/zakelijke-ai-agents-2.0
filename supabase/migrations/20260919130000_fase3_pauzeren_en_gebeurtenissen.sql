-- Fase 3 van het beheerplan: de klant kan zijn eigen agent stilzetten, en elke
-- statuswissel wordt vastgelegd.
--
-- Controle is waar de klant voor betaalt. Een agent die iets doet waar je niet
-- achter staat, moet je zelf kunnen stoppen, zonder eerst te mailen en te
-- wachten. En achteraf wil je kunnen zien wie hem wanneer stilzette.

-- ---------------------------------------------------------------------------
-- 1. Gebeurtenissen per agent
--
--    Nu alleen statuswissels. De tabel is algemeen gehouden, zodat er later
--    meer in kan (een gewijzigde instelling, een verlopen koppeling) zonder
--    nieuwe tabel.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agent_gebeurtenissen (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  soort text NOT NULL CHECK (soort IN ('status')),
  van text,
  naar text,
  door uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  op timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_gebeurtenissen_agent_idx
  ON public.agent_gebeurtenissen (agent_id, op DESC);

ALTER TABLE public.agent_gebeurtenissen ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agent_gebeurtenissen FROM anon, authenticated;
GRANT SELECT ON public.agent_gebeurtenissen TO authenticated;
GRANT ALL ON public.agent_gebeurtenissen TO service_role;

-- Dit is laag A: wat er met de agent gebeurde, niet wat hij las of schreef.
DROP POLICY IF EXISTS agent_gebeurtenissen_lezen ON public.agent_gebeurtenissen;
CREATE POLICY agent_gebeurtenissen_lezen ON public.agent_gebeurtenissen
  FOR SELECT TO authenticated
  USING (
    private.owns_agent(agent_id, auth.uid())
    OR private.has_role(auth.uid(), 'admin'::app_role)
  );

-- Een trigger en geen aanroep in de app: dan wordt ook een wissel vanuit
-- /admin, of een die iemand ooit met de hand doet, vastgelegd.
CREATE OR REPLACE FUNCTION private.leg_statuswissel_vast()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.agent_gebeurtenissen (agent_id, soort, van, naar, door)
  VALUES (NEW.id, 'status', OLD.status::text, NEW.status::text, auth.uid());
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS agents_statuswissel ON public.agents;
CREATE TRIGGER agents_statuswissel
  AFTER UPDATE OF status ON public.agents
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION private.leg_statuswissel_vast();

-- Met naam erbij. Via een functie, omdat een klant het profiel van de
-- beheerder niet mag lezen; voor hem heet dat "Zakelijke AI Agents".
CREATE OR REPLACE FUNCTION public.agent_gebeurtenissen_van(_agent_id uuid)
RETURNS TABLE (id bigint, soort text, van text, naar text, door text, op timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    g.id, g.soort, g.van, g.naar,
    CASE
      WHEN g.door IS NULL THEN 'Automatisch'
      WHEN private.has_role(g.door, 'admin'::app_role) THEN 'Zakelijke AI Agents'
      ELSE coalesce(nullif(p.name, ''), p.email, 'Onbekend')
    END,
    g.op
  FROM public.agent_gebeurtenissen g
  LEFT JOIN public.profiles p ON p.id = g.door
  WHERE g.agent_id = _agent_id
    AND (
      private.owns_agent(_agent_id, auth.uid())
      OR private.has_role(auth.uid(), 'admin'::app_role)
    )
  ORDER BY g.op DESC
  LIMIT 50
$$;
REVOKE EXECUTE ON FUNCTION public.agent_gebeurtenissen_van(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.agent_gebeurtenissen_van(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Pauzeren en hervatten door de klant
--
--    Alleen tussen live en gepauzeerd. Een agent die nog wordt ingericht zet
--    de klant niet zelf live: dat is het moment waarop wij hebben gecontroleerd
--    dat hij klaar is.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.zet_agent_pauze(_agent_id uuid, _pauze boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  huidig public.agent_status;
  nieuw public.agent_status;
BEGIN
  IF NOT private.owns_agent(_agent_id, auth.uid()) THEN
    RAISE EXCEPTION 'Deze agent bestaat niet, of is niet van jou.';
  END IF;

  SELECT status INTO huidig FROM public.agents WHERE id = _agent_id FOR UPDATE;
  IF huidig = 'setup' THEN
    RAISE EXCEPTION 'Deze agent wordt nog ingericht. Hij gaat live zodra wij hem hebben gecontroleerd.';
  END IF;

  nieuw := CASE WHEN _pauze THEN 'paused'::public.agent_status ELSE 'live'::public.agent_status END;
  IF huidig <> nieuw THEN
    UPDATE public.agents SET status = nieuw WHERE id = _agent_id;
  END IF;
  RETURN nieuw::text;
END
$$;
REVOKE EXECUTE ON FUNCTION public.zet_agent_pauze(uuid, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.zet_agent_pauze(uuid, boolean) TO authenticated;
