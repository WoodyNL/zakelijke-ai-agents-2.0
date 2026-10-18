# Vijf nieuwe agents — voorstel

> Onderzoek van 18 oktober 2026: wat AI-agencies het meest verkopen, wat het
> Nederlandse mkb volgens de cijfers echt dwarszit, en wat daarvan past op wat
> we al gebouwd hebben. Vijf voorstellen, met per agent wat de klant ziet, wat
> hij zelf mag instellen, en wat het kost om te bouwen.
>
> Niets hiervan staat al in de code. Na akkoord komen ze als agentsoort in het
> beheer, kies je ze net als de andere, en staan ze op "in opbouw" tot ze
> gebouwd zijn.

## In het kort

| # | Agent | Lost op | Bouwt op wat er al is | Inspanning |
|---|---|---|---|---|
| 1 | **Offerte-agent** | aanvragen die dagen blijven liggen | kennisbank, prijslijst-upload, inkomende mail, concept-eerst | middel |
| 2 | **Betaalherinnering-agent** | 15% van de facturen te laat, 3% nooit; €20.000 per jaar weg | e-mailagent (verzenden, opvolgen, venster, bounces) | middel |
| 3 | **Heractivatie-agent** | klanten die stilletjes zijn weggezakt | de e-mailagent bijna één op één; `herkomst = oud_klant` bestaat al | klein |
| 4 | **Review-agent** | te weinig recente reviews, onbeantwoorde reviews | mail na afloop, kennisbank voor de toon, concept-eerst | klein–middel |
| 5 | **Afsprakenagent** | no-shows en lege gaten in de agenda | de nieuwe Google/Microsoft-koppeling (agenda i.p.v. mailbox) | groot |

**Aanbevolen volgorde: 3 → 1 → 2 → 4 → 5.** De heractivatie-agent is bijna
gratis omdat hij een voorinstelling van de e-mailagent is, en hij geeft een
verkoopverhaal met een getal erbij ("gevonden geld, zonder advertenties"). De
offerte-agent is jouw eigen voorbeeld en heeft het sterkste bewijs van alle vijf.
De betaalherinnering heeft het sterkste Néderlandse bewijs. Review en afspraken
volgen; de laatste pas als de agendakoppeling gebouwd is.

---

## 1. Wat de markt zegt

### Wat agencies verkopen

De pakketten die bij AI-agencies het vaakst terugkomen — in hun eigen
aanbod, in de trainingen waarmee nieuwe agencies worden opgeleid, en in de
software die speciaal voor agencies wordt gemaakt:

- **Klantenservice-agent** op website en mail, getraind op de kennisbank van de
  klant. Setup $5.000–15.000 plus $1.500–4.000 per maand wordt genoemd. *Dit
  hebben wij: chat-assistent en inbox-assistent.*
- **AI-receptionist / voice agent** die de telefoon opneemt en afspraken boekt.
  Veel vendoren, veel marketing, vaste maandprijzen vanaf ~$49.
- **Afspraken zetten en no-shows terugwinnen** (speed-to-lead, herinneringen,
  opnieuw inplannen).
- **Database-heractivatie**: oude leads en klanten opnieuw aanschrijven. Wordt
  aangeraden als *eerste* dienst voor beginnende agencies omdat hij zonder
  advertentiebudget direct omzet laat zien; vaak afgerekend per afspraak.
- **Gemiste oproep → sms terug** (missed-call text-back). Amerikaans, leunt op
  sms.
- **Review-automatisering**: na een klus vragen om een Google-review en
  antwoorden op reviews.
- **Factuuropvolging / debiteuren**: herinneringen die een mens anders vergeet.
- **Offertes automatiseren**: van aanvraag naar concept-offerte in minuten.
- Daarnaast: sales-automatisering, social media, en nicheversies van dit alles
  (vastgoed, zorg, juridisch) die 2–3× zoveel opbrengen.

Twee kanttekeningen die eerlijk vermeld horen te worden. Bijna al deze bronnen
zijn van partijen die er zelf aan verdienen; de omzet- en margecijfers spreken
elkaar tegen. En de meeste "resultaten" (98% open rate, 30–50% teruggewonnen
oproepen) hebben geen traceerbare studie achter zich. Wat wél standhoudt staat
hieronder per agent.

