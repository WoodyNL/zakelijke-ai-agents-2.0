-- Een beheerder ziet welke agents er draaien, niet wat erin zit.
--
-- Tot nu toe stond er bij bijna elke tabel "eigen data, óf admin". Voor de
-- database was de beheerder daarmee overal eigenaar: van de contacten van een
-- klant, zijn berichten, de antwoorden die hij kreeg, zijn kennisbank. Daar is
-- geen reden voor. Wij zijn verwerker; de klant is eigenaar van die gegevens,
-- en de privacyverklaring belooft dat toegang beperkt is tot wie die nodig
-- heeft voor de opdracht.
--
-- Wat een beheerder wél houdt, omdat hij het nodig heeft om agents te laten
-- draaien en te factureren:
--   - agents, agent_stats, agent_usage, profiles, user_roles (ongewijzigd);
--   - de functies die alleen aantallen teruggeven (outbound_trechter,
--     agent_month_summary, agent_usage_daily, outbound_vrijdagen), en de
--     instellingen van een agent (my_agent_settings, update_my_agent).
--     Daar staat geen naam of e-mailadres van een klant van de klant in.
--
-- Wat hij kwijtraakt: de inhoud. Hulp bij de kennisbank loopt via de klant
-- zelf. Meekijken bij een storing komt in fase 2, met een reden, een tijdslimiet
-- en een log die de klant kan inzien.
--
-- De agents zelf draaien op de server met de service-role en vallen buiten
-- RLS. Voor hen verandert hier niets.

-- ---------------------------------------------------------------------------
-- 1. Kennisbank
--
--    Blijft over: de klant beheert de kennis van zijn eigen agents, en de
--    functie agent_knowledge() levert kennis aan de chat-assistent.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins manage knowledge" ON public.knowledge_items;

-- ---------------------------------------------------------------------------
-- 2. Uitgaande e-mail: contacten, campagnes, berichten, bezorgingen, antwoorden
--
--    Zelfde vorm als in fase 5: één policy per tabel voor alle bewerkingen,
--    alleen zonder de uitzondering voor de beheerder.
-- ---------------------------------------------------------------------------

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'outbound_contacts', 'outbound_campaigns', 'outbound_messages',
    'outbound_deliveries', 'outbound_replies'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_eigenaar', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
      FOR ALL TO authenticated
      USING (private.owns_agent(agent_id, auth.uid()))
      WITH CHECK (private.owns_agent(agent_id, auth.uid()))
    $f$, t || '_eigenaar', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Aanvragen
--
--    Aanvragen via het contactformulier op onze eigen site (zonder agent) zijn
--    van ons en blijven zichtbaar in /admin. Leads die de chat-assistent van
--    een klant binnenhaalt, zijn van die klant; die ziet hij via "Clients read
--    leads of own agents".
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins manage lead requests" ON public.lead_requests;

CREATE POLICY "Admins manage own lead requests"
ON public.lead_requests
FOR ALL
TO authenticated
USING (agent_id IS NULL AND private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (agent_id IS NULL AND private.has_role(auth.uid(), 'admin'::app_role));
