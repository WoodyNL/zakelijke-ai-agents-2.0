# SEO-plan zakelijkeaiagents.nl

Doorgenomen op 17 september 2026, naar aanleiding van het ChatGPT-advies. Alles
hieronder is nagekeken tegen de code en tegen de HTML die de live site
daadwerkelijk uitserveert (`curl` als Googlebot), niet tegen wat de pagina in een
browser laat zien. Dat onderscheid doet er hier toe: op twee punten wijkt het af.

## Wat er nu misgaat, en het is geen strategie maar een bug

### 1. Negen cijfers op de homepage staan op 0 in de uitgeserveerde HTML

`CountUp` in [src/components/sections/ui.tsx](src/components/sections/ui.tsx)
begint op `0` en telt pas omhoog als de bezoeker het blok in beeld scrollt. De
server rendert dus de beginstand. In de HTML staat letterlijk:

    0% van de AI-pilots levert geen meetbaar resultaat op
    0% van het Nederlandse mkb heeft AI structureel geïmplementeerd

Negen van zulke spans, verdeeld over hero, problem en governance. ChatGPT zag
dit ook en twijfelde of het aan de crawler lag — het ligt niet aan de crawler.
Dit is erger dan een gemiste kans: een taalmodel of een tekstextractie leest hier
een claim die het tegenovergestelde beweert van wat je bedoelt.

Oplossing: de eindwaarde server-side renderen en het tellen puur als versiering
erbovenop zetten (beginstand `value`, na hydratie pas terugzetten naar 0 en
animeren). Let op hydratiefouten als je de beginstand anders maakt op server en
client.

### 2. De H1 bevat een woord dat niemand ziet maar elke crawler leest

De H1 in [src/components/sections/hero.tsx](src/components/sections/hero.tsx)
roteert tussen Agents / Projecten / Consultancy / Ondersteuning. Om te voorkomen
dat de regel verspringt staat het langste woord als onzichtbare span in dezelfde
grid-cel. Onzichtbaar is niet hetzelfde als afwezig: de tekstinhoud van de H1 is

    Zakelijke AI Ondersteuning Agents

Precies wat ChatGPT citeerde. De `aria-label` redt de schermlezer, maar niet de
tekstextractie. Wie de rotatie wil houden, moet de breedte anders reserveren
(vaste `min-width` in `ch`, of alleen het actieve woord in de DOM).

## De H1-vraag

Het voorstel `AI automatisering voor het MKB` is een verbetering, maar niet om
de reden die het advies noemt. De winst zit niet in keyword-gewicht van een H1 —
dat is bescheiden — maar hierin: de huidige H1 is de bedrijfsnaam, en de
bedrijfsnaam staat al in de `<title>`, in het logo en in de Organization-schema.
De H1 zegt op dit moment niets wat nog niet ergens anders staat.

Wat wel jammer zou zijn: `AI werkt. AI-projecten meestal niet.` is de enige zin
op de pagina die je onderscheidt van iedere andere AI-bureau-site. Die moet niet
sneuvelen voor een zoekterm. De structuur die beide houdt:

    H1  AI-automatisering voor het MKB
    p   AI werkt. AI-projecten meestal niet.
    p   95% van de AI-pilots levert nooit een euro op. (bestaande sub)

Dat is bijna geen verbouwing: de tweede regel staat vandaag al als `<p>` onder de
H1 (`HERO.h1` in [src/content/site.ts](src/content/site.ts)).

De titel hoeft hier niet voor te veranderen. `<title>` en `<h1>` zijn losse
dingen; de titel staat in [src/routes/__root.tsx](src/routes/__root.tsx) en
[src/routes/index.tsx](src/routes/index.tsx) en luidt nu al
`AI-agency voor het MKB | Zakelijke AI Agents`. Die dekt dezelfde intentie. Het
advies om er `AI Automatisering voor het MKB | Zakelijke AI Agents` van te maken
is een marginale wijziging, geen noodzaak — en als je hem doet, doe hem dan op
beide plekken tegelijk, anders lopen root en route uiteen.

## Het ChatGPT-advies: wat klopt, wat niet

Goed en overneembaar:

- Eén zoekintentie per pagina, en de homepage niet voor dertien termen laten
  vechten.
- Probleemgerichte pagina's (offertes opvolgen, e-mail, CRM) boven abstracte
  dienstpagina's. Een ondernemer zoekt zijn probleem, niet onze productnaam.
- Antwoord bovenaan de pagina in plaats van eronder.
- Bronnen echt aanlinken. `MIT NANDA, 2025` staat er nu als platte tekst; op één
  plek staat al `MIT NANDA, The GenAI Divide, augustus 2025` — maak daar overal
  een link van, en doe hetzelfde voor Dialogic/EZK.
- Geen GEO-trucjes. Terecht.

Waar ik van afwijk:

- **Het aantal.** 30–50 kennisartikelen, 6–10 branchepagina's en 10+ cases is
  precies het volume waar Google sinds 2024 expliciet op let (scaled content
  abuse). Zes branchepagina's die uit één sjabloon komen met een ander zelfstandig
  naamwoord erin zijn doorway pages. Eén branchepagina met echte voorbeelden uit
  een echte klus is meer waard dan zes lege.
- **Cannibalisatie.** Het advies stelt `/ai-automatisering` en `/ai-consultancy`
  voor terwijl `/ai-automatisering-op-maat` en `/ai-consultancy-mkb` al bestaan.
  Dat worden twee pagina's die om dezelfde term vechten. Beter: de bestaande
  pagina's aanwijzen als de plek voor die kopterm, en desnoods het adres
  verhuizen met een redirect.