### Wat het Nederlandse mkb zegt (Exact MKB Barometer 2026, Markteffect, n = 1.719)

Dit is de enige grote, recente, Nederlandse bron met een nette steekproef
(mkb-bedrijven van 2–250 medewerkers, Q1 2026). De cijfers die ons voorstel
dragen:

- **Betalen is het grootste probleem in de administratie.** "Klanten op tijd
  laten betalen" staat bovenaan (30%), al jaren. Gemiddeld **15% van de
  facturen wordt te laat betaald, 3% nooit; 67% loopt daardoor omzet mis,
  gemiddeld €20.000 per jaar.**
- **Er zijn geen mensen.** 46% heeft openstaande vacatures (gemiddeld 5 fte);
  het tekort leidt bij 56% tot drukte en stress. Het grootste obstakel om te
  automatiseren is niet geld maar **"gebrek aan tijd / geen mensen"
  (39%)**, dan budget (34%), dan kennis (26%).
- **CRM-processen zijn het minst geautomatiseerd**: 26% volledig. Alles wat
  met klantcontact te maken heeft, ligt dus nog grotendeels open.
- **AI wordt oppervlakkig gebruikt.** 70% gebruikt AI (6% in 2024), maar 56%
  daarvan "om sneller teksten te schrijven en afbeeldingen te genereren". En
  **47% zegt: "we weten niet goed hoe we gebruik kunnen maken van AI."**

Dat laatste is ons verkoopverhaal in één zin: het mkb chat met AI, maar laat
AI nog niets dóén. Onze agents doen het saaie werk — en de vijf hieronder zijn
gekozen op precies de pijn die dit onderzoek meet.

*(Exact staat overname van de resultaten toe met bronvermelding, niet voor
commerciële doeleinden. Intern en in een gesprek: prima. Op de website: alleen
met bronvermelding en in bescheiden vorm.)*

### Wat we al hebben, en waar het gat zit

| Soort | Status | Doet |
|---|---|---|
| Chat-assistent | live | vragen op de website beantwoorden uit de kennisbank |
| Uitgaande e-mailagent | live (FJ Snacks) | campagnes, opvolging, navraag, afmelden, bounce-rem, verzendvenster |
| Inbox-assistent (supportmail) | gebouwd, te testen | concept of direct antwoord op supportmail, per onderwerp |
| Sales-assistent | alleen als soort | — |
| WhatsApp-opvolging | alleen als soort | — |

Alles wat we hebben, gaat over *binnenkomende vragen* en *uitgaande
campagnes*. Wat ontbreekt is alles wat op een **gebeurtenis** reageert — een
aanvraag, een vervallen factuur, een afgeronde klus, een afspraak morgen. Dat
is waar de vijf voorstellen zitten.

---

## 2. De vijf agents

### Agent 1 — Offerte-agent

**Wat hij doet.** Een offerteaanvraag komt binnen (formulier, mail, of
doorgestuurd). Binnen minuten staat er een concept-offerte klaar, opgebouwd
uit de prijslijst en de regels van de klant: welke diensten, welke staffels,
wat er standaard wel en niet bij zit, reistijd of bezorgkosten. De klant kijkt
na, past aan, verstuurt. Blijft een aanvraag liggen, dan krijgt hij een por.
Na verzending volgt de agent op: "Heb je nog vragen over de offerte?"

**Voor wie.** Iedereen die meer dan een paar offertes per week maakt en ze
niet dezelfde dag de deur uit krijgt: installateurs, schilders, hoveniers,
schoonmaak, catering, evenementen, fotografen, kleine aannemers,
B2B-dienstverleners.

**Waarom dit verkoopt.**
- Snelheid wint. Een onafhankelijk onderzoek onder 466 Amerikaanse
  installatiebedrijven: **95% reageerde niet binnen vijf minuten op een
  aanvraag via de website, 71% niet binnen een uur, en 40% reageerde
  helemaal niet.** Wie wél snel is, steekt er dus met kop en schouders
  bovenuit. (Valve+Meter, 2018, via vakpers.)
