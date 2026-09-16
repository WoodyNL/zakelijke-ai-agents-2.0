-- De opvolging: wanneer, en hoe we weten dat het eerste bericht echt weg is.
--
-- Opvolgen mag alleen na een bericht dat werkelijk is verstuurd. Tot nu toe
-- was dat niet vast te stellen: planBericht zet een bericht op 'gepland' en
-- daarna hoorde niemand meer iets. De planning ligt bij Resend, dus dat is de
-- enige die weet of hij is vertrokken.
--
-- Dat komt nu binnen via dezelfde webhook die de antwoorden brengt. Daarvoor
-- hoeft er niets nieuws te worden opgezet, alleen een paar gebeurtenissen
-- extra aangevinkt.

ALTER TABLE public.outbound_campaigns
  ADD COLUMN IF NOT EXISTS opvolg_na_dagen integer NOT NULL DEFAULT 7
    CHECK (opvolg_na_dagen BETWEEN 1 AND 60);

-- Het id waarmee de verzendende dienst een bericht kent, zodat een melding
-- over dat bericht bij de juiste rij terechtkomt. provider_id bestond al maar
-- had geen index; zonder die index wordt elke melding een volledige zoektocht
-- door de tabel.
CREATE INDEX IF NOT EXISTS outbound_messages_provider
  ON public.outbound_messages (provider_id)
  WHERE provider_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Een bounce raakt het contact, niet alleen het bericht
--
--    Een adres dat niet bestaat blijven proberen beschadigt de reputatie van
--    het verzenddomein, en die herstelt traag. Daarom markeert een bounce het
--    contact zelf: de trigger uit fase 5 houdt daarna elk volgend bericht
--    tegen, ook als iemand het handmatig probeert.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.outbound_meld_bounce(_provider_id text, _reden text)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _contact uuid;
BEGIN
  SELECT contact_id INTO _contact
  FROM public.outbound_messages
  WHERE provider_id = _provider_id
  LIMIT 1;

  IF _contact IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.outbound_contacts
  SET bounce_op = coalesce(bounce_op, now())
  WHERE id = _contact;

  UPDATE public.outbound_messages
  SET status = 'mislukt'::public.bericht_status,
      fout = left(coalesce(_reden, 'bounce'), 300)
  WHERE provider_id = _provider_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.outbound_meld_bounce(text, text) FROM anon, public;
