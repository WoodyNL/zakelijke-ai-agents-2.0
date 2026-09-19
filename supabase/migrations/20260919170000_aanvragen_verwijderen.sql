-- Aanvragen verwijderen om het overzicht bij te houden.
--
-- Aanvragen via het contactformulier (zonder agent) kon de beheerder al
-- beheren, verwijderen inbegrepen. Aanvragen die een chat-assistent binnenhaalt
-- hangen aan die agent, en de eigenaar kon ze alleen lezen. Voor onze eigen
-- website-assistent betekende dat: de testaanvragen bleven eeuwig staan.
--
-- Nu mag de eigenaar van een agent de aanvragen van die agent verwijderen.
-- Dat geldt ook voor een klant met zijn eigen chat-assistent: het zijn zijn
-- gegevens. Meekijken blijft alleen lezen; daar komt geen DELETE bij.

DROP POLICY IF EXISTS lead_requests_eigen_agent_verwijderen ON public.lead_requests;
CREATE POLICY lead_requests_eigen_agent_verwijderen ON public.lead_requests
  FOR DELETE TO authenticated
  USING (agent_id IS NOT NULL AND private.owns_agent(agent_id, auth.uid()));
