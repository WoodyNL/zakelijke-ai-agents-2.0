-- Welke schermen een klant krijgt, per agent in plaats van per soort.
--
-- Twee e-mailagents zijn niet hetzelfde product. Bezorgen en de
-- proefpakketplanning zijn gebouwd voor FJ Snacks; een volgende klant met een
-- e-mailagent wil waarschijnlijk alleen contacten, campagnes, berichten en
-- antwoorden. De soort bepaalt welke schermen standaard aanstaan en welke
-- erbij kunnen (src/lib/agent-soorten.ts); per agent zet de beheerder ze aan
-- of uit.
--
-- Leeg (null) betekent: de standaard van de soort. Zo verandert er voor
-- bestaande agents niets tot iemand bewust iets aanvinkt.

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS modules text[];

ALTER TABLE public.agents
  DROP CONSTRAINT IF EXISTS agents_modules_bekend;
ALTER TABLE public.agents
  ADD CONSTRAINT agents_modules_bekend CHECK (
    modules IS NULL
    OR modules <@ ARRAY['contacten', 'campagnes', 'berichten', 'antwoorden', 'bezorgen']::text[]
  );
