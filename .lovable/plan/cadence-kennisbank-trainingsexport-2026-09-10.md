# Cadence kennisbank + trainingsexport

Doel: alle kennis over Cadence op één plek in de database zetten, alleen beheerbaar door jou, en met één knop downloaden als bestand dat je in Pickaxe gebruikt om een AI agent te trainen.

## Wat je krijgt

1. **Nieuwe pagina "Kennis"** in het portaal (alleen zichtbaar voor jou als beheerder)
   - Lijst met kennisstukken, gegroepeerd per categorie
   - Toevoegen, bewerken en verwijderen via een simpel formulier
   - Elk stuk heeft: categorie, titel, inhoud, en optioneel een vraag (voor vraag-en-antwoord)
   - Knop **"Download trainingsbestand"** die alles als één bestand ophaalt (JSON én platte tekst)

2. **Startinhoud die ik alvast klaarzet**, overgenomen uit de bestaande landingspagina zodat je niets hoeft over te typen:
   - Bedrijfsinfo: naam Cadence, positionering, doelgroep, toon-of-voice
   - De drie agents (Sales AI Agent, Inbox Draft Assistant, WhatsApp Follow-up Agent): omschrijving, alle stappen en het resultaat per agent
   - Voordelen en kernboodschappen
   - Alle veelgestelde vragen met antwoorden
   - Aanbod/proces: gratis demo van 30 minuten, "vandaag geboekt, deze week live"

3. **Prijzen en pakketten**: ik zet lege placeholders klaar met de juiste structuur (pakketnaam, prijs, wat inbegrepen is, doorlooptijd). Die vul je zelf in via de Kennis-pagina — ik heb je echte tarieven niet.

4. **Klantvragen en antwoorden**: je voegt ze zelf toe via dezelfde pagina; de veelgestelde vragen van de site staan er al in als startset.

## Categorieën

bedrijf · agents · prijzen · veelgestelde vragen · bezwaren · proces · overig

## Technisch

- Nieuwe tabel `knowledge_items` (categorie, titel, vraag, inhoud, tags, volgorde, actief-vlag, tijdstempels) met toegangsregels die alleen de beheerdersrol lees- en schrijfrechten geven; klanten zien niets.
- Startinhoud wordt in dezelfde migratie meegeleverd als vaste regels.
- Serverfuncties in `src/lib/knowledge.functions.ts`: lijst, opslaan, verwijderen, en export — allemaal achter de beheerderscontrole die al in `dashboard.functions.ts` wordt gebruikt.
- Nieuwe route `src/routes/_authenticated/knowledge.tsx` in de bestaande Cadence-stijl, plus een link "Kennis" in de bovenbalk die alleen voor beheerders verschijnt.
- Export levert twee formaten: een JSON-array (per item categorie/titel/vraag/inhoud) en een platte-tekstversie met kopjes — beide gaan als download naar je computer.
