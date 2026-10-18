# Rapport: wat er nodig was om elke agent operationeel te maken

> 19 oktober 2026. De vraag was: wat moet er nog gebeuren voor de nieuwe
> agents, en wat ontbreekt er bij de bestaande om ze echt te kunnen gebruiken.
> Dit is de uitkomst van die controle, en wat erop gebouwd is.

## De controle

Per soort is nagelopen: kan een klant hem kiezen, instellen, voeden en
gebruiken — en klopt wat de catalogus belooft met wat er draait?

| Soort | Bevinding | Gedaan |
|---|---|---|
| Chat-assistent | twee knoppen beloofden iets wat niet bestond: onbeantwoorde vragen verzamelen, doorverwijzen naar een mens | allebei gebouwd |
| Inbox-assistent | operationeel via doorsturen; mailboxkoppeling wacht op sleutels; nog niet door jou getest | — (test bij jou) |
| Uitgaande e-mailagent | geen zicht op of het verzenddomein mag versturen (SPF/DKIM/DMARC) | domeincontrole op het campagnescherm |
| Sales-assistent | bestond alleen als soort; zes knoppen zonder iets erachter | volledig gebouwd (v1) |
| WhatsApp-opvolger | vraagt een zakelijk nummer en sjablonen bij Meta | blijft "in voorbereiding", eerlijk zo genoemd |
| Heractivatie, Offerte, Betaalherinnering, Reviews, Afspraken | operationeel; afzender en ontvangstadres zijn per agent in te stellen | — |
| Alle soorten | het dagoverzicht per mail stond overal als "binnenkort" | gebouwd voor alle soorten |

Nog "binnenkort", bewust: boekhoudkoppeling, Google Bedrijfsprofiel, agenda-
en CRM-koppeling, WhatsApp. Elk een externe koppeling; de kluis en het
ontkoppelen zijn er al.

## Wat er is gebouwd

- **Sales-assistent.** Leads per mail, uit de chat-assistent van dezelfde klant
  (overgenomen, niet verplaatst) en met de hand. Beoordeling tegen "wie past
  bij jou": past, past niet, twijfel. Eerste antwoord klaar; direct versturen
  alleen bij "past", zonder open vragen, als de klant dat aanzette. Twijfel
  gaat altijd naar een mens; een afwijzing gaat nooit vanzelf. Scherm Leads,
  kerncijfers: minuten tot het eerste antwoord, passen/twijfel, afspraken,
  gewonnen.
- **Dagoverzicht.** Elke werkdag na 08:00 Nederlandse tijd, één mail per agent
  per dag (tabel `dagrapporten` als slot), met per soort de twee of drie
  getallen van gisteren en wat op de klant wacht, plus een knop naar het
  juiste scherm. Aan te zetten per agent.
- **Onbeantwoorde vragen (chat).** Elke beurt waarin de assistent "dat weet ik
  niet" moest zeggen wordt gemarkeerd; het scherm Gesprekken toont ze
  ontdubbeld met het aantal, en één klik zet vraag + antwoord in de kennisbank.
- **Doorverwijzen naar een mens (chat).** Met de optie aan biedt hij bij een
  onbekende vraag in dezelfde zin aan de vraag door te geven, via het
  bestaande contactgereedschap.
- **Domeincontrole.** SPF, DKIM (resend._domainkey) en DMARC van het
  afzenderdomein, opgevraagd via DNS-over-HTTPS en beoordeeld met uitleg per
  onderdeel. Op het campagnescherm, onder het afzenderadres.

## Hoe het is gecontroleerd

| Controle | Uitslag |
|---|---|
| `bash scripts/test-alles.sh` (twee tijdzones + typecheck) | alles in orde |
| Nieuwe tests: `test-sales` (15), `test-domeingezondheid` (11) | alles in orde |
| PGlite: alle migraties, plus `test-sales` (11) en `test-onbeantwoord` (6) | alles in orde |
| Build en lint op alle nieuwe bestanden | schoon |

Eén ding dat de test ving: het domein uit "Frank <verkoop@fjsnacks.nl>" werd
niet herkend door het haakje achter het adres. Nu wel.

## Wat Lovable moet doen

```
Pull main en voer twee migraties uit: 20261019100000_sales_assistent.sql en
20261019110000_chat_onbeantwoord_en_dagrapport.sql. De tweede dropt
noteer_chatbeurt() en maakt hem opnieuw aan met een extra parameter (bedoeld).
Daarna publiceren en de databasetypes opnieuw genereren.
```

## Het klantdocument

`documenten/onze-ai-agents.pdf` (en `.html` om aan te passen): alle tien de
agents, per agent wat hij doet, voor wie, hoe het in de praktijk gaat, wat de
klant ziet en instelt, en wat hij nooit doet. Plus welke combinaties samen
sterk zijn en hoe we beginnen. Zonder bedragen; die staan op de site.
