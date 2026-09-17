import type { JuridischBlok } from "@/components/juridische-pagina";
import { SITE } from "@/content/site";

/**
 * De juridische teksten van de site.
 *
 * Deze stonden eerder alleen als opschrift in de voettekst — drie woorden
 * zonder pagina eronder. Dat is niet alleen een gat in de AVG, het is ook
 * ongeloofwaardig op een site die naleving van de AI Act verkoopt.
 *
 * ────────────────────────────────────────────────────────────────────────
 * NA TE LOPEN VOORDAT DIT DEFINITIEF IS
 * De teksten hieronder beschrijven wat er in deze codebase daadwerkelijk
 * gebeurt: welke velden het formulier verstuurt, welke partijen de gegevens
 * verwerken en welke modellen er worden aangeroepen. Drie dingen staan hier
 * als redelijke aanname en moeten door Wouter bevestigd worden:
 *   1. de bewaartermijnen (nu: 12 maanden voor aanvragen zonder opdracht);
 *   2. de vestigingsregio van het Supabase-project, in verband met doorgifte;
 *   3. de betaaltermijn en aansprakelijkheidsgrens in de voorwaarden.
 * Laat de voorwaarden daarnaast één keer door een jurist nalopen. Dit is een
 * gedegen basis, geen vervanging van dat oordeel.
 * ────────────────────────────────────────────────────────────────────────
 */

export const BIJGEWERKT = "18 september 2026";

/** Terugkerend blok: wie is de verwerkingsverantwoordelijke / contractpartij. */
const WIE: JuridischBlok = {
  kop: "Wie wij zijn",
  paren: [
    { naam: "Bedrijf", toelichting: SITE.name },
    { naam: "Vestiging", toelichting: "Amsterdam, Nederland" },
    { naam: "KvK-nummer", toelichting: SITE.kvk },
    { naam: "E-mail", toelichting: SITE.email },
    { naam: "Telefoon", toelichting: SITE.phone },
  ],
};

/* --- Privacyverklaring ------------------------------------------------ */

