-- Nog één brede leespolicy die bleef staan.
--
-- De fase 0-migratie verwijderde "Anyone can read active knowledge" en
-- "Authenticated users read active knowledge", maar er bleek een derde te
-- bestaan onder weer een andere naam: "Anon can read active knowledge items",
-- aangemaakt op 15 september om anonieme bezoekers toegang te geven tot de
-- kennisbank.
--
-- Die policy filtert alleen op is_active en kijkt niet naar de agent. Omdat
-- PostgreSQL permissieve policies met OR combineert, wint de bredere: zolang
-- deze bestaat mag elke bezoeker de kennis van álle agents lezen, hoe streng
-- de policy ernaast ook is.
--
-- Vandaag valt dat niet op, want er is één agent. Vanaf de tweede klant is het
-- een datalek. Daarom weg, voordat er klantkennis in de tabel staat.
--
-- Wat overblijft is "Read knowledge of one live agent", die wél per agent
-- filtert, plus de beheer- en klantpolicies voor schrijven.

DROP POLICY IF EXISTS "Anon can read active knowledge items" ON public.knowledge_items;

-- Ook de losse grant die er destijds bij hoorde is niet meer nodig als aparte
-- regel: de policy hierboven regelt wie wat mag lezen, en SELECT voor anon
-- blijft nodig voor "Read knowledge of one live agent".
-- GRANT SELECT ON public.knowledge_items TO anon; blijft dus bewust staan.
