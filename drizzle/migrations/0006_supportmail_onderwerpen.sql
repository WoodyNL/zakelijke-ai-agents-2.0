-- Waar een supportvraag over gaat.
--
-- Drie knoppen uit de catalogus leunen op dit ene gegeven:
--
--   direct_onderwerpen   zelf antwoorden mag, maar alleen over verzendkosten
--                        en openingstijden — niet over een factuur.
--   vragen_groeperen     komt dezelfde soort vraag vaker, dan hoort daar een
--                        kennisitem van gemaakt te worden.
--   reactietijd_doel     welke vragen te lang liggen, en waarover.
--
-- De woordenlijst verzinnen we niet zelf: het zijn de categorieën uit de
-- kennisbank van de klant. Die heeft hij al ingevuld, ze staan in zijn eigen
-- woorden, en zo kan de knop "direct versturen alleen voor…" precies dezelfde
-- woorden tonen. Past een vraag nergens bij, dan is het 'overig' — en dat is
-- meteen het signaal dat er kennis ontbreekt.

ALTER TABLE public.support_mails
  ADD COLUMN IF NOT EXISTS categorie text;

CREATE INDEX IF NOT EXISTS support_mails_categorie_idx
  ON public.support_mails (agent_id, categorie, ontvangen_op DESC);