export const PRIVACY: JuridischBlok[] = [
  WIE,
  {
    kop: "Welke gegevens we verwerken",
    alineas: [
      "We verzamelen zo min mogelijk. Er staat geen analytics op deze site, geen advertentiepixel en geen trackingcookie. Wat we hebben, heb je zelf ingevuld of is nodig om de site te laten werken.",
    ],
    paren: [
      {
        naam: "Contactformulier",
        toelichting:
          "Naam, bedrijfsnaam, e-mailadres, telefoonnummer (optioneel), de fase waarin je zit en je bericht.",
      },
      {
        naam: "Website-assistent",
        toelichting:
          "De vragen die je in de chat stelt, en de contactgegevens die je daar achterlaat als je om een terugbelverzoek vraagt.",
      },
      {
        naam: "Klantportaal",
        toelichting:
          "E-mailadres en wachtwoord (versleuteld opgeslagen), plus de gegevens van de agents die voor je draaien.",
      },
      {
        naam: "Technische gegevens",
        toelichting:
          "IP-adres, browsertype en tijdstip, in de logs van onze hosting. Nodig om storingen en misbruik te kunnen onderzoeken.",
      },
    ],
  },
  {
    kop: "Waarvoor, en op welke grondslag",
    paren: [
      {
        naam: "Reageren op je aanvraag",
        toelichting:
          "Grondslag: het uitvoeren van een overeenkomst of de stappen daaraan voorafgaand. Zonder deze gegevens kunnen we niet terugbellen.",
      },
      {
        naam: "Uitvoeren van de opdracht",
        toelichting: "Grondslag: de overeenkomst die we met je sluiten.",
      },
      {
        naam: "Facturatie en administratie",
        toelichting:
          "Grondslag: een wettelijke verplichting. De fiscale bewaarplicht is zeven jaar.",
      },
      {
        naam: "Beveiliging en storingsonderzoek",
        toelichting:
          "Grondslag: ons gerechtvaardigd belang om de site werkend en veilig te houden.",
      },
    ],
    alineas: [
      "We sturen je geen nieuwsbrief tenzij je daar zelf om vraagt, en we verkopen je gegevens aan niemand.",
    ],
  },
  {
    kop: "Cookies",
    alineas: [
      "Deze site gebruikt alleen functionele cookies: een cookie die je ingelogd houdt in het klantportaal, en een beveiligingscookie van onze hostingpartij die geautomatiseerd misbruik tegenhoudt. Voor die twee is geen toestemming vereist, en daarom zie je hier geen cookiebanner.",
      "Er staan geen analytics-, advertentie- of socialemediacookies op deze site. De lettertypen worden vanaf ons eigen domein geladen en niet bij Google opgehaald, zodat je IP-adres daar ook niet terechtkomt.",
    ],
  },
  {
    kop: "Wie de gegevens namens ons verwerkt",
    alineas: [
      "We besteden een deel van de techniek uit. Met elk van deze partijen is een verwerkersovereenkomst gesloten of van toepassing via hun voorwaarden.",
    ],
    paren: [
      { naam: "Supabase", toelichting: "Database en inloggen voor het klantportaal." },
      { naam: "Resend", toelichting: "Versturen van e-mail, zoals de melding van je aanvraag." },
      {
        naam: "Anthropic",
        toelichting:
          "De AI-modellen die berichten lezen en concepten opstellen. Anthropic traint niet op de inhoud die wij via de API aanleveren.",
      },
      { naam: "Cloudflare", toelichting: "Hosting, verkeersafhandeling en beveiliging." },
      { naam: "Lovable", toelichting: "Het platform waarop deze site gebouwd en gehost wordt." },
      { naam: "Calendly", toelichting: "Het inplannen van een kennismakingsgesprek." },
      {
        naam: "Meta (WhatsApp Business)",
        toelichting: "Alleen van toepassing als er voor jouw bedrijf een WhatsApp-agent draait.",
      },
    ],
  },
  {
    kop: "Doorgifte buiten de EU",
    alineas: [
      "Een deel van deze partijen is gevestigd in de Verenigde Staten. Die doorgifte vindt plaats op basis van de standaardcontractbepalingen van de Europese Commissie, of omdat de partij is aangesloten bij het EU-US Data Privacy Framework. Voor opdrachten waarbij je wilt dat gegevens de EU niet verlaten, richten we dat zo in en leggen we het vast in de verwerkersovereenkomst.",
    ],
  },
  {
    kop: "Hoe lang we het bewaren",
    paren: [
      {
        naam: "Aanvragen zonder opdracht",
        toelichting: "Twaalf maanden na het laatste contact, daarna verwijderd.",
      },
      {
        naam: "Klantgegevens",
        toelichting: "Gedurende de opdracht en twaalf maanden daarna.",
      },
      {
        naam: "Facturen en administratie",
        toelichting: "Zeven jaar, omdat de belastingwet dat voorschrijft.",
      },
      {
        naam: "Technische logs",
        toelichting: "Maximaal dertig dagen.",
      },
    ],
  },
  {
    kop: "Je rechten",
    alineas: [
      `Je mag opvragen welke gegevens we van je hebben, ze laten corrigeren of verwijderen, de verwerking laten beperken, bezwaar maken, en je gegevens in een overdraagbaar bestand opvragen. Eén mail naar ${SITE.email} is genoeg; we reageren binnen een maand en vragen niet om een reden.`,
      "Kom je er met ons niet uit, dan kun je een klacht indienen bij de Autoriteit Persoonsgegevens.",
    ],
  },
  {
    kop: "Beveiliging",
    alineas: [
      "Verkeer naar deze site gaat uitsluitend over een versleutelde verbinding. Wachtwoorden worden nooit leesbaar opgeslagen. Toegang tot klantgegevens is beperkt tot wie die toegang nodig heeft voor de opdracht. Alles wat een AI-agent doet, is terug te zien in een activiteitenlog.",
    ],
  },
  {
    kop: "Wijzigingen",
    alineas: [
      "Verandert er iets aan hoe we met gegevens omgaan, dan passen we deze verklaring aan en verzetten we de datum bovenaan. Bij een ingrijpende wijziging laten we het onze klanten weten.",
    ],
  },
];

/* --- Algemene voorwaarden --------------------------------------------- */

