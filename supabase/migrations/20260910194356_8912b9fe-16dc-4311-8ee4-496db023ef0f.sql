CREATE TABLE public.knowledge_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'overig',
  title text NOT NULL,
  question text,
  content text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_items TO authenticated;
GRANT ALL ON public.knowledge_items TO service_role;

ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage knowledge" ON public.knowledge_items
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER knowledge_items_updated_at
  BEFORE UPDATE ON public.knowledge_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.knowledge_items (category, title, question, content, tags, sort_order) VALUES
('bedrijf', 'Wat is Cadence?', 'Wat doet Cadence?', 'Cadence levert AI agents die sales en klantenservice overnemen. De agents kwalificeren leads, schrijven antwoorden op klantvragen en volgen automatisch op via e-mail en WhatsApp — 24/7. Drie agents zijn beschikbaar: de AI Sales Assistant, de Inbox Draft Assistant en de WhatsApp Follow-up Agent.', ARRAY['positionering'], 1),
('bedrijf', 'Doelgroep', 'Voor wie is Cadence bedoeld?', 'B2B-bedrijven en dienstverleners met inkomende leads via website of formulier, en teams die veel klantvragen per e-mail of WhatsApp krijgen. Typische rollen: eigenaar/DGA, Head of Sales, klantenservice-manager. Geen technisch team nodig.', ARRAY['doelgroep'], 2),
('bedrijf', 'Tone-of-voice', 'Hoe communiceert Cadence?', 'Nederlands, direct, zakelijk en warm. Korte zinnen, concreet resultaat voorop, geen jargon en geen overdreven verkooptaal. Altijd uitleggen wat het de klant oplevert in tijd, snelheid of afspraken. Beloftes blijven realistisch: de agent verstuurt niets ongezien zolang de klant dat niet wil.', ARRAY['stijl'], 3),
('bedrijf', 'Kernbelofte en cijfers', 'Wat levert Cadence op?', 'Circa 40 seconden tot de eerste reactie op een nieuwe lead. Tot 3x sneller opgevolgd. 0 gemiste berichten. Referentie-uitspraak van een klant: "Onze responstijd ging van dagen naar seconden. Sales praat nu alleen nog met leads die er toe doen." — Lotte van Dijk, Head of Sales, B2B-software (3x meer afspraken).', ARRAY['resultaat','social proof'], 4),
('bedrijf', 'Contact en afspraak', 'Hoe kom ik in contact met Cadence?', 'Via de knop "Plan een gratis demo" op cadence-website. De demo duurt 30 minuten, is vrijblijvend en laat direct zien welke agent het meeste oplevert. Bevestiging kan per e-mail of via WhatsApp. LET OP: vul hier je echte contactgegevens (e-mailadres, telefoonnummer, agenda-link) in.', ARRAY['contact'], 5),

