-- Het adres waar de doos heen moet.
--
-- De hele trechter bestaat om een proefpakket op een toonbank te krijgen, en de
-- man die dat doet had niets: op het bezorgscherm stond wie er vrijdag mee
-- moest, maar geen adres. Dan schrijft iemand het donderdagavond alsnog met de
-- hand over, en is de automatisering een papiertje geworden.
--
-- Straat en postcode apart van de plaats, want de plaats bepaalt al of iemand
-- op de route ligt en wordt daarvoor los gebruikt.

ALTER TABLE public.outbound_contacts
  ADD COLUMN IF NOT EXISTS adres text,
  ADD COLUMN IF NOT EXISTS postcode text;