export const VOORWAARDEN: JuridischBlok[] = [
  WIE,
  {
    kop: "Waarop deze voorwaarden van toepassing zijn",
    alineas: [
      `Deze voorwaarden gelden voor elke offerte, opdracht en overeenkomst tussen ${SITE.name} en een opdrachtgever. Inkoopvoorwaarden van de opdrachtgever zijn niet van toepassing, tenzij we dat schriftelijk hebben afgesproken.`,
      "We werken uitsluitend voor zakelijke opdrachtgevers.",
    ],
  },
  {
    kop: "Offertes en de totstandkoming van een opdracht",
    alineas: [
      "Een offerte is dertig dagen geldig en vrijblijvend tot het moment dat hij is aanvaard. Een opdracht komt tot stand als je de offerte schriftelijk of per e-mail bevestigt, of als we op jouw verzoek beginnen met de uitvoering.",
      "Een kennismakingsgesprek van dertig minuten is gratis en verplicht je tot niets.",
    ],
  },
  {
    kop: "Tarieven en betaling",
    alineas: [
      "Alle bedragen zijn exclusief btw. Trajecten hebben een vaste prijs die vooraf is bepaald; we werken niet met nacalculatie. Staat een tarief op de [tarievenpagina](/tarieven), dan is dat het tarief.",
      "Facturen worden binnen veertien dagen na factuurdatum voldaan. Abonnementen worden vooraf per maand gefactureerd, trajecten in termijnen die in de offerte staan.",
      "Bij te late betaling zijn de wettelijke handelsrente en de buitengerechtelijke incassokosten verschuldigd. We schorten de dienstverlening pas op nadat we je daar schriftelijk op hebben gewezen en een redelijke termijn hebben gegeven.",
    ],
  },
  {
    kop: "Abonnementen, looptijd en opzeggen",
    lijst: [
      "Een abonnement heeft een minimumduur van drie maanden.",
      "Daarna is het maandelijks opzegbaar, met een opzegtermijn van één maand.",
      "Opzeggen kan per e-mail. We vragen niet om een reden.",
      "Een traject is een losse opdracht met een vaste prijs, en kent geen looptijd.",
      "Er is geen jaarcontract, en er is geen stilzwijgende verlenging met een langere termijn.",
    ],
  },
  {
    kop: "Fair use en doorbelaste kosten",
    alineas: [
      "Bij het AI-agent-abonnement geldt een grens van 300 gesprekken of leads per maand; bij AI-traject en AI-partner is dat 2.000. Daarboven rekenen we € 1,00 per extra lead of gesprek.",
      "Berichtkosten van WhatsApp Business worden één op één doorbelast tegen het tarief dat Meta ons rekent. We zetten er geen opslag op.",
      "Kosten van software of licenties die op jouw naam staan, lopen buiten ons om.",
    ],
  },
  {
    kop: "Uitvoering, en wat we van jou nodig hebben",
    alineas: [
      "We voeren de opdracht naar beste inzicht en vermogen uit. Het is een inspanningsverplichting: we zeggen een werkende automatisering toe, geen gegarandeerd bedrijfsresultaat.",
      "Daarvoor hebben we van jou tijdig toegang tot de betrokken systemen nodig, een aanspreekpunt dat beslissingen mag nemen, en de informatie waar we om vragen. Loopt de planning uit doordat dat er niet is, dan schuift de oplevering mee.",
    ],
  },
  {
    kop: "Oplevering, meting en stoppen",
    alineas: [
      "Elke automatisering krijgt vooraf een nulmeting en één afgesproken KPI. Dertig dagen na livegang meten we of het effect er is.",
      "Blijkt uit die meting dat de automatisering niets oplevert, dan zetten we hem uit en gaan we niet door naar een volgende fase. Al gefactureerd werk blijft verschuldigd; de kosten van de fase die daarop zou volgen, vervallen.",
      "Na elke fase kun je stoppen. Dat is een uitgangspunt van hoe we werken, geen uitzondering waarvoor je moet onderhandelen.",
    ],
  },
  {
    kop: "Intellectueel eigendom en overdracht",
    alineas: [
      "Na volledige betaling krijg je een eeuwigdurend, niet-exclusief gebruiksrecht op wat er specifiek voor jou is gebouwd, inclusief de documentatie. We bouwen naar overdracht toe: je team krijgt de uitleg, de training en uiteindelijk de sleutels.",
      "Onderliggende werkwijzen, sjablonen en bouwstenen die wij voor meerdere opdrachtgevers gebruiken, blijven van ons. Je mag die gebruiken binnen jouw organisatie, maar niet doorverkopen.",
    ],
  },
  {
    kop: "Geheimhouding",
    alineas: [
      "Wat we bij jou tegenkomen houden we voor ons, ook na afloop van de opdracht. Dat geldt beide kanten op. We noemen je pas als klant nadat je daar toestemming voor hebt gegeven.",
    ],
  },
  {
    kop: "Werken met AI: wat je moet weten",
    alineas: [
      "AI-systemen kunnen zich vergissen. Een gegenereerd antwoord kan feitelijk onjuist zijn, ook als het overtuigend klinkt. Daarom staat er standaard een mens tussen: de Inbox Draft Assistant verstuurt uit zichzelf niets, en jij bepaalt per proces wat er automatisch mag.",
      "Wij zijn niet aansprakelijk voor de inhoud van berichten die na jouw goedkeuring zijn verstuurd, of voor beslissingen die op basis van AI-uitvoer zijn genomen zonder menselijke controle die we hebben geadviseerd.",
      "De verplichtingen die de EU AI Act aan jou als gebruiker oplegt, brengen we in kaart en richten we mee in. De eindverantwoordelijkheid voor naleving binnen jouw organisatie blijft bij jou.",
    ],
  },
  {
    kop: "Aansprakelijkheid",
    alineas: [
      "Onze aansprakelijkheid is beperkt tot het bedrag dat voor de betreffende opdracht is gefactureerd in de zes maanden voorafgaand aan de gebeurtenis, met een maximum van het bedrag dat onze verzekering in dat geval uitkeert.",
      "We zijn niet aansprakelijk voor gevolgschade, gederfde winst of gemiste besparingen. Deze beperkingen gelden niet bij opzet of bewuste roekeloosheid van onze kant.",
      "Storingen bij partijen waar we van afhankelijk zijn — hosting, e-mail, modelleveranciers, WhatsApp — komen niet voor onze rekening. We spannen ons wel in om de gevolgen ervan te beperken.",
    ],
  },
  {
    kop: "Toepasselijk recht",
    alineas: [
      "Op deze voorwaarden is Nederlands recht van toepassing. Geschillen leggen we voor aan de bevoegde rechter in Amsterdam, nadat we eerst hebben geprobeerd er samen uit te komen.",
    ],
  },
];

