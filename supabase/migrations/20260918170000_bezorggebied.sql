-- Ligt een contact op de route van de chauffeur?
--
-- Bij de eerste echte klantlijst bleek dat bijna de helft van de relaties
-- buiten het bezorggebied ligt: Groningen, Tilburg, Apeldoorn. FJ Snacks heeft
-- ooit veel breder geleverd dan die ene vrijdagroute.
--
-- Dat is geen detail voor de tekst maar voor de belofte. "Onze chauffeur brengt
-- vrijdag een proefpakket langs" is naar iemand in Groningen een toezegging die
-- niemand kan waarmaken, en dat is het slechtste eerste contact dat je met een
-- oud-klant kunt hebben.
--
-- Drie waarden, en het verschil tussen de laatste twee doet ertoe: true is
-- binnen, false is erbuiten, en leeg betekent dat we het niet weten — meestal
-- omdat er geen plaats bij het contact staat. Die derde op false zetten zou
-- mensen buitensluiten om een ontbrekend veld.

ALTER TABLE public.outbound_contacts
  ADD COLUMN IF NOT EXISTS in_bezorggebied boolean;

CREATE INDEX IF NOT EXISTS outbound_contacts_gebied
  ON public.outbound_contacts (agent_id, in_bezorggebied);

-- ---------------------------------------------------------------------------
-- Voor wie is deze campagne bedoeld?
--
--    Standaard iedereen, zoals het tot nu toe werkte. De twee andere keuzes
--    maken het mogelijk om de relaties buiten het gebied apart te benaderen
--    met een ander aanbod, in plaats van ze stil te laten liggen.
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.campagne_doelgroep AS ENUM ('alles', 'binnen_gebied', 'buiten_gebied');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.outbound_campaigns
  ADD COLUMN IF NOT EXISTS doelgroep public.campagne_doelgroep NOT NULL DEFAULT 'alles';