- Het effect op de doorlooptijd is groot en consistent: 30–90% minder tijd
  per offerte in de leverancierscases. Eén gedocumenteerd klein bedrijf (9
  man, schoonmaak): van 6,3 uur naar 5 minuten per offerte, en de
  sluitingskans van 22% naar 31% in 90 dagen. Zelf gemeten, niet
  gecontroleerd — maar het is de meest geloofwaardige mkb-case die er is.
- Het is het probleem dat de ondernemer zélf voelt: offertes maak je 's
  avonds, en dan maak je er drie in plaats van zeven.

**Wat we al hebben.** De kennisbank, de prijslijst-upload (`prijs-upload.tsx`
bestaat), inkomende mail via Resend, het concept-eerst-principe en de
onderwerpcategorieën uit supportmail, het opvolgmechanisme van de e-mailagent.

**Wat de klant ziet.**
- Dashboard: aanvragen binnen → concept klaar in gemiddeld *x* minuten →
  verstuurd → geaccepteerd. Kerncijfer: *gemiddelde reactietijd op een
  aanvraag* (dat is het getal dat verkoopt) en *acceptatiegraad*.
- Scherm "Aanvragen": elke aanvraag met het concept, een knop
  *Versturen*, *Aanpassen*, *Zelf doen*. Wat vaak wordt aangepast, is een
  signaal dat de prijslijst niet klopt.
- Knoppen in de catalogus: *Concept of direct versturen* (standaard concept);
  *Maximaal offertebedrag zonder jouw oog* (direct alleen onder dit bedrag);
  *Geldigheidsduur*; *Opvolgen na x dagen*; *Standaardvoorwaarden-bijlage*;
  *Prijslijst* (verwijzing naar het bestaande scherm).

**Mens in de lus.** Concept is standaard; direct alleen onder een bedrag dat
de klant zelf zet. Geen kortingen die niet in de prijslijst staan. Bij een
aanvraag die niet in de prijslijst past: "ik bel je" in plaats van een
verzonnen bedrag — dezelfde regel als bij supportmail.

**Inspanning: middel.** Een nieuwe tabel voor aanvragen/offertes, een
prompt die uit prijslijst + aanvraag een gestructureerde offerte maakt
(regels, bedragen, totaal), een PDF of nette mail, het scherm. De
onderdelen bestaan; de samenhang is nieuw.

**Risico's.** Een verkeerd bedrag in een offerte is bindend-achtig in de
beleving van de klant van de klant. Daarom: bedraggrens, concept-eerst, en
elke prijs herleidbaar naar een regel in de prijslijst (zoals bronnen bij
supportmail).

---

### Agent 2 — Betaalherinnering-agent

**Wat hij doet.** Houdt openstaande facturen bij en stuurt op het juiste moment
de juiste toon: een vriendelijke vooraankondiging vlak voor de vervaldatum,
een nette herinnering na drie dagen, een zakelijkere na veertien, en een
aankondiging van de volgende stap daarna. Stopt zodra er betaald is. Een
klant die mailt "ik betaal volgende week" wordt herkend en krijgt dan geen
herinnering meer tot die week voorbij is. Alles vanuit de naam van de klant,
in zijn toon.

**Voor wie.** Elk bedrijf dat op factuur werkt. In het Nederlandse mkb is dat
bijna iedereen behalve horeca en retail.

**Waarom dit verkoopt.** Dit is het hardste Nederlandse getal dat we hebben:
15% te laat, 3% nooit, €20.000 per jaar bij twee op de drie bedrijven, en al
jaren het grootste probleem in de administratie (Exact 2026). Uit ander
onderzoek: 54% van de ondernemers had in 2025 betalingsachterstanden, en 81%
daarvan schakelde géén incassobureau in — ze doen het dus zelf, of niet. De
reden dat het misgaat is zelden de factuur en bijna altijd de opvolging die
niemand doet. Dat is precies wat een agent wél doet.

**Wat we al hebben.** De complete uitgaande kant van de e-mailagent:
versturen via Resend, inplannen en intrekken, het verzendvenster,
antwoorden herkennen (`outbound_replies`), het bounce-beleid. Een
herinneringsreeks is technisch een campagne met een andere trigger.

