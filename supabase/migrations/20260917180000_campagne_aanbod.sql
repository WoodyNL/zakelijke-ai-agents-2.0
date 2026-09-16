-- Wat de campagne aanbiedt, en wie er ondertekent.
--
-- Bij het bouwen van het opstellen bleek dat de campagnetabel twee dingen mist
-- die elk bericht nodig heeft. Ze stonden tot nu toe in de code, en dat is de
-- verkeerde plek: het aanbod verschilt per campagne, en het is precies het soort
-- zin die een ondernemer zelf wil formuleren.
--
-- Het aanbod is bewust één veld met gewone tekst en geen lijstje met opties.
-- "Een proefpakket kip dat onze eigen chauffeur op vrijdag langsbrengt" zegt
-- meer dan welk afvinkveld dan ook, en het is de zin waar het hele bericht om
-- draait.

ALTER TABLE public.outbound_campaigns
  ADD COLUMN IF NOT EXISTS aanbod text,
  ADD COLUMN IF NOT EXISTS ondertekening text;
