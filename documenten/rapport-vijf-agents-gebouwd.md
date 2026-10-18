# Rapport: de vijf agents gebouwd

> 18 oktober 2026. Wat er per agent is gebouwd, in de volgorde uit het voorstel,
> hoe het is gecontroleerd, wat er bewust nog niet in zit, en wat Lovable moet
> doen. Vervolg op `rapport-vijf-agents-toegevoegd.md` (de soorten kiesbaar
> maken) en `voorstel-nieuwe-agents.md` (het waarom).

## In één oogopslag

| # | Agent | Scherm | Wat de klant zelf zet | Werkt nu | Komt nog |
|---|---|---|---|---|---|
| 1 | Heractivatie | contacten, campagnes, berichten, antwoorden | slapend na, reden om terug te komen, max. berichten, nooit aanschrijven, orderwaarde | ja, volledig | — |
| 2 | Offerte | Aanvragen | concept/direct, maximumbedrag, geldigheid, opvolgen na, voorwaarden | ja, volledig | — |
| 3 | Betaalherinnering | Facturen | de reeks, maximum, stop bij antwoord, nooit herinneren, kopie bij laatste, betaalgegevens | ja, met bestand of handmatig | boekhoudkoppeling |
| 4 | Reviews | Reviews | vragen na, link, niet na klacht, antwoordmodus | ja, verzoeken en antwoorden | Google Bedrijfsprofiel ophalen/plaatsen |
| 5 | Afspraken | Afspraken | herinneren op, verzetten tot, wachtlijst, na een no-show | ja, met lijst of handmatig | agendakoppeling, WhatsApp |

Vijf commits (`21049ac`, `53eb87e`, `c313367`, `4082ca9`, `5a62040`),
vijf migraties, vijf schermen, vijf sets rekenregels met tests, vijf
PGlite-suites. Alles op GitHub main.

## Wat per agent is gebouwd

### 1. Heractivatie-agent

Technisch de uitgaande e-mailagent met een andere lijst; wat erbij kwam is
precies wat die lijst anders maakt.

- **Wie slapend is** rekent `src/lib/slapend.ts` uit: na het aantal maanden
  dat de klant instelt (standaard twaalf), maar niet ouder dan drie jaar — dan
  is er geen klantrelatie meer om op te leunen. Een onbekende datum telt als
  slapend: bij FJ Snacks hebben de 37 echte oud-klanten geen datum, en juist
  die horen aangeschreven te worden.
- **Met rust gelaten** wordt wie op de lijst staat (adres, domein of
  bedrijfsnaam). **De reden om terug te komen** mag bij de agent staan in
  plaats van bij elke campagne. **Na het maximum** per klant (standaard twee)
  houdt hij op.
- Dezelfde regels gelden bij het **tellen** van de doelgroep als bij het
  klaarzetten — een getal dat anders telt dan er verstuurd wordt is een
  belofte die niet klopt.
- **"Teruggekomen"** is een vinkje op het contact dat alleen de klant kan
  zetten; wij zien geen bestellingen. Het dashboard rekent: teruggekomen ×
  de orderwaarde die hij zelf opgaf, met "jouw schatting" erbij.
- De **datum van de laatste bestelling** komt mee bij het importeren
  (Nederlands, ISO, Excel-serienummers) en bij het aanvullen van een lijst.

### 2. Offerte-agent

Een aanvraag komt binnen per mail op het ontvangstadres van de agent, of wordt
in het portaal ingevoerd; binnen minuten staat er een concept-offerte uit de
prijslijst in de kennisbank.

- **Het model kiest, de server rekent.** Het model krijgt de prijslijst als
  genummerde regels en geeft terug wélke regels in welke aantallen — geen
  bedragen. Een prijs die het verzint wordt nooit gelezen; een regel die niet
  in de lijst staat wordt een fout en geen regel. In het scherm kan de klant
  aantallen aanpassen en regels weghalen, maar geen prijs.
- **Direct versturen** vraagt vier dingen tegelijk: aangezet, beantwoordbaar,
  niets ontbreekt, en onder het maximumbedrag.
- **De opvolging** staat vooruit ingepland bij Resend en wordt ingetrokken
  zodra de klant van de klant ja of nee zegt.
- Kerncijfer: **minuten tussen aanvraag en concept**.

### 3. Betaalherinnering-agent

- De klant leest zijn facturen in (export of handmatig) en stelt de reeks in;
  standaard −3, 3, 14 en 30 dagen rond de vervaldatum.
- **Sjablonen, geen modelwerk**: een herinnering gaat over een bedrag, een
  nummer en een datum. De toon wordt per stap zakelijker, maar hij dreigt
  nooit — de laatste stap zegt dat de ondernemer persoonlijk contact opneemt.
- **Drie remmen**: hoogstens één herinnering per drie dagen, ook bij een
  achterstand; zonder boekhoudkoppeling alleen de eerste twee stappen vanzelf
  en de rest pas als de lijst de afgelopen week is ververst (een herinnering
  voor een betaalde factuur mag nooit); en bij een antwoord van de debiteur
  pauzeert de reeks een week en krijgt de klant het antwoord.
