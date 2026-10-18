-- Vijf nieuwe agentsoorten.
--
-- Gekozen op 18 oktober 2026 na onderzoek naar wat AI-agencies verkopen en wat
-- het Nederlandse mkb volgens de Exact MKB Barometer 2026 werkelijk dwarszit.
-- De onderbouwing staat in documenten/voorstel-nieuwe-agents.md.
--
-- Dit voegt alleen de waarden toe aan de enum, zodat een beheerder de soort
-- kan kiezen en een agent op "in opbouw" kan zetten. Wat elke soort doet,
-- welke schermen en knoppen erbij horen, staat in src/lib/agent-soorten.ts en
-- src/lib/agent-opties.ts — niet hier, want dat is productkennis en geen
-- databasestructuur. Tabellen voor offertes, facturen, reviews en afspraken
-- komen per agent, op het moment dat die gebouwd wordt.
--
-- ADD VALUE kan niet ongedaan gemaakt worden; daarom IF NOT EXISTS, zodat de
-- migratie herhaalbaar is. In de volgorde waarin we ze gaan bouwen.

ALTER TYPE public.agent_kind ADD VALUE IF NOT EXISTS 'heractivatie';      -- slapende klanten opnieuw aanschrijven
ALTER TYPE public.agent_kind ADD VALUE IF NOT EXISTS 'offerte';           -- van aanvraag naar concept-offerte
ALTER TYPE public.agent_kind ADD VALUE IF NOT EXISTS 'betaalherinnering'; -- openstaande facturen opvolgen
ALTER TYPE public.agent_kind ADD VALUE IF NOT EXISTS 'reviews';           -- om reviews vragen en erop antwoorden
ALTER TYPE public.agent_kind ADD VALUE IF NOT EXISTS 'afspraken';         -- bevestigen, herinneren, verzetten
