# De mailboxkoppeling aanzetten

> Voor Wouter. De code staat klaar; dit zijn de stappen bij Google, Microsoft
> en Lovable die alleen jij kunt doen, omdat er een account en een creditcard
> aan vastzitten. Reken op een uur voor Microsoft en een uur plus wachttijd
> voor Google.
>
> Laatst bijgewerkt: 14 oktober 2026.

## Wat het oplevert

Zonder koppeling stuurt een klant zijn supportmail naar ons door. Dat werkt,
maar het concept staat in óns portaal en het antwoord vertrekt vanaf óns adres.

Met koppeling leest de agent de map die de klant aanwijst, zet hij het concept
als echte conceptmail in diens eigen Postvak IN — onder de vraag, in hetzelfde
gesprek — en vertrekt het antwoord vanaf het eigen adres van de klant. Die
klant werkt gewoon in Gmail of Outlook.

## 1. De sleutel voor de kluis

De toegangstokens staan versleuteld in de database. Die sleutel maak je één
keer, op je eigen Mac:

```bash
openssl rand -base64 32
```

Bewaar de uitkomst als geheim `POSTVAK_SLEUTEL` bij Lovable. **Raak je hem
kwijt, dan werkt geen enkele bestaande koppeling meer** en moet elke klant
opnieuw koppelen. Zet hem dus ook in je wachtwoordkluis.

## 2. Google (Gmail en Google Workspace)

1. Ga naar console.cloud.google.com en maak een project, bijvoorbeeld
   "Zakelijke AI Agents".
2. Zet de **Gmail API** aan (APIs & Services → Library → Gmail API → Enable).
3. Vul het **OAuth consent screen** in. Kies "External". Vul in: naam van de
   app, support-e-mail, logo, je domein, en links naar
   `zakelijkeaiagents.nl/privacyverklaring` en `/veiligheid`. Die laatste twee
   heb je al, en Google kijkt er werkelijk naar.
4. Voeg de scope toe: `https://www.googleapis.com/auth/gmail.modify`.
5. Maak een **OAuth client ID** van het type "Web application" met als
   redirect-URI exact:
   `https://zakelijkeaiagents.nl/api/postvak/terug`
6. Zet de client-id en het secret bij Lovable als `GOOGLE_CLIENT_ID` en
   `GOOGLE_CLIENT_SECRET`.

**Let op, dit bepaalt je planning.** `gmail.modify` is bij Google een
*restricted scope*. Zolang je app in testmodus staat, kun je tot honderd
gebruikers koppelen; die zien eenmalig een scherm dat de app niet geverifieerd
is. Dat is prima voor je eerste klanten. Wil je het breed aanbieden, dan moet
de app door verificatie, inclusief een jaarlijkse beveiligingsaudit (CASA) door
een door Google erkende partij. Dat kost geld en weken doorlooptijd. Begin dus
in testmodus en start het traject pas als een klant erom vraagt.

## 3. Microsoft (Outlook en Microsoft 365)

1. Ga naar portal.azure.com → Microsoft Entra ID → App registrations → New.
2. Kies bij "Supported account types" de optie voor accounts in **elke**
   organisatiemap én persoonlijke Microsoft-accounts. Anders kunnen alleen
   jouw eigen collega's koppelen.
3. Redirect-URI (type Web): `https://zakelijkeaiagents.nl/api/postvak/terug`
4. Bij "API permissions" → Microsoft Graph → Delegated: `Mail.ReadWrite`,
   `Mail.Send`, `offline_access`, `openid`, `email`, `profile`.
5. Bij "Certificates & secrets" een client secret maken. **Noteer de waarde
   meteen**; hij is daarna niet meer te lezen. Let op de vervaldatum — zet een
   herinnering, want een verlopen secret breekt alle koppelingen tegelijk.
6. Zet ze bij Lovable als `MICROSOFT_CLIENT_ID` en `MICROSOFT_CLIENT_SECRET`.

Geen verificatietraject zoals bij Google. Wel kan de IT-beheerder van een
zakelijke klant toestemming moeten geven ("admin consent"); dat is één klik bij
hen.

## 4. Nog één variabele

`SITE_URL` op `https://zakelijkeaiagents.nl`. Die gebruikt de server om het
terugkomstadres te bouwen. Staat hij er niet, dan valt hij terug op precies dat
adres, dus in productie gaat het sowieso goed — maar expliciet is beter.

## 5. Testen

1. Log in als een klant met een inbox-assistent, ga naar Supportmail.
2. Vul bij "Of koppel je mailbox" de map in. `INBOX` is alles wat binnenkomt;
   beter is een eigen label of map (bij Gmail bijvoorbeeld `Support`, aangemaakt
   met een eigen filterregel). Dan geeft de klant ons precies dat deel.
3. Druk op koppelen, log in, geef toestemming. Je komt terug op Supportmail met
   een bevestiging.
4. Stuur een testvraag naar dat adres. Binnen een paar minuten hoort hij in het
   portaal te staan én als concept in de mailbox zelf.

De agent kijkt hoogstens eens per drie minuten, en alleen als er verkeer op de
site is: dit project heeft geen eigen klok. Voor supportmail is dat ruim genoeg.
Gebeurt er niets, kijk dan bij de koppeling: daar staat wanneer er voor het
laatst gekeken is en wat er eventueel misging.

## Wat een klant hierover mag weten

- We lezen alleen de map die hij aanwijst, niet zijn hele mailbox.
- De toegang staat versleuteld opgeslagen, in een deel van de database dat niet
  via de API bereikbaar is.
- Hij verbreekt de koppeling zelf, met één knop, zonder ons.
- Verbreekt hij hem, dan werkt supportmail weer via doorsturen — of helemaal
  niet meer, net wat hij wil.
