# De WhatsApp-opvolger aanzetten

> Voor Wouter. De code staat klaar en is getest; dit zijn de stappen bij Meta
> en Lovable die alleen jij kunt doen, omdat er een Meta-bedrijfsaccount, een
> telefoonnummer en een betaalmethode aan vastzitten. Reken op een dagdeel,
> plus een tot enkele dagen wachten op de goedkeuring van het sjabloon.
>
> Laatst bijgewerkt: 19 oktober 2026.

## Wat het oplevert

Klanten appen het zakelijke nummer van de ondernemer; de agent antwoordt uit de
kennisbank. Bij een klacht, een annulering, een woord van de overdrachtlijst,
een foto of spraakbericht, of iets wat hij niet weet, zwijgt hij en krijgt de
ondernemer een mail met een knop naar het gesprek. En: leads van de
sales-assistent die een nummer achterlieten en na het eerste antwoord stil
bleven, krijgen een opvolgbericht — met een klik, of vanzelf als de klant dat
aanzet.

## De regels van WhatsApp (dit is waarom het zo gebouwd is)

- **24-uursvenster.** Vrij antwoorden mag alleen binnen 24 uur na het laatste
  bericht van de klant. Daarbuiten weigert Meta het bericht. Het scherm zegt
  dat dan ook, en de agent probeert het niet eens.
- **Zelf beginnen = sjabloon.** Een gesprek openen kan alleen met een
  berichtsjabloon dat Meta vooraf heeft goedgekeurd. Daarom is de opvolging
  een vaste tekst en geen vrij geschreven appje.
- **Toestemming.** Meta eist dat de ontvanger heeft ingestemd met berichten.
  Een lead die zelf zijn nummer achterliet bij een aanvraag, vraagt om contact;
  dat is de grondslag. Zet op het contactformulier van de klant "we nemen
  contact op per mail of WhatsApp" — dan is het ook op papier netjes.
- **Kosten.** Meta rekent per gesprek (per 24 uur), in Nederland ongeveer
  € 0,05–0,07 voor een utility-gesprek en meer voor marketing. Een antwoord op
  een vraag van de klant is in de regel goedkoper dan zelf beginnen.

## 1. Meta: bedrijf, app en nummer

