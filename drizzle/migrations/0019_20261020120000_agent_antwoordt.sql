-- De agent antwoordt zelf op een binnengekomen reactie.
--
-- Tot nu toe eindigde het gesprek bij het antwoordenscherm: er kwam iets
-- binnen, een mens las het, en daar bleef het. De vraag "wat zit er precies in
-- het proefpakket?" bleef onbeantwoord terwijl het antwoord woordelijk in de
-- kennisbank staat.
--
-- Automatisch antwoorden op e-mail is de gevaarlijkste functie in dit
-- platform, en wel om één reden: afwezigheidsassistenten. Antwoordt onze agent
-- op een automatisch bericht, dan antwoordt die assistent weer, en dan hebben
-- twee machines een gesprek dat niemand stopt. Dat kost geen mail maar een
-- verzenddomein.
--
-- Daarom staan de twee belangrijkste remmen hier en niet in de code.

-- ---------------------------------------------------------------------------
-- 1. Een gesprek mag meer dan één beurt hebben
--
--    De unieke index op (contact_id, stap) bestaat om te voorkomen dat iemand
--    dezelfde opvolging twee keer krijgt als een taak opnieuw start. Dat is
--    nog steeds de bedoeling voor de vaste stappen van een campagne: eerste
--    bericht, opvolging, navraag, bezorgbevestiging.
--
--    Maar een gesprek heeft zoveel beurten als het nodig heeft. Dus geldt die
--    regel voortaan alleen voor stap 1 tot en met 4.
-- ---------------------------------------------------------------------------

DROP INDEX IF EXISTS public.outbound_messages_stap_uniek;

CREATE UNIQUE INDEX IF NOT EXISTS outbound_messages_stap_uniek
  ON public.outbound_messages (contact_id, stap)
  WHERE stap <= 4;

-- ---------------------------------------------------------------------------
-- 2. Eén antwoord per binnengekomen bericht. Nooit twee.
--
--    Dit is de rem waar Wouter om vroeg, en hij hoort hier omdat een webhook
--    opnieuw kan worden aangeboden. Resend probeert het nog eens als wij traag
--    zijn of even omvallen, en dan draait dezelfde verwerking een tweede keer.
--    Een voorwaarde in code zou dan twee keer "nee, nog niets verstuurd" zeggen
--    omdat beide pogingen tegelijk lopen.
--
--    Een unieke index kan dat niet: de tweede invoeging botst, hoe gelijk de
--    twee pogingen ook lopen. Daarom wordt de rij ook aangemaakt vóórdat er
--    iets wordt verstuurd — wie de botsing verliest, verstuurt niets.
-- ---------------------------------------------------------------------------

ALTER TABLE public.outbound_messages
  ADD COLUMN IF NOT EXISTS in_antwoord_op uuid
    REFERENCES public.outbound_replies(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS outbound_messages_antwoord_uniek
  ON public.outbound_messages (in_antwoord_op)
  WHERE in_antwoord_op IS NOT NULL;

CREATE INDEX IF NOT EXISTS outbound_messages_gesprek
  ON public.outbound_messages (contact_id, stap, aangemaakt_op);