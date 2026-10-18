# Rapport: vijf nieuwe agentsoorten in het beheer

> 18 oktober 2026. Wat er is gedaan om de vijf agents uit
> `voorstel-nieuwe-agents.md` kiesbaar te maken in het beheer, hoe het is
> gecontroleerd, en wat er nog moet gebeuren voordat ze iets doen.

## Wat er nu kan

In het beheer staan bij "+ Agent toevoegen" vijf nieuwe soorten, in de
bouwvolgorde uit het voorstel, tussen de bestaande soorten en "Maatwerk":

| # | Soort | Kerncijfers op het dashboard | Eigen schermen |
|---|---|---|---|
| 6 | Heractivatie-agent | klanten aangeschreven · teruggewonnen | contacten, campagnes, berichten, antwoorden (+ bezorgen optioneel) |
| 7 | Offerte-agent | offertes opgesteld · geaccepteerd | nog geen; toont wat eraan komt |
| 8 | Betaalherinnering-agent | herinneringen verstuurd · betaald na herinnering | nog geen; toont wat eraan komt |
| 9 | Review-agent | reviewverzoeken · reviews ontvangen | nog geen; toont wat eraan komt |
| 10 | Afsprakenagent | afspraken bevestigd · no-shows voorkomen | nog geen; toont wat eraan komt |

Kies je er een voor een klant, dan werkt alles wat voor elke agent geldt:
status (in opbouw / live / gepauzeerd), de kennisbank, het logboek, de
kerncijfernamen die alvast ingevuld staan, en het optiescherm. In het portaal
ziet de klant onder "binnenkort" wat de agent straks laat zien, in plaats van
een leeg vak.

**Alleen de heractivatie-agent doet vandaag al iets.** Hij deelt de complete
machine van de uitgaande e-mailagent: contacten importeren, campagnes
klaarzetten en versturen, opvolgen, antwoorden lezen, afmelden, de bounce-rem,
het verzendvenster. Zijn vijf eigen knoppen (slapend na, reden om terug te
komen, hoogstens zoveel berichten, nooit aanschrijven, orderwaarde) staan er
nog als "binnenkort". De andere vier staan op "in opbouw" tot ze gebouwd zijn.

## De knoppen in de catalogus

Alle knoppen uit het voorstel staan in `src/lib/agent-opties.ts`, op
`gebouwd: false`. Ze zijn zichtbaar maar uitgeschakeld, met "komt eraan" erbij
— een schakelaar die niets doet zou iets beloven wat niet gebeurt.

| Soort | Knoppen | Waarvan de klant zelf zet | Nog te bouwen |
|---|---|---|---|
| Heractivatie | 17 | 12 | 6 (de 5 eigen + dagrapport) |
| Offerte | 13 | 10 | 6 |
| Betaalherinnering | 13 | 9 | 7 |
| Reviews | 12 | 8 | 6 |
| Afspraken | 13 | 9 | 7 |

Eén ontwerpkeuze die het noemen waard is: de knoppen van de uitgaande
e-mailagent staan nu in één lijst (`UITGAAND`) die de heractivatie-agent
hergebruikt in plaats van kopieert. Een rem die we voor de één bouwen, kan zo
nooit bij de ander ontbreken.

## Waarom de heractivatie-agent een toevoeging is voor FJ Snacks

Frank heeft al een uitgaande e-mailagent, dus de vraag is terecht. Het
antwoord zit in zijn eigen lijst.

**Zijn lijst bestaat voor het grootste deel uit precies de mensen waar deze
agent voor is.** Van de 248 contacten zijn er 37 écht oud-klant: ze vertrokken
nadat de vorige eigenaar overleed en het bedrijf werd overgenomen. Dat is geen
koude lijst en geen prospectlijst — het zijn slapende klanten met een
geschiedenis, en de eerste mail hoort dat eerlijk te benoemen. De
Proefpakket-agent behandelt ze nu als één campagne tussen de koude leads. De
heractivatie-agent maakt er wat het is: een eigen agent met een eigen verhaal,
een eigen toon en een eigen cijfer.

**Het cijfer is anders.** Bij de Proefpakket-agent telt de trechter:
aangeschreven → bezorgd → reactie → afspraak. Bij heractivatie telt maar één
ding: *hoeveel klanten zijn er terug, en wat was dat waard*. Frank vult zijn
gemiddelde orderwaarde in en ziet per maand wat de agent heeft opgeleverd.
Dat is het getal waarmee je een volgende klant overtuigt.