**Wat de klant ziet.**
- Dashboard: openstaand bedrag, waarvan over de termijn; herinnerd deze
  maand; *betaald binnen 7 dagen na een herinnering* (het kerncijfer);
  gemiddelde betaaltermijn — 47% van de ondernemers kent die niet eens.
- Scherm "Facturen": de lijst met per factuur de stand van de reeks, een
  knop *Pauzeer* (bij een afspraak met de klant), *Markeer betaald*, *Naar
  incasso* (alleen een markering — wij doen geen incasso).
- Hoe facturen binnenkomen: eerst een CSV-upload of een doorgestuurde
  factuurmail (zoals contacten nu). Later een koppeling met Moneybird,
  e-Boekhouden of Exact Online — dat is de upgrade waar deze agent écht van
  gaat lopen, en dan verdwijnt het handwerk.
- Knoppen: *Momenten van de reeks* (dagen vóór/na vervaldatum); *Toon per
  stap*; *Nooit herinneren aan* (lijst klanten); *Maximaal aantal
  herinneringen*; *Stop zodra de klant antwoordt* (standaard aan); *Kopie
  naar mij bij stap 3*.

**Mens in de lus.** De agent dreigt niet en onderhandelt niet. De laatste stap
is een aankondiging dat *de ondernemer* de volgende stap neemt — nooit een
incassomaatregel zelf. Antwoorden van een debiteur gaan altijd naar een mens.

**Inspanning: middel.** Tabel voor facturen + betalingen, de reeks-logica
(hergebruik opvolging), het scherm, CSV-import. De boekhoudkoppeling is een
aparte stap erna (OAuth, net als de mailbox).

**Risico's.** Een herinnering aan een factuur die al betaald is, is pijnlijk
en schaadt het vertrouwen in de agent meteen. Daarom: zonder actuele
betaalstatus (koppeling of dagelijkse CSV) geen automatische stap 2 en 3,
alleen concepten. En dubbele herinneringen voorkomen via dezelfde
claim-constructie als bij supportmail.

---

### Agent 3 — Heractivatie-agent

**Wat hij doet.** Schrijft klanten aan die een tijd niets meer hebben
afgenomen — persoonlijk, met iets wat de moeite waard is (een nieuw aanbod,
een seizoensactie, gewoon een "we zagen dat het even stil was"), volgt op wie
niet reageert en stopt zodra iemand reageert of zich afmeldt. Reacties komen
bij de klant terecht met een voorstel voor het antwoord.

**Voor wie.** Iedereen met een klantenbestand ouder dan een jaar: webshops,
groothandel, dienstverleners met terugkerend werk, horeca met een gastenlijst,
sportscholen, salons. FJ Snacks had dit al nodig (`herkomst = oud_klant`
bestaat daarom).

**Waarom dit verkoopt.** Het is de dienst die agency-opleidingen aanraden als
*eerste* aanbod, om één reden: het laat binnen weken omzet zien zonder
advertentiebudget, uit een lijst die de klant al heeft. Daarom is het ook
makkelijk te prijzen: per teruggewonnen klant of per afspraak. De harde
cijfers die rondgaan (open rates van 98%) zijn niet te staven, dus die
gebruiken we niet; het verkoopverhaal is "jouw lijst, onze opvolging, en je
ziet per week wie terugkomt."

**Wat we al hebben.** Vrijwel alles. Dit is de uitgaande e-mailagent met een
andere lijst, een ander aanbod en een eigen dashboard. Contacten, campagnes,
opvolging, afmelden, bounce-rem en verzendvenster zijn er al.

**Wat de klant ziet.**
- Dashboard: aangeschreven → geopend/gereageerd → *teruggekomen* (bestelling
  of afspraak, door de klant aangevinkt of via een koppeling). Kerncijfer:
  *teruggewonnen klanten deze maand* en wat dat waard was (de klant vult de
  gemiddelde orderwaarde in; de agent rekent).
- Scherm "Slapende klanten": de lijst met *laatste aankoop*, de stand van de
  reeks, en reacties.