- **Cases kun je niet verzinnen.** FJ Snacks is de eerste echte klant. Een case
  vraagt toestemming en echte cijfers. Tot die er zijn: schrijf de werkwijze uit
  zonder klantnaam en noem het geen case.
- **Search Console staat op plek 8 van week 1.** Het hoort op plek 1. Zonder
  vertoningsdata is de hele termenlijst een aanname.

Wat het advies niet noemt en wel in de weg zit:

- Er is geen `/blog` of `/kennisbank` indexpagina. Het enige artikel hangt aan de
  "Lees ook"-blokken en verder nergens aan. Een hub moet er zijn vóór de
  artikelen, niet erna.
- [public/sitemap.xml](public/sitemap.xml) is met de hand bijgehouden. Bij dit
  tempo loopt dat binnen twee weken achter. Genereren uit de routelijst.
- Schema: `Organization` staat in de root, `FAQPage` en `OfferCatalog` bestaan.
  Er is geen `BreadcrumbList` (terwijl het kruimelpad visueel wél in
  [src/components/seo-page.tsx](src/components/seo-page.tsx) staat), geen
  `WebSite` en geen `Person` voor Wouter.

Het goede nieuws is dat de machinerie klaarligt. `SeoPage` + `faqJsonLd` +
`verwante-paginas` maken een nieuwe landingspagina ongeveer 90 regels werk, en
het interne-linkbestand is al doordacht opgezet in drie clusters. Uitbreiden is
hier goedkoop; dat is precies waarom de verleiding om te veel te maken echt is.

## Volgorde

### Sprint 0 — repareren, geen nieuwe content (een dagdeel)

1. Search Console koppelen, sitemap indienen, nulmeting van de huidige vertoningen
   en posities vastleggen. Alles hierna wordt hiertegen afgemeten.
2. `CountUp` server-side de echte waarde laten renderen (negen cijfers).
3. H1 omzetten naar `AI-automatisering voor het MKB`, `AI werkt. AI-projecten
   meestal niet.` als regel eronder houden, en het onzichtbare rotatiewoord uit de
   H1-tekst halen.
4. Bronnen aanlinken bij elk percentage.
5. `BreadcrumbList`, `WebSite` en `Person` toevoegen; sitemap genereren uit de routes.

### Sprint 1 — structuur

6. `/kennisbank` als hub bouwen en het bestaande blogartikel eronder hangen.
7. Beslissen welke bestaande pagina welke kopterm krijgt (`/ai-automatisering-op-maat`
   → "AI automatisering", `/ai-consultancy-mkb` → "AI consultant MKB") en de
   interne links daarop richten. Geen nieuwe near-duplicates.

### Sprint 2 — drie probleempagina's

8. `/offertes-automatiseren-met-ai`, `/ai-email-automatisering`,
   `/ai-crm-automatisering`. Hoogste intentie, kleinste gat in de huidige set.

### Sprint 3 — één branche, goed

9. De branche waar de eerste echte klus zit, met concrete processen uit die klus.
   Pas een tweede branchepagina als de eerste vertoningen oplevert.

### Sprint 4 — bewijs

10. Case met toestemming en echte cijfers. Gaat niet eerder.

Daarna een ritme in plaats van een lijst: ongeveer één pagina per week, en elke
pagina die je publiceert ook echt opnemen in het linkcluster.

## De toevoeging die ik zelf zou doen: de kennisbank publiceren

Er staat al een kennisbank in dit project, en Google heeft hem nog nooit gezien.

De website-assistent op de homepage werkt met `knowledge_items` per agent:
categorie, titel, vraag, inhoud, labels. `bouwSysteemprompt` in
[src/lib/assistant.server.ts](src/lib/assistant.server.ts) zet die hele bak in de
systeemprompt, met de instructie dat alles wat de assistent over het bedrijf zegt
daaruit moet komen. Dat betekent dat er een corpus ligt dat:

- in het Nederlands is en in de eigen toon geschreven,
- inhoudelijk al is nagekeken — het is letterlijk wat de assistent aan prospects
  vertelt over prijzen, doorlooptijden en pakketten,
- al de vorm `vraag → antwoord` heeft, precies het formaat dat het advies
  voorstelt als "antwoordpagina",
- en alleen bereikbaar is voor wie het chatvenster opent.

Een `/kennisbank` die uit dezelfde rijen wordt opgebouwd is dus geen schrijfklus
maar een publicatieklus. Eén bron, twee afnemers: de assistent en de zoekmachine.
Verandert een prijs, dan verandert hij op allebei tegelijk — dat is meteen het
sterkste argument, want een losse kennisbank die na drie maanden andere bedragen
noemt dan de assistent is erger dan geen kennisbank.

Aandachtspunten:

- **Server-side renderen.** Client-side ophalen levert dezelfde lege HTML op als
  de tellers nu. De items worden al met de publieke sleutel opgehaald, dus een
  publieke route kan.
- **Groeperen, niet versnipperen.** Niet elke rij een eigen URL. Per categorie
  één stevige pagina met de vragen als `h2`. Tachtig dunne pagina's is precies
  het patroon waar het plan hierboven voor waarschuwt.
- **Redactieslag.** Kennis die voor een chatbot is geschreven is kort en kaal.
  Voor een pagina mag er context omheen — maar het antwoord blijft bovenaan.
- **Selecteren.** Niet alles in de tabel hoort publiek. Een `is_public`-vlag
  erbij is goedkoper dan achteraf iets terugtrekken.

Tweede kandidaat, als de eerste staat: een publieke pagina over het klantportaal.
Dashboard, contacten, campagnes, berichten, bezorglijst — dat is gebouwd en het
draait, en geen enkele concurrent kan het namaken met een stockfoto. Het
beantwoordt bovendien de vraag waar een offerte meestal op blijft liggen: wat
krijg ik nou eigenlijk als het live staat.