- Kerncijfer: **betaald binnen zeven dagen na een herinnering**.

### 4. Review-agent

- **Verzoeken**: de klant zet klussen klaar (één of een lijst); zoveel dagen
  later als ingesteld gaat de vraag, met de link naar zijn Google-profiel.
  Iedereen dezelfde vraag (geen *review gating*), niet na een klacht, niet
  meer na dertig dagen.
- **Antwoorden**: de klant plakt een review; de agent stelt een antwoord op in
  zijn toon, specifiek over wat er staat, en bij drie sterren of minder
  erkennend zonder te verdedigen. Hij kopieert het naar Google en vinkt het af.
- Kerncijfers: **gemiddelde van de laatste negentig dagen** en **onbeantwoord**
  — precies wat het onderzoek zegt dat telt.

### 5. Afsprakenagent

- Herinneringen op de uren die de klant instelt (standaard 48 en 2 vooraf).
  Een herinnering die te laat zou komen wordt overgeslagen, niet alsnog
  verstuurd.
- **Antwoorden lezen is conservatief**: 'ja' is bevestigd; alles met twijfel
  of een nieuwe wens ("ja, maar kan het ook donderdag?") gaat als *verzetten*
  naar een mens. De agent verzet nooit zelf.
- Na een no-show één vriendelijk bericht; bij een afzegging met wachtlijst aan
  krijgt de eerste die wacht de plek aangeboden.
- Kerncijfer: **no-show-percentage**, plus bevestigd vooraf en de wachtlijst.

## Wat ze delen

- **Geen klok.** Elke ronde (herinneringen, reviewverzoeken, afspraken) lift
  mee op het verkeer, net als het opruimen en de mailboxen. De database of de
  rekenregels bepalen of er werkelijk iets te doen is.
- **Inhoud is van de klant.** Elke nieuwe tabel: eigenaar en team lezen en
  schrijven, een meekijker leest alleen, wij zien niets. De kerncijfers
  (aantallen, bedragen zonder namen) zien wij wel: dat is status.
- **Afzender en ondertekening** per agent, hergebruikt uit supportmail.
- **Antwoorden komen binnen** op het ontvangstadres van de agent, via dezelfde
  webhook als supportmail en campagnes; per soort een eigen afhandeling.

## Hoe het is gecontroleerd

| Controle | Uitslag |
|---|---|
| `bash scripts/test-alles.sh` — alle tests in Europe/Amsterdam én UTC plus typecheck | alles in orde |
| Nieuwe tests: `test-slapend` (38), `test-offerte-regels` (27), `test-herinneringen` (40), `test-reviews` (15), `test-afspraken` (25) | alles in orde, in beide tijdzones |
| Productiebuild | schoon |
| ESLint op alle nieuwe bestanden | schoon |
| PGlite: alle 52 migraties, plus suites voor heractivatie (10), offerte (15), facturen (15), reviews (11), afspraken (11) | alles in orde |

**Wat de tests onderweg vonden:**

- `"€ 7,50."` werd gelezen als 750 — de punt achter het bedrag. Nu eindigt een
  bedrag op een cijfer. Zonder test was dit een offerte van 750 euro geweest.
- Mijn eigen testverwachting bij "hoe lang geleden" klopte niet (14 oktober
  valt nog in de zomertijd); de code had gelijk.
- De eerste test op de catalogus keurde "Maatwerk" af om een regel die daar
  niet hoort te gelden; aangepast met de reden erbij.

## Wat Lovable moet doen

```
Pull main en voer vijf migraties uit, in deze volgorde:
  20261018110000_heractivatie.sql
  20261018120000_offerte_agent.sql
  20261018130000_betaalherinnering.sql
  20261018140000_review_agent.sql
  20261018150000_afspraken_agent.sql
Allemaal herhaalbaar (IF NOT EXISTS, DROP POLICY IF EXISTS). Daarna publiceren
en de databasetypes opnieuw genereren.
```

## Wat er bewust nog niet in zit

- **Boekhoudkoppeling** (Moneybird, e-Boekhouden, Exact Online). Tot die tijd
  de rem op stap drie en verder zonder verse lijst.
- **Google Bedrijfsprofiel**: reviews automatisch ophalen en antwoorden
  plaatsen. Nu plakken en kopiëren; de OAuth-laag van de mailbox is er al.
- **Agendakoppeling** (Google Agenda, Microsoft 365) en **WhatsApp** voor de
  afsprakenagent.
- **Geen website-teksten** over de nieuwe agents. Dat hoort pas als de eerste
  bij een klant draait.

## Volgende stap

De heractivatie-agent bij FJ Snacks: een agent van die soort aanmaken, de 37
oud-klanten erin (of de bestaande contacten met `herkomst = oud_klant`
hergebruiken), de reden om terug te komen invullen, en een eerste campagne op
vijf testadressen.
