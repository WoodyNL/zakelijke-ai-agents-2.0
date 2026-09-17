-- Woensdag vragen of het vrijdag schikt.
--
-- Van de contacten in deze lijst komt een deel uit een relatiebestand van
-- jaren geleden. In de horeca wordt verhuisd, overgenomen en gestopt; een deel
-- van die adressen klopt niet meer. Dat merk je nu pas op vrijdagochtend, als
-- de chauffeur voor een dichte deur staat — en dan ben je niet één pakket
-- kwijt maar het vertrouwen in de hele lijst.
--
-- De vraag die de agent stelt gaat daar met opzet niet over. "Klopt uw adres
-- nog?" is administratief werk waar de ontvanger niets aan heeft, en precies
-- het soort vraag waarop mensen "ja" antwoorden zonder te kijken. De agent
-- vraagt of het tijdstip schikt, met het adres voluit in de zin. Klopt het
-- niet, dan corrigeert de ontvanger het uit eigenbelang: anders loopt hij zijn
-- pakket mis.
--
-- Wat hier wordt bewaard is dus niet "is het adres gecontroleerd", maar wat er
-- uit dat gesprek kwam.

DO $$ BEGIN
  CREATE TYPE public.bevestiging_stand AS ENUM (
    'niet_gevraagd',
    'gevraagd',
    'bevestigd',     -- schikt, chauffeur kan rijden
    'ander_adres',   -- gaat door, maar ergens anders heen
    'verzet',        -- wil wel, maar niet op deze dag
    'afgezegd'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.outbound_deliveries
  ADD COLUMN IF NOT EXISTS bevestiging public.bevestiging_stand NOT NULL DEFAULT 'niet_gevraagd',
  ADD COLUMN IF NOT EXISTS bevestiging_op timestamptz,
  -- Het adres wordt bij een correctie meteen bijgewerkt, want de chauffeur
  -- leest de lijst en niet dit veld. Maar het oude adres blijft staan: een
  -- wijziging die je niet meer kunt terugzien, is een wijziging die je niet
  -- durft te vertrouwen.
  ADD COLUMN IF NOT EXISTS adres_eerder text,
  -- De zin uit het antwoord waar het nieuwe adres uit kwam. Zonder die zin is
  -- het een getal dat uit de lucht komt vallen, en dan gaat er iemand op
  -- vrijdagochtend alsnog bellen om te vragen of het klopt.
  ADD COLUMN IF NOT EXISTS adres_bron text;

CREATE INDEX IF NOT EXISTS outbound_deliveries_bevestiging
  ON public.outbound_deliveries (agent_id, bezorgdag, bevestiging);
