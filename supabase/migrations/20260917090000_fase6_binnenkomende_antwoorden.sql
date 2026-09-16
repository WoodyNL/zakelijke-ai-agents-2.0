-- FASE 6 — antwoorden die binnenkomen.
--
-- De agent verstuurt vanaf verkoop@fjsnacks.nl, maar die postbus staat bij
-- TransIP en deze site draait zonder vaste server. Antwoorden bereiken ons
-- daarom via een omweg: Frank stuurt een kopie door naar een ontvangstadres bij
-- Resend, en Resend meldt elk bericht als webhook.
--
-- Twee dingen bepalen hoe deze tabel eruitziet.
--
-- Een webhook wordt opnieuw aangeboden als hij niet meteen gelukt is. Zonder
-- maatregel staat hetzelfde antwoord er dan twee keer, en reageert de agent
-- twee keer. Het id dat de afzendende dienst meegeeft is daarom uniek.
--
-- En een antwoord komt lang niet altijd van een adres dat wij kennen: iemand
-- schrijft terug vanaf zijn privéadres, of een collega neemt het over. Zo'n
-- bericht mag niet verdwijnen omdat het niet in het rijtje past. Het wordt
-- bewaard zonder koppeling, en dan is het aan een mens.

CREATE TABLE IF NOT EXISTS public.outbound_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,

  -- Beide mogen leeg zijn: een antwoord van een onbekend adres hoort ook
  -- bewaard te worden, juist omdat er dan iemand naar moet kijken.
  contact_id uuid REFERENCES public.outbound_contacts(id) ON DELETE SET NULL,
  message_id uuid REFERENCES public.outbound_messages(id) ON DELETE SET NULL,

  van_email text NOT NULL,
  van_naam text,
  onderwerp text,
  tekst text NOT NULL DEFAULT '',

  -- Het id van de ontvangende dienst. Uniek, zodat een herhaalde aflevering
  -- van dezelfde webhook geen tweede rij oplevert.
  provider_id text NOT NULL,

  ontvangen_op timestamptz NOT NULL DEFAULT now(),
  -- Gezet zodra een mens of de agent er iets mee heeft gedaan. Leeg betekent:
  -- staat nog open.
  afgehandeld_op timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS outbound_replies_provider_uniek
  ON public.outbound_replies (provider_id);

CREATE INDEX IF NOT EXISTS outbound_replies_agent
  ON public.outbound_replies (agent_id, ontvangen_op DESC);

CREATE INDEX IF NOT EXISTS outbound_replies_open
  ON public.outbound_replies (agent_id)
  WHERE afgehandeld_op IS NULL;

-- ---------------------------------------------------------------------------
-- Wie mag wat zien
--
--    Zelfde regel als de rest van fase 5: strikt per agent, en anon komt er
--    niet bij. De server schrijft met de service-role en valt hier buiten.
-- ---------------------------------------------------------------------------

ALTER TABLE public.outbound_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS outbound_replies_eigenaar ON public.outbound_replies;
CREATE POLICY outbound_replies_eigenaar ON public.outbound_replies
  FOR ALL TO authenticated
  USING (
    private.owns_agent(agent_id, auth.uid())
    OR private.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    private.owns_agent(agent_id, auth.uid())
    OR private.has_role(auth.uid(), 'admin'::app_role)
  );

REVOKE ALL ON public.outbound_replies FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outbound_replies TO authenticated;

-- ---------------------------------------------------------------------------
-- Het bijbehorende bericht op 'beantwoord' zetten
--
--    Wie heeft geantwoord hoeft geen opvolging meer te krijgen. Dat hier doen
--    en niet in de verzendcode scheelt een ronde heen en weer, en het blijft
--    kloppen ook als een antwoord langs een andere weg wordt vastgelegd.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.outbound_markeer_beantwoord()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.contact_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Alles wat nog niet verstuurd is, hoeft niet meer weg. Wat al verstuurd is,
  -- blijft staan als verzonden; alleen het laatste bericht wordt gemarkeerd als
  -- beantwoord, zodat het verloop per contact leesbaar blijft.
  UPDATE public.outbound_messages
  SET status = 'beantwoord'::public.bericht_status
  WHERE id = (
    SELECT m.id
    FROM public.outbound_messages m
    WHERE m.contact_id = NEW.contact_id
      AND m.status = 'verzonden'::public.bericht_status
    ORDER BY m.verzonden_op DESC NULLS LAST
    LIMIT 1
  );

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS outbound_replies_markeer ON public.outbound_replies;
CREATE TRIGGER outbound_replies_markeer
  AFTER INSERT ON public.outbound_replies
  FOR EACH ROW EXECUTE FUNCTION public.outbound_markeer_beantwoord();

-- ---------------------------------------------------------------------------
-- Welk ontvangstadres hoort bij welke agent
--
--    Antwoorden komen binnen op een adres per klant: fjsnacks@<...>.resend.app.
--    Daarmee staat in elke webhook al wie de ontvanger is, nog voordat we naar
--    de afzender kijken. Dat is robuuster dan koppelen op het afzenderadres
--    alleen, want mensen schrijven geregeld terug vanaf een ander adres dan
--    waar de mail heen ging.
--
--    Alleen het stuk vóór de apenstaart, in kleine letters. Het domein van de
--    ontvangende dienst hoort hier niet in: dat kan wisselen zonder dat de
--    koppeling per klant verandert.
-- ---------------------------------------------------------------------------

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS inbound_local text;

CREATE UNIQUE INDEX IF NOT EXISTS agents_inbound_local_uniek
  ON public.agents (lower(inbound_local))
  WHERE inbound_local IS NOT NULL;