/* --- AI-beleid --------------------------------------------------------- */

export const AI_BELEID: JuridischBlok[] = [
  {
    kop: "Waarom dit er staat",
    alineas: [
      "We verkopen AI-naleving. Dan hoort ons eigen beleid ook gewoon zichtbaar te zijn, en niet alleen in de trajecten van klanten te zitten. Dit is hoe wij met AI omgaan — op deze site en in wat we voor klanten bouwen.",
    ],
  },
  {
    kop: "Een AI maakt zich kenbaar",
    alineas: [
      "De assistent op deze site is een AI en zegt dat ook. Elke chatbot die wij bouwen doet hetzelfde. Sinds 2 augustus 2026 verplicht artikel 50 van de EU AI Act dat, maar we deden het daarvoor ook al: iemand die denkt met een mens te praten en er later achter komt van niet, voelt zich terecht bekocht.",
      "AI-gegenereerde content die wij opleveren, wordt machineleesbaar gelabeld waar de wet dat voorschrijft.",
    ],
  },
  {
    kop: "Er staat een mens tussen",
    lijst: [
      "Jij bepaalt per proces wat de AI zelfstandig mag en wat eerst langs een mens gaat.",
      "De Inbox Draft Assistant verstuurt standaard niets zelf — hij zet een concept klaar.",
      "Bij klachten, gevoelige vragen of twijfel draagt de agent over aan een mens.",
      "Alles wat een agent doet, staat in een activiteitenlog dat je kunt nalezen.",
      "Werkt een automatisering niet zoals bedoeld, dan kun je hem zelf uitzetten.",
    ],
  },
  {
    kop: "Welke modellen we gebruiken",
    alineas: [
      "We werken met de Claude-modellen van Anthropic, aangeroepen via hun API. Die API traint niet op de inhoud die wij aanleveren. We sturen niet meer gegevens mee dan nodig is voor de taak, en gevoelige velden houden we buiten de aanvraag waar dat kan.",
      "Welke gegevens een agent mag zien, leggen we per opdracht vast voordat er iets live gaat.",
    ],
  },
  {
    kop: "Waar we niet aan beginnen",
    lijst: [
      "Toepassingen die onder de hoog-risicocategorie van de AI Act vallen — zoals AI in werving, selectie of kredietbeoordeling — zonder de beoordeling en registratie die daarbij hoort.",
      "Systemen die zich voordoen als een mens.",
      "Automatisch verzonden berichten in processen waar een fout niet te herstellen valt.",
      "Het opschalen van een proces dat aantoonbaar niet werkt. Dan zeggen we dat AI hier niet de oplossing is.",
    ],
  },
  {
    kop: "AI-geletterdheid",
    alineas: [
      "Sinds 2 februari 2025 moet personeel dat met AI werkt aantoonbaar weten hoe het werkt en welke risico's eraan zitten. Die training zit in onze trajecten inbegrepen en komt niet als losse factuur achteraf. Wie alleen de training wil, kan het AI Act-pakket afnemen; de tarieven daarvoor staan op de [tarievenpagina](/tarieven).",
    ],
  },
  {
    kop: "Vragen of een melding",
    alineas: [
      `Zie je iets wat een AI-agent van ons niet had moeten doen, meld het dan op ${SITE.email}. We onderzoeken het, zetten de agent zo nodig stil en laten weten wat we hebben aangepast.`,
    ],
  },
];