**Het is geen eenmalige campagne maar een vaste gewoonte.** Vandaag gaat het om
die 37. Maar FJ Snacks heeft vaste klanten die elke week hun kip krijgen, en
daar vallen er af — stilletjes, zonder opzegging. Met "slapend na 3 maanden"
als filter ziet de agent dat vanzelf en schrijft hij aan voordat Frank het zelf
merkt. Dat is het verschil tussen een actie en een agent.

**De remmen zijn ingebouwd.** Hoogstens twee berichten per klant (wie dan niet
reageert, wil niet), een lijst "nooit aanschrijven" voor relaties waar Frank
zelf achteraan gaat, en de bounce-rem en het verzendvenster van de
e-mailagent. Zijn verzenddomein — net ingericht, net opgewarmd — blijft
daarmee even beschermd als bij de proefpakketten.

**En het kost bijna niets.** De schermen die Frank kent (contacten,
campagnes, berichten, antwoorden) zijn dezelfde. Wat nieuw is, is een filter op
"laatste aankoop", de vijf knoppen en een dashboardtegel. Daarom staat hij als
eerste in de bouwvolgorde: binnen een week kan hij bij FJ Snacks draaien.

## Hoe het is gecontroleerd

| Controle | Uitslag |
|---|---|
| Typecheck (`tsc`) | schoon |
| Productiebuild (`npm run build`) | schoon |
| ESLint op de gewijzigde bestanden | schoon |
| `bash scripts/test-alles.sh` — alle tests in Europe/Amsterdam én UTC plus typecheck | alles in orde |
| Nieuwe test `scripts/test-catalogus.ts` (nu onderdeel van de suite) | alles in orde |
| Alle 47 migraties in PGlite, inclusief de nieuwe | zonder fout |
| De enum kent alle vijf soorten; van elk is een agent aangemaakt | ja |
| De migratie een tweede keer draaien (Lovable's tool kan dat doen) | zonder fout |
| De drie bestaande databasesuites (bounces, gesprekken, postvak) | alles in orde |

**De nieuwe test** controleert wat eerder twee keer stil misging: geen dubbele
sleutels per soort, elke keuze heeft minstens twee opties en een geldige
standaard, elke getalknop heeft een standaard binnen zijn eigen grenzen, elke
"elders"-verwijzing wijst naar een pad, de klant ziet altijd minder knoppen
dan de beheerder, en de heractivatie-agent heeft werkelijk de remmen van de
e-mailagent. Hij draait voortaan mee in `test-alles.sh`.

**Twee dingen die onderweg misgingen, en wat ik ermee deed:**

- De nieuwe test keurde "Maatwerk" af: geen schermen, geen "binnenkort". Dat
  is daar bedoeld — bij maatwerk zijn de handmatige dagcijfers de afspraak,
  geen tussenstand. De regel geldt nu voor alle soorten behalve maatwerk, met
  die reden erbij in de test.
- De lokale Postgres-proef (PGlite in de scratchpad) bleek kapot: de map was
  deels opgeruimd, het pakket half weg. Opnieuw geïnstalleerd en de
  migratierunner teruggezet, daarna alles gedraaid. Zonder die proef had ik
  alleen kunnen zéggen dat de enum-migratie klopt.

## Wat Lovable moet doen

```
Pull main en voer de migratie uit: supabase/migrations/20261018100000_vijf_nieuwe_agentsoorten.sql.
Die voegt vijf waarden toe aan de enum agent_kind (ADD VALUE IF NOT EXISTS, herhaalbaar).
Daarna publiceren en de databasetypes opnieuw genereren — anders kent TypeScript
bij jullie de nieuwe soorten niet.
```

## Wat er bewust níét is gedaan

- Geen tabellen voor offertes, facturen, reviews of afspraken. Die komen per
  agent, op het moment dat hij gebouwd wordt, met een eigen testsuite — zoals
  bij de bounce-rem.
- Geen nieuwe schermen in het portaal. Een leeg scherm "Facturen" zonder
  facturen is erger dan "komt eraan".
- Geen aanpassing van de website. De vijf staan nog niet in het aanbod; dat
  hoort pas als de eerste ervan draait.

## Volgende stap

De heractivatie-agent afbouwen: filter op laatste aankoop, de vijf knoppen
laten werken, de dashboardtegel "teruggewonnen". Daarna de offerte-agent.
