-- De rem op uitgaande post.
--
-- Een verzenddomein is makkelijk kapot te maken en moeilijk te repareren.
-- Stuur honderd mails naar adressen die niet bestaan, of laat een paar mensen
-- op "dit is spam" drukken, en de mail van dat domein belandt maandenlang in
-- de map ongewenst — ook de gewone post van de klant zelf, naar zijn eigen
-- klanten. Dat is het echte risico van een e-mailagent, en het is groter dan
-- een verkeerd geformuleerde zin.
--
-- Tot nu toe deden we bij een bounce het minimum: het contact markeren zodat
-- hij niets meer krijgt. Dat beschermt die ene ontvanger, niet het domein. Wat
-- ontbrak is de rem: stoppen voordat het patroon ontstaat.
--
-- Twee remmen, allebei in te stellen per agent:
--
--   bounce_drempel    boven dit percentage onbezorgbare post gaat de agent op
--                     pauze. Standaard 3%, een gangbare grens; boven de 5%
--                     grijpen de grote providers zelf in.
--   stop_bij_klacht   één spamklacht zet de campagne stil. Standaard aan, want
--                     wie op "dit is spam" drukt is nooit de enige die het
--                     dacht.
--
-- Pas vanaf twintig verstuurde berichten. Daaronder zegt een percentage niets:
-- één bounce op drie adressen is drieëndertig procent en dat is geen patroon
-- maar een typefout in een adres.
--
-- Deze functie bestond al en gaf niets terug. Nu geeft hij terug wat er is
-- gebeurd, zodat de server de klant kan mailen en de ingeplande post bij de
-- verzender kan intrekken. Daarom eerst weg: een returntype wijzigen kan niet
-- met CREATE OR REPLACE.

DROP FUNCTION IF EXISTS public.outbound_meld_bounce(text, text);

CREATE OR REPLACE FUNCTION public.outbound_meld_bounce(_provider_id text, _reden text)
RETURNS TABLE (
  soort text,
  -- Twee aparte velden en niet één "wat er gestopt is": bij een spamklacht op
  -- een lijst die ook slecht bezorgt, gebeuren ze allebei. Eén veld zou dan
  -- liegen in de mail aan de klant.
  campagne_gestopt boolean,
  agent_gepauzeerd boolean,
  agent_id uuid,
  agent text,
  campagne_id uuid,
  campagne text,
  klant text,
  klant_email text,
  meld_email text,
  verzonden bigint,
  onbezorgbaar bigint,
  percentage numeric,
  drempel integer
)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _contact uuid;
  _agent uuid;
  _campagne uuid;
  _klacht boolean;
  _drempel integer;
  _stop_klacht boolean;
  _verzonden bigint;
  _slecht bigint;
  _pct numeric;
  _stop_campagne boolean := false;
  _pauzeer boolean := false;
  _agent_status text;
BEGIN
  SELECT m.contact_id, m.agent_id, m.campaign_id
    INTO _contact, _agent, _campagne
  FROM public.outbound_messages m
  WHERE m.provider_id = _provider_id
  LIMIT 1;

  IF _contact IS NULL THEN
    RETURN;
  END IF;

  -- Zoals voorheen: dit contact krijgt niets meer, en het bericht is mislukt.
  UPDATE public.outbound_contacts
  SET bounce_op = coalesce(bounce_op, now())
  WHERE id = _contact;

  UPDATE public.outbound_messages
  SET status = 'mislukt'::public.bericht_status,
      fout = left(coalesce(_reden, 'bounce'), 300)
  WHERE provider_id = _provider_id;

  _klacht := coalesce(_reden, '') ILIKE '%spam%';

  SELECT
    coalesce((a.opties ->> 'bounce_drempel')::integer, 3),
    coalesce((a.opties ->> 'stop_bij_klacht')::boolean, true),
    a.status
  INTO _drempel, _stop_klacht, _agent_status
  FROM public.agents a WHERE a.id = _agent;

  -- Alles wat werkelijk de deur uit is: verstuurd, beantwoord, of onderweg
  -- gestrand. Een concept telt niet mee; dat heeft nooit een ontvanger gehad.
  SELECT
    count(*) FILTER (WHERE m.verzonden_op IS NOT NULL OR m.status = 'mislukt'::public.bericht_status),
    count(*) FILTER (WHERE m.status = 'mislukt'::public.bericht_status AND m.provider_id IS NOT NULL)
  INTO _verzonden, _slecht
  FROM public.outbound_messages m
  WHERE m.agent_id = _agent;

  _pct := CASE WHEN _verzonden > 0 THEN round((_slecht::numeric * 100) / _verzonden, 1) ELSE 0 END;

  -- Een klacht stopt de campagne. Niet de hele agent: de andere campagnes van
  -- deze klant hebben er niets mee te maken, en te veel stilleggen leert hem
  -- de melding te negeren.
  IF _klacht AND _stop_klacht AND _campagne IS NOT NULL THEN
    UPDATE public.outbound_campaigns SET actief = false WHERE id = _campagne;
    _stop_campagne := true;
  END IF;

  -- Te veel onbezorgbare post stopt wél de agent. Dan is er iets mis met de
  -- lijst of met het domein, en dat raakt alles wat er nog weg moet.
  IF _verzonden >= 20 AND _pct >= _drempel AND _agent_status = 'live' THEN
    UPDATE public.agents SET status = 'paused' WHERE id = _agent;
    INSERT INTO public.agent_gebeurtenissen (agent_id, soort, van, naar, door)
    VALUES (_agent, 'status', 'live', 'paused', NULL);
    _pauzeer := true;
  END IF;

  -- Is er niets gestopt, dan is er ook niets te melden. Een klant die bij elke
  -- losse bounce een mail krijgt, leest de mail niet meer die ertoe doet.
  IF NOT _stop_campagne AND NOT _pauzeer THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    CASE WHEN _klacht THEN 'klacht' ELSE 'bounce' END,
    _stop_campagne,
    _pauzeer,
    a.id,
    a.name,
    c.id,
    c.naam,
    coalesce(nullif(p.name, ''), p.email),
    p.email,
    a.notify_email,
    _verzonden,
    _slecht,
    _pct,
    _drempel
  FROM public.agents a
  JOIN public.profiles p ON p.id = a.client_id
  LEFT JOIN public.outbound_campaigns c ON c.id = _campagne
  WHERE a.id = _agent;
END $$;

REVOKE EXECUTE ON FUNCTION public.outbound_meld_bounce(text, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.outbound_meld_bounce(text, text) TO service_role;