- Knoppen: *Slapend na x maanden*; *Aanbod*; *Maximaal aantal berichten per
  klant* (standaard 2: niemand wil gestalkt worden); *Nooit aanschrijven*
  (lijst); de bestaande verzendopties.

**Mens in de lus.** Zelfde als de e-mailagent: concept of direct per campagne,
antwoorden altijd naar een mens, afmelden met één klik. Geen kortingen die
niet zijn afgesproken.

**Inspanning: klein.** Een agentsoort met voorinstellingen op de bestaande
e-mailagent, een filter op "laatste aankoop", een paar extra velden en een
eigen dashboardtegel. Het dagrapport dat nog openstaat past hier mooi bij.

**Risico's.** AVG: een oud-klant mag je op grond van de klantrelatie
aanschrijven met soortgelijke aanbiedingen, mits er bij elke mail een
afmeldmogelijkheid is (die hebben we) en het geen gekochte lijst is. Een
lijst van vijf jaar oud is geen "klantrelatie" meer; daar hoort een grens
in de instellingen (standaard: slapend tussen 6 en 36 maanden, ouder niet).

---

### Agent 4 — Review-agent

**Wat hij doet.** Na een afgeronde klus, levering of afspraak vraagt hij op
het juiste moment om een review, met de link naar het Google-profiel van de
klant. Komt er een review binnen, dan zet hij een antwoord klaar in de toon
van de klant — een hartelijk antwoord op vijf sterren, een zorgvuldig op één
ster — en de klant plaatst het met één klik. Hij houdt bij hoe het
gemiddelde beweegt en of de reviews recent genoeg blijven.

**Voor wie.** Lokale dienstverleners en alles wat op Google gevonden wordt:
installateurs, garages, tandartsen, salons, restaurants, hoveniers,
verhuizers.

**Waarom dit verkoopt.** Hier is het bewijs juist goed, want het komt uit een
jaarlijks consumentenonderzoek (BrightLocal, 2026):
- **97% van de consumenten leest reviews** van lokale bedrijven; 41% doet dat
  altijd.
- **Recentheid telt zwaarder dan ooit**: 32% kijkt alleen naar reviews van de
  laatste twee weken (was 20% in 2025), 74% naar de laatste drie maanden. Een
  bedrijf met twintig oude reviews staat er dus leeg bij.
- Vragen werkt: 28% schrijft *altijd* een review als erom gevraagd wordt (16%
  in 2025), en van wie gevraagd wordt, doet 65–83% het.
- Antwoorden telt: **89% verwacht dat de eigenaar reageert**, 80% kiest eerder
  een bedrijf dat op al zijn reviews reageert, en 50% haakt af bij een
  sjabloonantwoord — precies waarom het antwoord in de toon van de klant moet
  en niet uit een standaardzin.
- Uit een analyse van 229.882 reviews: eigenaren reageren op 29% van de
  vijfsterrenreviews en op 10% van de eensterrenreviews. Het werk blijft
  liggen.

**Wat we al hebben.** Mail na een gebeurtenis (de bezorgbevestiging doet
precies dit), de kennisbank voor toon en feiten, concept-eerst, het
verzendvenster.

**Wat de klant ziet.**
- Dashboard: verzoeken verstuurd → reviews binnen; gemiddelde score en
  aantal reviews in de laatste 90 dagen (het getal dat volgens het onderzoek
  telt); onbeantwoorde reviews.
- Scherm "Reviews": nieuwe reviews met het voorgestelde antwoord en de knop
  *Plaatsen* (via de Google Business Profile API) of *Kopiëren*.
- Knoppen: *Vragen na x dagen*; *Via mail / WhatsApp (later)*; *Alleen
  vragen bij…* (bijvoorbeeld niet na een klacht); *Antwoorden: concept of
  automatisch bij vijf sterren*; *Toon*.

**Mens in de lus.** Geen *review gating* (eerst vragen hoe tevreden iemand is
en alleen de blije mensen doorsturen): Google verbiedt het, en het is ook
gewoon niet eerlijk. Iedereen krijgt dezelfde vraag. Antwoorden op reviews
onder vier sterren zijn altijd concept.

