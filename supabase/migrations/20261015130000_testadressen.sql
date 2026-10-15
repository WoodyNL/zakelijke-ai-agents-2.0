-- De vijf adressen voor de live test van FJ Snacks.
--
-- Aangeleverd door Wouter op 15 oktober 2026. Ze gaan hier in de migratie en
-- niet via het importscherm, zodat ze er bij elke omgeving in staan en niemand
-- ze met de hand hoeft over te typen — dat is precies waar een adres een letter
-- verliest.
--
-- De agent wordt opgezocht en niet hardgecodeerd: een uuid uit een andere
-- omgeving zou hier een vreemdsleutelfout geven of, erger, kloppen en de
-- contacten bij de verkeerde klant zetten. Staat er niet precies één agent voor
-- uitgaande e-mail, dan doet deze migratie niets en zegt ze waarom.
--
-- ON CONFLICT DO NOTHING op de unieke index (agent_id, lower(email)), want een
-- migratie die twee keer draait mag geen dubbele contacten opleveren.
--
-- Dit staat los van 20261015120000 omdat het moet: PostgreSQL weigert een nieuwe
-- enumwaarde te gebruiken in dezelfde transactie waarin hij is toegevoegd
-- ("unsafe use of new value of enum type"). Eén bestand zou dus altijd falen.

DO $$
DECLARE
  _agent uuid;
  _aantal int;
BEGIN
  -- Eerst tellen, dan pas pakken. min(id) zou korter zijn, maar PostgreSQL
  -- heeft geen min() voor uuid — er is geen ordening waarin de "kleinste" uuid
  -- iets betekent. Twee opdrachten zeggen bovendien precies wat er bedoeld is:
  -- controleer dat er één is, neem dan die ene.
  SELECT count(*) INTO _aantal
  FROM public.agents
  WHERE kind = 'uitgaande_email';

  IF _aantal <> 1 THEN
    RAISE NOTICE 'Testadressen overgeslagen: % agents voor uitgaande e-mail gevonden, verwacht precies 1.', _aantal;
    RETURN;
  END IF;

  SELECT id INTO _agent
  FROM public.agents
  WHERE kind = 'uitgaande_email';

  INSERT INTO public.outbound_contacts (agent_id, email, naam, bedrijf, plaats, herkomst, notitie)
  VALUES
    (_agent, 'frankransijn@gmail.com',  'Frank Ransijn',  NULL,                'Katwijk', 'test', 'Testadres voor de live proef.'),
    (_agent, 'frank@ransijn.com',       'Frank Ransijn',  NULL,                'Katwijk', 'test', 'Testadres voor de live proef.'),
    (_agent, 'makelaars@ransijn.com',   NULL,             'Ransijn Makelaars', 'Katwijk', 'test', 'Testadres voor de live proef.'),
    (_agent, 'inkoop@fjfood.nl',        NULL,             'FJ Food',           'Katwijk', 'test', 'Testadres voor de live proef.'),
    (_agent, 'wouterransijn@gmail.com', 'Wouter Ransijn', NULL,                'Katwijk', 'test', 'Testadres voor de live proef.')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Testadressen klaargezet voor agent %.', _agent;
END $$;
