-- Een mailbox koppelen aan de inbox-assistent.
--
-- Tot nu toe liep supportmail via doorsturen: de klant zet in zijn mailbox een
-- regel die alles naar ons adres stuurt. Dat werkt, maar het heeft twee
-- nadelen die klanten ook noemen. Het concept staat in óns portaal in plaats
-- van in hun eigen Postvak IN, en het antwoord vertrekt vanaf ons adres in
-- plaats van vanuit hun eigen mailbox, dus het valt buiten hun eigen archief.
--
-- Een koppeling lost allebei op: wij lezen de mail in hun mailbox, zetten het
-- concept daar klaar als échte conceptmail in hetzelfde gesprek, en versturen
-- vanuit hun adres. De klant werkt gewoon in Gmail of Outlook en ziet ons
-- alleen aan het concept dat er al staat.
--
-- Dat vraagt om toegang tot de mailbox van iemand anders. Daar hoort deze
-- opzet bij:
--
--   De sleutels staan in het private schema. Dat schema is niet bereikbaar via
--   de REST-API van Supabase, dus zelfs een lek van de publieke sleutel geeft
--   er geen toegang toe. Alleen de functies hieronder komen erbij.
--
--   De sleutels zijn bovendien versleuteld voordat ze hier binnenkomen. De
--   server doet dat met een sleutel die alleen in de omgeving staat. Wie de
--   database heeft, heeft dus nog steeds geen mailbox.
--
--   De klant ziet zijn koppeling wel (welk adres, welke map, wanneer voor het
--   laatst gekeken) en kan hem zelf verbreken. Dat laatste is belangrijker dan
--   het lijkt: toegang die je niet zelf kunt intrekken, is geen toegang die je
--   hebt gegeven.
--
--   Wij zien in het beheer dát er een koppeling is, niet wat erin zit. Het is
--   laag A: status, geen inhoud.

