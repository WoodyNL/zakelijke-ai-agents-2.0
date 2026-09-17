-- Welke leads als eerste aan de beurt zijn.
--
-- Een goed onderzochte koude lijst is niet vlak. Bij de horecaleads voor FJ
-- Snacks staat er bij elke regel of hij hoog, midden of laag scoort, en dat is
-- het verschil tussen een zaak die zelf saté maakt en een strandtent die
-- toevallig in de buurt ligt.
--
-- Zonder volgorde gaat de eerste tien naar wie toevallig bovenaan het bestand
-- stond. Met een dagmaximum van tien duurt het dan twaalf dagen voordat de
-- beste leads aan de beurt zijn — en dan is het zomerseizoen voorbij.
--
-- Eén is het hoogst, zodat oplopend sorteren vanzelf de beste eerst geeft.

ALTER TABLE public.outbound_contacts
  ADD COLUMN IF NOT EXISTS prioriteit smallint
    CHECK (prioriteit IS NULL OR prioriteit BETWEEN 1 AND 3);

CREATE INDEX IF NOT EXISTS outbound_contacts_prioriteit
  ON public.outbound_contacts (agent_id, prioriteit NULLS LAST);