1. Ga naar [business.facebook.com](https://business.facebook.com) en zorg dat
   er een **Business Portfolio** van Zakelijke AI Agents is (bedrijfsverificatie
   is nodig voordat het nummer uit de proefstand mag).
2. Ga naar [developers.facebook.com](https://developers.facebook.com) → **Mijn
   apps** → **App maken** → type *Business*, naam bijvoorbeeld "Zakelijke AI
   Agents WhatsApp". Koppel aan het portfolio.
3. Voeg het product **WhatsApp** toe aan de app.
4. Onder **WhatsApp → API Setup** staat een testnummer. Voor echt gebruik voeg
   je het nummer van de klant toe (**Add phone number**): een nummer dat nog
   niet bij WhatsApp in gebruik is, of een bestaand zakelijk nummer dat de
   klant van de gewone WhatsApp Business-app losmaakt. Verifieer per sms of
   spraak.
5. Noteer bij dat nummer het **Phone number ID** (een lang getal). Dat gaat
   straks per agent in de optie *Nummer-id bij Meta*.

## 2. De drie geheimen voor Lovable

| Geheim | Waar vandaan |
|---|---|
| `WHATSAPP_TOKEN` | Business Settings → **System users** → maak een systeemgebruiker (admin) → *Generate token* voor de app met de rechten `whatsapp_business_messaging` en `whatsapp_business_management`, zonder vervaldatum. (Het token op de API Setup-pagina verloopt na 24 uur; dat is alleen om te proberen.) |
| `WHATSAPP_APP_SECRET` | App-dashboard → **App settings → Basic** → *App secret* (Show). Hiermee controleert de server de handtekening van elke webhook. |
| `WHATSAPP_VERIFY_TOKEN` | Zelf verzinnen: `openssl rand -hex 16`. Meta stuurt dit terug bij het instellen van de webhook, zodat alleen jouw webhook-registratie slaagt. |

Zet ze bij Lovable als geheimen, net als `POSTVAK_SLEUTEL`. Zonder deze drie
doet de code niets en zegt het scherm dat de koppeling wordt ingesteld.

## 3. De webhook

App-dashboard → **WhatsApp → Configuration** → *Webhook* → **Edit**:

- Callback URL: `https://zakelijkeaiagents.nl/api/whatsapp`
- Verify token: de waarde van `WHATSAPP_VERIFY_TOKEN`

Meta doet dan een GET naar dat adres; de server antwoordt met de challenge en
Meta zet "geverifieerd". Daarna bij **Webhook fields** het veld **messages**
aanzetten (*Subscribe*). Dat ene veld brengt zowel binnenkomende berichten als
bezorgstatussen.

Controle: stuur vanaf je eigen telefoon een appje naar het nummer. Binnen
seconden hoort het gesprek op `/whatsapp` te staan, met een antwoord uit de
kennisbank (of een overdracht als die leeg is).

## 4. Het sjabloon voor opvolging

App-dashboard → **WhatsApp → Message templates** → **Create template**:

- Categorie: **Utility** (geen Marketing: duurder en strenger beoordeeld)
- Naam: `opvolging_lead` (kleine letters, underscores)
- Taal: Nederlands (`nl`)
- Body:

  > Hoi {{1}}, je vroeg onlangs informatie aan bij {{2}}. We hebben je per
  > mail geantwoord; heb je nog vragen, dan kun je hier gewoon reageren.

- Voorbeeldwaarden bij het indienen: `Piet` en `FJ Snacks`.

De code vult {{1}} met de voornaam van de lead ("daar" als die ontbreekt) en
{{2}} met de afzendernaam van de agent. **Precies twee invulvelden, in deze
volgorde** — een sjabloon met een ander aantal wordt door Meta geweigerd bij
het versturen, en dat zie je dan als "mislukt" bij het bericht.

Goedkeuring duurt meestal minuten tot een dag. Zet daarna de naam in de optie
*Sjabloon voor opvolging* van de agent. Wil je een andere taal, zet de code
(bv. `en`) in de optie `sjabloon_taal` — die staat niet in de catalogus en is
alleen via de database te zetten; standaard `nl`.

## 5. Per agent, in Beheer

Maak een agent van het soort **WhatsApp-opvolger** voor de klant en vul in:

- *WhatsApp-nummer*: zoals de klant het wil zien, bv. `+31 6 1234 5678`
- *Nummer-id bij Meta*: het Phone number ID uit stap 1
- *Sjabloon voor opvolging*: `opvolging_lead` (na goedkeuring)

De klant vult daarna zelf: zijn venster om zelf te beginnen (standaard
09:00–18:00, werkdagen), de overdrachtwoorden, of leads vanzelf opgevolgd
worden, en na hoeveel dagen. Afzendernaam en ondertekening haalt de agent uit
dezelfde instellingen als de andere agents (`support_instellingen`): de naam
is wat in het sjabloon als {{2}} verschijnt.

Zet de **kennisbank** van deze agent vol: openingstijden, levergebied,
assortiment, hoe bestellen werkt. Alles wat er niet in staat, draagt hij over.

## Wat er nog niet is

- **Berichtkosten doorbelasten**: de optie staat in de catalogus als
  "binnenkort"; er is geen facturatie om het op te zetten.
- **Herinneringen van de afsprakenagent via WhatsApp**: daarvoor is een tweede
  sjabloon nodig; bouwen zodra de eerste klant WhatsApp draait.
- **Media**: foto's en spraakberichten leest de agent niet; hij draagt over.