CREATE TABLE IF NOT EXISTS public.postvak_koppelingen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Eén koppeling per agent. Twee mailboxen op één assistent zou betekenen dat
  -- niemand meer weet vanaf welk adres er geantwoord wordt.
  agent_id uuid NOT NULL UNIQUE REFERENCES public.agents(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google', 'microsoft')),
  email text NOT NULL,
  naam text,
  -- Welke map of label we lezen. Niet de hele mailbox: de klant wijst aan welk
  -- deel van zijn post van de agent is.
  map text NOT NULL DEFAULT 'INBOX',
  status text NOT NULL DEFAULT 'actief' CHECK (status IN ('actief', 'verlopen', 'fout')),
  laatste_fout text,
  laatste_keer timestamptz,
  -- Waar we gebleven waren: een historyId bij Google, een delta-link bij
  -- Microsoft. Zonder dit zouden we elke keer de hele map doorlopen.
  cursor text,
  gekoppeld_op timestamptz NOT NULL DEFAULT now(),
  gekoppeld_door uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS postvak_koppelingen_agent_idx
  ON public.postvak_koppelingen (agent_id);

ALTER TABLE public.postvak_koppelingen ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.postvak_koppelingen FROM anon, authenticated;
GRANT SELECT ON public.postvak_koppelingen TO authenticated;
GRANT ALL ON public.postvak_koppelingen TO service_role;

-- De klant ziet zijn eigen koppeling. Wij ook: dit is status, geen inhoud, en
-- zonder dit kunnen we niet helpen als het koppelen niet lukt.
DROP POLICY IF EXISTS postvak_koppelingen_lezen ON public.postvak_koppelingen;
CREATE POLICY postvak_koppelingen_lezen ON public.postvak_koppelingen
  FOR SELECT TO authenticated
  USING (private.owns_agent(agent_id, auth.uid()) OR private.is_staf(auth.uid()));

-- ---------------------------------------------------------------------------
-- De sleutels
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS private.postvak_sleutels (
  koppeling_id uuid PRIMARY KEY
    REFERENCES public.postvak_koppelingen(id) ON DELETE CASCADE,
  -- Versleuteld door de server; hier staat nooit een leesbaar token.
  toegang text NOT NULL,
  vernieuwen text,
  verloopt_op timestamptz,
  bijgewerkt_op timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON private.postvak_sleutels FROM anon, authenticated, public;

-- ---------------------------------------------------------------------------
-- Koppelen, vernieuwen, bijhouden
--
-- Alleen voor de server: deze functies raken de sleutels aan. De klant komt
-- hier niet bij; hij koppelt via de inlogpagina van Google of Microsoft, en
-- wat daaruit komt verwerkt de server.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.postvak_koppel(
  _agent_id uuid,
  _provider text,
  _email text,
  _naam text,
  _map text,
  _toegang text,
  _vernieuwen text,
  _verloopt_op timestamptz,
  _door uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.postvak_koppelingen AS k
    (agent_id, provider, email, naam, map, status, gekoppeld_door)
  VALUES
    (_agent_id, _provider, lower(btrim(_email)), _naam, coalesce(nullif(btrim(_map), ''), 'INBOX'),
     'actief', _door)
  ON CONFLICT (agent_id) DO UPDATE
    SET provider = excluded.provider,
        email = excluded.email,
        naam = excluded.naam,
        map = excluded.map,
        status = 'actief',
        laatste_fout = NULL,
        -- Een nieuwe koppeling begint overnieuw: de oude cursor hoort bij de
        -- oude mailbox en zou post kunnen overslaan.
        cursor = NULL,
        gekoppeld_op = now(),
        gekoppeld_door = _door
  RETURNING k.id INTO _id;

  INSERT INTO private.postvak_sleutels (koppeling_id, toegang, vernieuwen, verloopt_op)
  VALUES (_id, _toegang, _vernieuwen, _verloopt_op)
  ON CONFLICT (koppeling_id) DO UPDATE
    SET toegang = excluded.toegang,
        -- Google stuurt bij een herhaalde koppeling niet altijd een nieuw
        -- vernieuwtoken mee. Het oude bewaren is dan het verschil tussen een
        -- koppeling die blijft werken en een die morgen stilvalt.
        vernieuwen = coalesce(excluded.vernieuwen, private.postvak_sleutels.vernieuwen),
        verloopt_op = excluded.verloopt_op,
        bijgewerkt_op = now();

  RETURN _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.postvak_koppel(uuid, text, text, text, text, text, text, timestamptz, uuid)
  FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.postvak_koppel(uuid, text, text, text, text, text, text, timestamptz, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.postvak_sleutels(_agent_id uuid)
RETURNS TABLE (
  koppeling_id uuid,
  provider text,
  email text,
  map text,
  cursor text,
  toegang text,
  vernieuwen text,
  verloopt_op timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT k.id, k.provider, k.email, k.map, k.cursor, s.toegang, s.vernieuwen, s.verloopt_op
  FROM public.postvak_koppelingen k
  JOIN private.postvak_sleutels s ON s.koppeling_id = k.id
  WHERE k.agent_id = _agent_id
$$;
REVOKE EXECUTE ON FUNCTION public.postvak_sleutels(uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.postvak_sleutels(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.postvak_vernieuwd(
  _agent_id uuid, _toegang text, _verloopt_op timestamptz
)
RETURNS void
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  UPDATE private.postvak_sleutels s
  SET toegang = _toegang, verloopt_op = _verloopt_op, bijgewerkt_op = now()
  FROM public.postvak_koppelingen k
  WHERE k.id = s.koppeling_id AND k.agent_id = _agent_id
$$;
REVOKE EXECUTE ON FUNCTION public.postvak_vernieuwd(uuid, text, timestamptz) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.postvak_vernieuwd(uuid, text, timestamptz) TO service_role;

-- Hoe ver we zijn, en wat er eventueel misging. Eén functie, omdat ze altijd
-- samen bijgewerkt worden: gelukt betekent ook "geen fout meer".
CREATE OR REPLACE FUNCTION public.postvak_stand(
  _agent_id uuid, _cursor text, _fout text DEFAULT NULL
)
RETURNS void
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.postvak_koppelingen
  SET cursor = coalesce(_cursor, cursor),
      laatste_keer = now(),
      laatste_fout = _fout,
      status = CASE WHEN _fout IS NULL THEN 'actief' ELSE 'fout' END
  WHERE agent_id = _agent_id
$$;
REVOKE EXECUTE ON FUNCTION public.postvak_stand(uuid, text, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.postvak_stand(uuid, text, text) TO service_role;

-- Verbreken mag de klant zelf, en dat is het hele punt: toegang die je niet
-- kunt intrekken, heb je niet gegeven. De sleutels gaan mee (cascade).
CREATE OR REPLACE FUNCTION public.postvak_ontkoppel(_agent_id uuid)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (private.owns_agent(_agent_id, auth.uid()) OR auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'Deze agent is niet van jou.';
  END IF;
  DELETE FROM public.postvak_koppelingen WHERE agent_id = _agent_id;
  RETURN FOUND;
END $$;
REVOKE EXECUTE ON FUNCTION public.postvak_ontkoppel(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.postvak_ontkoppel(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Het gesprek waar een supportmail bij hoort
--
-- Bij doorsturen hadden we dit niet nodig: wij antwoordden vanaf ons eigen
-- adres. Bij een koppeling hoort het antwoord ónder de vraag te komen, in
-- hetzelfde gesprek — anders krijgt de klant van de klant een los bericht dat
-- nergens bij hoort. Gmail noemt dat een threadId, Microsoft een
-- conversationId; allebei een tekst, dus één kolom.
-- ---------------------------------------------------------------------------

ALTER TABLE public.support_mails
  ADD COLUMN IF NOT EXISTS gesprek_id text;