('agents', 'AI Sales Assistant — overzicht', 'Wat doet de AI Sales Assistant?', 'Van lead tot afspraak in 10 automatische stappen. De agent leest nieuwe leads, kwalificeert ze, reageert persoonlijk, zet ze in het CRM, volgt op en boekt afspraken. Resultaat: sales krijgt alleen warme leads. Bij "ja" wordt direct in de agenda geboekt, bij "nee" loopt automatische follow-up via mail en WhatsApp door.', ARRAY['sales'], 10),
('agents', 'AI Sales Assistant — fase 1: begrijpt de lead', NULL, '01 Leest nieuwe leads: monitort elk formulier en elke aanmelding, 24/7 — niets ontgaat de AI. 02 Bepaalt relevantie: kwalificeert intentie en fit met de ideale klant. 03 Verrijkt de lead: verzamelt bedrijf, rol en signalen tot één volledig beeld.', ARRAY['sales','stappen'], 11),
('agents', 'AI Sales Assistant — fase 2: reageert direct', NULL, '04 Schrijft persoonlijke reactie in de tone-of-voice van de klant, afgestemd op elke prospect. 05 Stuurt e-mail en WhatsApp, direct, dag en nacht, via het kanaal dat past. 06 Zet de lead in het CRM: contact direct verrijkt aangemaakt, geen handwerk.', ARRAY['sales','stappen'], 12),
('agents', 'AI Sales Assistant — fase 3: volgt op en sluit', NULL, '07 Plant follow-up automatisch op het juiste moment. 08 Herinnert de prospect met zachte reminders zonder spam. 09 Boekt afspraak via agenda-koppeling: alleen warme leads belanden bij sales. 10 Rapporteert dagelijks een helder overzicht aan de eigenaar.', ARRAY['sales','stappen'], 13),
('agents', 'Inbox Draft Assistant — overzicht', 'Wat doet de Inbox Draft Assistant?', 'Koppelt aan Gmail of Outlook, leest inkomende sales- en klantmail en schrijft een concept-antwoord dat jij beoordeelt voordat het weggaat. Bewust geen automatisch versturen in het begin, zodat je vertrouwen opbouwt in de kwaliteit. 6 stappen, jij keurt goed.', ARRAY['inbox','e-mail'], 20),
('agents', 'Inbox Draft Assistant — fase 1: leest je inbox', NULL, '01 Leest inkomende mail: verbindt met Gmail/Outlook en leest elke nieuwe sales-mail. 02 Bepaalt intentie: sorteert vragen, offertes en support uit elkaar. 03 Verzamelt context: vat de hele thread samen tot één beeld.', ARRAY['inbox','stappen'], 21),
('agents', 'Inbox Draft Assistant — fase 2: schrijft een concept', NULL, '04 Schrijft een persoonlijk concept in jouw tone-of-voice, klaar om te versturen. 05 Wacht op jouw akkoord: geen autosend, jij reviewt voordat het weggaat. 06 Leert van je wijzigingen: elke aanpassing maakt het volgende concept beter. Resultaat: jij stuurt alleen als je tevreden bent.', ARRAY['inbox','stappen'], 22),
('agents', 'WhatsApp Follow-up Agent — overzicht', 'Wat doet de WhatsApp Follow-up Agent?', 'Stuurt een lead na een ingestelde vertraging een WhatsApp-bericht ("Hey, volgend op je interesse in X — nog aan het oriënteren?") en draagt over aan een mens zodra het gesprek complex wordt. Hergebruikt dezelfde kwalificatielogica als de Sales AI: één brein, meerdere deuren. 5 stappen.', ARRAY['whatsapp','follow-up'], 30),
('agents', 'WhatsApp Follow-up Agent — fase 1: neemt contact op', NULL, '01 Wacht het juiste moment: stuurt een bericht na een ingestelde delay — nooit te pushy. 02 Hergebruikt de kwalificatie: dezelfde logica als de Sales AI, alleen op een nieuw kanaal. 03 Houdt het gesprek gaande: beantwoordt vragen en houdt de lead warm.', ARRAY['whatsapp','stappen'], 31),
('agents', 'WhatsApp Follow-up Agent — fase 2: schakelt over', NULL, '04 Herkent complexe reacties en detecteert wanneer menselijke hulp nodig is. 05 Handt over aan een medewerker: directe route naar een teamlid, geen wachttijd. Eenvoudig blijft bij de AI, complex gaat naar een mens.', ARRAY['whatsapp','stappen'], 32),
('agents', 'Klantenservice-inzet', 'Zijn de agents alleen voor sales?', 'Nee. Dezelfde agents werken ook voor klantenservice: veelgestelde klantvragen beantwoorden, verzoeken routeren naar de juiste afdeling en klanten op de hoogte houden via e-mail of WhatsApp.', ARRAY['support'], 40),
('agents', 'Voordelen', 'Waarom kiezen teams voor Cadence?', 'Reactie in seconden: elke aanvraag krijgt direct een persoonlijke reactie, geen lead verstoft meer. Warme pipeline: alleen gekwalificeerde deals bereiken sales, minder ruis en meer closing. Geen verlies: elke lead en elke klantvraag wordt gerouteerd en opgevolgd.', ARRAY['voordelen'], 41),

('proces', 'Doorlooptijd en livegang', 'Hoe snel staat een agent live?', 'Binnen een dag per agent. Cadence koppelt formulier, inbox, CRM en agenda. Er is geen technisch team nodig. Vandaag geboekt, deze week live.', ARRAY['onboarding'], 50),
('proces', 'Demo', 'Hoe verloopt de gratis demo?', 'Een gesprek van 30 minuten, vrijblijvend, waarin we laten zien hoe de agents werken en welke agent in jouw situatie het meeste oplevert. Bevestiging per e-mail of WhatsApp.', ARRAY['demo'], 51),
('proces', 'Klantportaal', 'Kan ik de resultaten van mijn agent zien?', 'Ja. Elke klant krijgt een login voor het Cadence-portaal met per agent de status (live, gepauzeerd of in opbouw), het aantal uitgevoerde acties, een prestatiescore en een trendgrafiek over de laatste 7 tot 30 dagen. Per agent is er een detailpagina met activiteitenlog.', ARRAY['portaal'], 52),