**Inspanning: klein voor het vragen, middel voor het antwoorden.** Het
verzoek per mail is een week werk op de bestaande blokken. Antwoorden
plaatsen vraagt de Google Business Profile API met OAuth — de koppelingslaag
hebben we net gebouwd, en deze scopes zijn niet "restricted" zoals bij Gmail.

**Risico's.** Een review-verzoek na een slechte ervaring versnelt de slechte
review. Daarom de instelling "niet vragen na een klacht/retour" en een
wachttijd die de klant zelf zet.

---

### Agent 5 — Afsprakenagent

**Wat hij doet.** Bevestigt afspraken, herinnert op de momenten die de klant
kiest, laat verzetten of annuleren met één antwoord ("kan het ook
donderdag?"), vult vrijgekomen plekken vanuit een wachtlijst, en belt na een
no-show niet, maar mailt: "we misten je, wil je een nieuwe afspraak?" Later
via WhatsApp, want daar wordt een herinnering het snelst gezien.

**Voor wie.** Alles met een agenda: fysiotherapie, tandartsen, salons,
garages, adviesgesprekken, showrooms, bezichtigingen.

**Waarom dit verkoopt.** Herinneringen zijn de meest geaccepteerde vorm van
automatisering die er is, ook in Nederland: in onderzoek van Spryng onder
1.000 Nederlanders zegt 80% dat een herinnering helpt om een reservering niet
te missen, en 56% vindt no-show-kosten *niet gerechtvaardigd als er geen
herinnering is gestuurd*. In ziekenhuizen ligt het no-show-percentage op
5–10%. De veelgenoemde "29–39% minder no-shows door sms" komt van
softwareleveranciers zonder bronvermelding; we gebruiken dat getal niet, we
laten de klant zijn eigen no-shows zien, voor en na.

**Wat we al hebben.** De OAuth-koppeling met Google en Microsoft die we voor
de mailbox bouwden; voor de agenda zijn het andere scopes (Calendar), maar
dezelfde kluis, hetzelfde briefje, dezelfde ontkoppelknop. En Microsoft 365 en
Google Workspace zijn samen het grootste deel van de zakelijke agenda's.

**Wat de klant ziet.**
- Dashboard: afspraken deze week; bevestigd; verzet; *no-shows* (het getal
  dat omlaag moet); opgevulde gaten.
- Scherm "Afspraken": wat eraan komt, wie nog niet bevestigde, de wachtlijst.
- Knoppen: *Herinneren op* (bijvoorbeeld 48 uur en 2 uur vooraf); *Kanaal*;
  *Verzetten toestaan tot x uur vooraf*; *Wachtlijst aan*; *Na een no-show:
  nieuwe afspraak voorstellen*; *Toon*.

**Mens in de lus.** De agent boekt alleen in vrije tijd binnen de werktijden
die de klant instelt, en nooit een nieuwe dienst die niet bestaat. Alles wat
hij verzet, staat in de gebeurtenissenlog van de agent.

**Inspanning: groot.** Agendakoppeling (Google Calendar en Microsoft Graph
Calendar), tweerichtingsverkeer (lezen én schrijven), een
wachtlijstmechanisme, en voor de volle waarde WhatsApp — dat is een aparte
koppeling met Meta die we nog niet hebben. Dit is de agent waar voice-vendoren
hun geld mee verdienen; wij beginnen bij mail en agenda, zonder telefoon.

**Risico's.** Dubbele boekingen en tijdzones. En: een agent die in een agenda
schrijft is het eerste moment dat een agent iets *doet* in het systeem van de
klant in plaats van alleen te schrijven. Dat verdient dezelfde zorg als de
mailboxkoppeling, plus een "alleen lezen"-stand om mee te beginnen.

---

## 3. Vergelijking

| | Offerte | Betaalherinnering | Heractivatie | Review | Afspraken |
|---|---|---|---|---|---|
| Bewijs voor de pijn | sterk (snelheid) | **sterkst (NL, Exact)** | agency-praktijk | sterk (BrightLocal) | goed (Spryng, zorg) |
| Bewijs voor het effect | redelijk (cases) | logisch, weinig gemeten | zwak (vendorclaims) | goed | gemengd |
| Past bij wat we hebben | goed | goed | **vrijwel klaar** | goed | deels (koppeling) |
| Nieuwe koppeling nodig | nee (later boekhouding) | nee (later boekhouding) | nee | ja, voor antwoorden | ja, agenda |
| Verkoopbaar per resultaat | per offerte/omzet | per teruggehaald bedrag | per teruggewonnen klant | per review | per no-show minder |
| Inspanning | middel | middel | klein | klein–middel | groot |

## 4. Wat we bewust (nog) niet voorstellen

- **AI-receptionist / voice agent.** Het meest verkochte agency-product in de
  VS. Maar het vraagt telefonie (nummers, Twilio of een voice-platform),
  Nederlandse spraakkwaliteit, en kosten per minuut — een hele nieuwe stapel
  naast alles wat we hebben. Pas als er een klant om vraagt.
- **Gemiste oproep → sms.** Amerikaans gedrag; in Nederland is sms geen
  zakelijk kanaal meer en vraagt het ook telefonie.
- **Sollicitanten voorscreenen via WhatsApp.** Groeit, maar raakt direct aan
  het verbod op geautomatiseerde besluitvorming over mensen (AVG art. 22) en
  de AI Act (hoog risico). Niet het terrein om als klein bureau als eerste
  in te stappen.
- **Sales-assistent en WhatsApp-opvolging** staan al als soort. Die bouwen we
  af in plaats van er iets naast te zetten; de afsprakenagent is in feite het
  eerste stuk van de sales-assistent.

## 5. Volgende stap

Na jouw akkoord op de vijf (of een deel):

1. Elke agent komt als soort in `src/lib/agent-soorten.ts` (label, uitleg,
   kerncijfers, schermen, "binnenkort") en in de catalogus
   `src/lib/agent-opties.ts` met de knoppen hierboven, allemaal op
   `gebouwd: false`. Dan kun je ze in het beheer kiezen en voor een klant op
   "in opbouw" zetten, en zie je in het portaal al wat er komt.
2. Daarna bouwen in de aanbevolen volgorde, één agent per keer, met een
   testsuite per agent zoals bij de bounce-rem.
3. De heractivatie-agent kan binnen een week bij FJ Snacks draaien, want die
   lijst en die campagne-opzet bestaan al.

## Bronnen

**Nederlands mkb**
- Exact MKB Barometeronderzoek 2026, uitgevoerd door Markteffect, n = 1.719 (rapport-pdf, files.exact.com)
- Accountancy Vanmorgen, maart en juni 2026, over betalingsachterstanden en gemiste omzet
- MKB Servicedesk: "Mkb'er loopt gemiddeld € 20.000 omzet mis door onbetaalde facturen"
- Spryng-onderzoeken onder 1.000 Nederlanders (horeca, zorg) via Emerce; gesponsord
- OLVG/Spryng: no-show 5–10% in Nederlandse ziekenhuizen

**Reviews**
- BrightLocal Local Consumer Review Survey 2026 (brightlocal.com/research)
- UENI: analyse van 229.882 Google-reviews en eigenaarsreacties

**Snelheid van reageren / offertes**
- Valve+Meter home-services responsestudie (466 bedrijven), via ACHR News, Convoso, Professional Remodeler
- US Tech Automations: quote-automation case (schoonmaakbedrijf, 9 man); Tangle (metaalbewerking); Made for Builders; OpsJuice

**Wat agencies verkopen**
- Ciela: database-reactivation offer; beste eerste automatisering voor beginners
- Sonant, Flowbots, Branding Marketing Agency: missed-call text-back
- GoDaddy, Presta, Tabular, Commerce Pundit, Artic Sledge: agency-businessmodellen en prijzen
- Thoughtly, Nextiva, Retell, Vellum, CloudTalk, Voksha: AI-receptionist en appointment setting
- Enterprise DNA, Netpeak, Arahi: factuuropvolging
- Website Builder Expert (maart 2026), vcita 2026 Small Business Adoption Report, Reimagine Main Street (2025): wat kleine bedrijven als eerste automatiseren
- ChatDaddy, CogniAgent, Joveo: recruitment-screening (niet voorgesteld)
