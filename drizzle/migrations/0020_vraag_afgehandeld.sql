-- Een vraag die in de kennisbank is gezet, komt niet terug.
--
-- Gemeld door Lovable op 20 oktober 2026: op het gesprekkenscherm verdween een
-- vraag na "In de kennisbank zetten", maar stond er na een herlaadbeurt weer.
-- De eigenaar denkt dan dat het opslaan is mislukt, klikt nog eens, en houdt
-- twee kennisitems over met dezelfde vraag. Dat is erger dan het ongemak: de
-- agent weet dan niet welke van de twee klopt.
--
-- De oorzaak is dat opslaan alleen een kennisitem aanmaakte. Het chatbericht
-- bleef gewoon als onbeantwoord gemarkeerd, en dat is waar de lijst op kijkt.
--
-- Waarom geen `onbeantwoord = false`: dat veld telt mee in het dagrapport, dat
-- over een periode terugkijkt hoeveel vragen de agent niet kon beantwoorden.
-- Dat is een historisch feit en blijft waar, ook nadat iemand het heeft
-- opgelost. Vandaar een eigen kolom voor "hier is iets mee gedaan".

ALTER TABLE public.chatberichten
  ADD COLUMN IF NOT EXISTS kennis_gemaakt_op timestamptz;

-- Het returntype verandert (bericht_id erbij), dus eerst droppen.
DROP FUNCTION public.onbeantwoorde_vragen(uuid, integer);

-- De lijst laat voortaan weg wat al is afgehandeld, en geeft het id van het
-- bericht mee zodat het scherm weet wat het moet markeren.
CREATE FUNCTION public.onbeantwoorde_vragen(_agent_id uuid, _limiet integer DEFAULT 50)
RETURNS TABLE (bericht_id bigint, gesprek_id uuid, vraag text, antwoord text, op timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, g.id, v.tekst, a.tekst, a.op
  FROM public.chatberichten a
  JOIN public.chatgesprekken g ON g.id = a.gesprek_id
  JOIN LATERAL (
    SELECT b.tekst FROM public.chatberichten b
    WHERE b.gesprek_id = a.gesprek_id AND b.rol = 'bezoeker' AND b.id < a.id
    ORDER BY b.id DESC LIMIT 1
  ) v ON true
  WHERE g.agent_id = _agent_id
    AND a.rol = 'agent' AND a.onbeantwoord
    AND a.kennis_gemaakt_op IS NULL
    AND private.owns_agent(_agent_id, auth.uid())
  ORDER BY a.op DESC
  LIMIT greatest(least(coalesce(_limiet, 50), 500), 1)
$$;
REVOKE EXECUTE ON FUNCTION public.onbeantwoorde_vragen(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.onbeantwoorde_vragen(uuid, integer) TO authenticated;

-- Afhandelen mag alleen de eigenaar van de agent, en alleen voor een bericht
-- dat werkelijk bij die agent hoort.
CREATE OR REPLACE FUNCTION public.markeer_vraag_afgehandeld(_bericht_id bigint)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _agent uuid;
BEGIN
  SELECT g.agent_id INTO _agent
  FROM public.chatberichten b
  JOIN public.chatgesprekken g ON g.id = b.gesprek_id
  WHERE b.id = _bericht_id;

  IF _agent IS NULL THEN RETURN false; END IF;
  IF NOT private.owns_agent(_agent, auth.uid()) THEN RETURN false; END IF;

  UPDATE public.chatberichten
  SET kennis_gemaakt_op = now()
  WHERE id = _bericht_id AND kennis_gemaakt_op IS NULL;

  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.markeer_vraag_afgehandeld(bigint) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.markeer_vraag_afgehandeld(bigint) TO authenticated;