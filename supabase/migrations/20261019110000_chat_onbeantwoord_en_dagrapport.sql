-- Twee kleine dingen die bestaande agents operationeel maken.
--
-- 1. De chat-assistent telt wat hij niet wist. Elke beurt waarin hij moest
--    zeggen "dat weet ik niet" wordt gemarkeerd, zodat de klant een lijst
--    ziet van vragen die in zijn kennisbank ontbreken — en ze met één klik
--    toevoegt. Dat is de goedkoopste manier om een assistent beter te maken.
--
-- 2. Het dagrapport: één regel per agent per dag, zodat een mail nooit twee
--    keer gaat, ook niet als twee instanties tegelijk een ronde lopen.

ALTER TABLE public.chatberichten
  ADD COLUMN IF NOT EXISTS onbeantwoord boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS chatberichten_onbeantwoord_idx
  ON public.chatberichten (gesprek_id) WHERE onbeantwoord;

-- Nieuwe parameter, dus de oude handtekening eerst weg (anders ontstaat er
-- een tweede functie naast de eerste).
DROP FUNCTION IF EXISTS public.noteer_chatbeurt(uuid, uuid, text, text, text, boolean);

CREATE OR REPLACE FUNCTION public.noteer_chatbeurt(
  _agent_id uuid,
  _gesprek uuid,
  _vraag text,
  _antwoord text,
  _pagina text DEFAULT NULL,
  _lead boolean DEFAULT false,
  _onbeantwoord boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  gid uuid;
BEGIN
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
    WHERE g.agent_id = _agent_id
  RETURNING g.id INTO gid;

  IF gid IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.chatberichten (gesprek_id, rol, tekst, onbeantwoord)
  VALUES (gid, 'bezoeker', left(coalesce(_vraag, ''), 4000), false),
         (gid, 'agent', left(coalesce(_antwoord, ''), 4000), coalesce(_onbeantwoord, false));

  RETURN gid;
END
$$;
REVOKE EXECUTE ON FUNCTION public.noteer_chatbeurt(uuid, uuid, text, text, text, boolean, boolean)
  FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.noteer_chatbeurt(uuid, uuid, text, text, text, boolean, boolean)
  TO service_role;

-- De onbeantwoorde vragen van een agent: de vraag van de bezoeker die
-- voorafging aan een antwoord dat "weet ik niet" was. Alleen voor de eigenaar.
CREATE OR REPLACE FUNCTION public.onbeantwoorde_vragen(_agent_id uuid, _limiet integer DEFAULT 50)
RETURNS TABLE (gesprek_id uuid, vraag text, antwoord text, op timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, v.tekst, a.tekst, a.op
  FROM public.chatberichten a
  JOIN public.chatgesprekken g ON g.id = a.gesprek_id
  JOIN LATERAL (
    SELECT b.tekst FROM public.chatberichten b
    WHERE b.gesprek_id = a.gesprek_id AND b.rol = 'bezoeker' AND b.id < a.id
    ORDER BY b.id DESC LIMIT 1
  ) v ON true
  WHERE g.agent_id = _agent_id
    AND a.rol = 'agent' AND a.onbeantwoord
    AND private.owns_agent(_agent_id, auth.uid())
  ORDER BY a.op DESC
  LIMIT greatest(least(coalesce(_limiet, 50), 500), 1)
$$;
REVOKE EXECUTE ON FUNCTION public.onbeantwoorde_vragen(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.onbeantwoorde_vragen(uuid, integer) TO authenticated;

CREATE TABLE IF NOT EXISTS public.dagrapporten (
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  datum date NOT NULL,
  verstuurd_op timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, datum)
);
ALTER TABLE public.dagrapporten ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dagrapporten FROM anon, authenticated;
GRANT ALL ON public.dagrapporten TO service_role;