('prijzen', 'Pakket 1 — VUL IN', 'Wat kost een AI agent bij Cadence?', 'INVULLEN: pakketnaam, eenmalige opzetkosten, maandbedrag, wat inbegrepen is (aantal agents, kanalen, koppelingen, support), doorlooptijd en opzegtermijn.', ARRAY['placeholder'], 60),
('prijzen', 'Pakket 2 — VUL IN', NULL, 'INVULLEN: pakketnaam, eenmalige opzetkosten, maandbedrag, wat inbegrepen is, doorlooptijd en opzegtermijn.', ARRAY['placeholder'], 61),
('prijzen', 'Pakket 3 — VUL IN', NULL, 'INVULLEN: pakketnaam, eenmalige opzetkosten, maandbedrag, wat inbegrepen is, doorlooptijd en opzegtermijn.', ARRAY['placeholder'], 62),
('prijzen', 'Extra kosten en voorwaarden — VUL IN', 'Zijn er bijkomende kosten?', 'INVULLEN: kosten voor extra kanalen, WhatsApp Business-berichten, koppelingen, meerwerk en eventuele proefperiode of garantie.', ARRAY['placeholder'], 63),

('veelgestelde vragen', 'Welke agents levert Cadence?', 'Welke agents levert Cadence?', 'Drie: de AI Sales Assistant (leads kwalificeren en afspraken boeken), de Inbox Draft Assistant (concept-reacties op sales- én klantvragen) en de WhatsApp Follow-up Agent (automatische opvolging met menselijke overname).', ARRAY['faq'], 70),
('veelgestelde vragen', 'Zijn de agents alleen voor sales?', 'Zijn de agents alleen voor sales?', 'Nee. Dezelfde agents werken ook voor klantenservice: veelgestelde klantvragen beantwoorden, verzoeken routeren naar de juiste afdeling en klanten op de hoogte houden via e-mail of WhatsApp.', ARRAY['faq'], 71),
('veelgestelde vragen', 'Hoe snel staat een agent live?', 'Hoe snel staat een agent live?', 'Binnen een dag per agent. We koppelen je formulier, inbox, CRM en agenda — geen technisch team nodig.', ARRAY['faq'], 72),
('veelgestelde vragen', 'Stuurt de Inbox Draft Assistant zelfstandig mails?', 'Stuurt de Inbox Draft Assistant zelfstandig mails?', 'Nee, niet in het begin. Elke reactie staat als concept klaar; jij keurt goed en verstuurt. Zo bouw je vertrouwen op in de kwaliteit.', ARRAY['faq'], 73),
('veelgestelde vragen', 'Wat gebeurt er bij twijfelgevallen of complexe vragen?', 'Wat gebeurt er bij twijfelgevallen of complexe vragen?', 'Die worden automatisch aan een medewerker aangeboden — via e-mail of WhatsApp, jij bepaalt de regels. Simpelere follow-up en klantvragen lopen automatisch door.', ARRAY['faq'], 74),

('bezwaren', 'Klinkt robotachtig', 'Merken mijn klanten dat het een AI is?', 'De agent schrijft in jouw tone-of-voice en gebruikt context uit het hele gesprek. Bij de Inbox Draft Assistant lees je elk bericht eerst zelf na, dus je bepaalt volledig de kwaliteit voordat er iets uitgaat.', ARRAY['bezwaar'], 80),
('bezwaren', 'Technisch te ingewikkeld', 'Moet ik technisch zijn om dit te gebruiken?', 'Nee. Cadence verzorgt de koppelingen met formulier, inbox, CRM en agenda. Jij levert alleen toegang en je tone-of-voice aan; wij zetten de agent live.', ARRAY['bezwaar'], 81),
('bezwaren', 'Controleverlies', 'Wat als de AI iets verkeerds doet?', 'Je bepaalt de regels: welke berichten automatisch mogen, welke eerst langs jou gaan en wanneer er wordt overgedragen aan een mens. De Inbox Draft Assistant verstuurt standaard niets zonder jouw akkoord.', ARRAY['bezwaar'], 82);
