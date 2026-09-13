/**
 * Alle teksten en cijfers van de landingspagina.
 * Pas hier aan; de secties lezen hieruit.
 */

export const SITE = {
  name: "Zakelijke AI Agents",
  tagline: "AI-agency voor het MKB",
  scanPrice: "€1.450",
  person: "Wouter Ransijn",
  email: "",
  phone: "+31 6 14486257",
  kvk: "64493423",
  ctaPrimary: "Plan een gratis AI-verkenning",
  calendlyUrl: "https://calendly.com/wouter-zakelijkeaiagents/30min",
} as const;

export const NAV = [
  { label: "Diensten", href: "#diensten" },
  { label: "Werkwijze", href: "#werkwijze" },
  { label: "Branches", href: "#branches" },
  { label: "Tarieven", href: "#tarieven" },
  { label: "Veelgestelde vragen", href: "#faq" },
] as const;

export type Stat = {
  value: number;
  prefix?: string;
  suffix?: string;
  display?: string;
  text: string;
  source: string;
};

export const HERO = {
  eyebrow: "AI-AGENCY VOOR HET MKB",
  h1: "AI werkt. AI-projecten meestal niet.",
  sub: "95% van de AI-pilots levert nooit een euro op. Niet omdat de techniek faalt, maar omdat niemand het proces eromheen aanpakt. Wij zijn het verschil tussen een experiment en iets dat blijft draaien.",
  secondaryCta: "Bekijk wat een AI-scan oplevert",
  tertiaryCta: "Boek een kennismakingsgesprek",
  assurances: ["30 minuten", "Geen verkooppraatje", "Je krijgt drie concrete kansen mee"],
  cardTitle: "Wat de cijfers zeggen",
  cardStats: [
    {
      value: 95,
      suffix: "%",
      text: "van de AI-pilots levert geen meetbaar resultaat op",
      source: "MIT NANDA, 2025",
    },
    {
      value: 67,
      display: "67% vs 33%",
      text: "slaagkans mét specialist versus zelf bouwen",
      source: "MIT NANDA, 2025",
    },
    {
      value: 6,
      suffix: "%",
      text: "van het Nederlandse mkb heeft AI structureel geïmplementeerd",
      source: "Dialogic i.o.v. EZK, 2025",
    },
  ] as Stat[],
} as const;

export const TRUSTBAR = [
  "HubSpot",
  "Pipedrive",
  "Gmail & Outlook",
  "WhatsApp Business",
  "Slack",
  "Exact",
  "Make",
  "Zapier",
  "Microsoft 365",
] as const;

export const PROBLEM = {
  eyebrow: "DE STAND VAN ZAKEN",
  h2: "Er wordt enorm veel geld verbrand aan AI",
  intro:
    "Iedereen is bezig met AI. Bijna niemand haalt er resultaat uit. Dat is geen mening — dat is wat het onderzoek van 2025 en 2026 laat zien.",
  stats: [
    {
      value: 95,
      suffix: "%",
      text: "van de generatieve-AI-pilots levert geen meetbaar resultaat op de winst-en-verliesrekening",
      source: "MIT NANDA, The GenAI Divide, augustus 2025",
    },
    {
      value: 42,
      suffix: "%",
      text: "van de bedrijven schrapte in 2025 de meeste AI-initiatieven. Een jaar eerder was dat nog 17%",
      source: "S&P Global Market Intelligence, 2025",
    },
    {
      value: 46,
      suffix: "%",
      text: "van de proofs-of-concept haalt de productiefase niet",
      source: "S&P Global Market Intelligence, 2025",
    },
    {
      value: 40,
      suffix: "%+",
      text: "van de agentic-AI-projecten wordt vóór eind 2027 geschrapt: oplopende kosten, onduidelijke waarde, gebrekkige risicobeheersing",
      source: "Gartner, juni 2025",
    },
    {
      value: 130,
      text: 'van de duizenden aanbieders die zich "AI-agents" noemen, zijn er ongeveer 130 die het écht zijn. De rest plakt een etiket op oude software',
      source: "Gartner, juni 2025",
    },
    {
      value: 6,
      suffix: "%",
      text: "van de organisaties haalt meer dan 5% EBIT-impact uit AI. 37% ziet überhaupt enig effect",
      source: "McKinsey, State of AI 2026",
    },
  ] as Stat[],
  kicker:
    "En dan het cijfer waar het om draait: inkopen bij een specialist slaagt in 67% van de gevallen. Zelf bouwen in 33%.",
  kickerSource: "MIT NANDA, 2025",
} as const;

export const REASONS = {
  eyebrow: "DE VIJF REDENEN",
  h2: "AI-projecten stranden bijna nooit op de techniek",
  intro:
    "Ze stranden op alles eromheen. Dit zijn de vijf oorzaken die in elk onderzoek terugkomen — en precies de vijf dingen die wij standaard anders aanpakken.",
  rows: [
    {
      n: "01",
      problem:
        "De tool wordt op een kapot proces geplakt. Bedrijven die AI succesvol opschalen hebben hun werkprocessen fundamenteel herontworpen: 73% van hen, tegenover 25% van de rest. De meesten automatiseren gewoon de bestaande rommel.",
      problemSource: "McKinsey, State of AI 2026",
      approach:
        "Wij beginnen bij het proces, niet bij de tool. In de AI-scan tekenen we eerst uit hoe het werk nu écht loopt. Vaak blijkt de helft van de stappen overbodig. Wat overblijft, automatiseren we pas daarna.",
    },
    {
      n: "02",
      problem:
        "Niemand meet iets. Geen nulmeting, geen KPI, dus geen bewijs. Bij de eerste bezuinigingsronde sneuvelt het project omdat niemand kan aantonen wat het opleverde.",
      approach:
        "Eén harde KPI per automatisering, vooraf vastgelegd. We doen een nulmeting voordat er iets live gaat. Na 30 dagen zie je zwart op wit wat het scheelde in uren, doorlooptijd of omzet. Levert het niets op, dan zetten we het uit. Dat spreken we vooraf af.",
    },
    {
      n: "03",
      problem:
        "Twaalf losse tools die niet met elkaar praten. Mkb'ers die met AI werken hebben gemiddeld 7 tot 12 verschillende AI-abonnementen, nauwelijks gekoppeld. De rekening loopt op, het overzicht is weg.",
      problemSource: "Nafite, 2026",
      approach:
        "Eén architectuur, één beheerpunt. We inventariseren wat er al draait, zeggen op wat dubbelop is en koppelen wat blijft aan je CRM, agenda, inbox en administratie. Vaak verdient de sanering de scan al terug.",
    },
    {
      n: "04",
      problem:
        "Zelf bouwen loopt drie keer zo vaak vast. Interne AI-bouwprojecten slagen in ongeveer 33% van de gevallen. Samenwerken met een gespecialiseerde partij: 67%.",
      problemSource: "MIT NANDA, 2025",
      approach:
        "Je huurt ervaring in, geen enthousiasme. Wij hebben de fouten al gemaakt. En we bouwen naar overdracht toe: je team krijgt de documentatie, de training en uiteindelijk de sleutels.",
    },
    {
      n: "05",
      problem:
        "Geen beleid, geen naleving. Gebrekkige risicobeheersing is een van de drie hoofdredenen waarom Gartner verwacht dat 40% van de agentic-AI-projecten sneuvelt. Sinds 2 augustus 2026 moet bovendien elke chatbot zich in de EU kenbaar maken als AI.",
      problemSource: "Gartner 2025 · EU AI Act art. 50",
      approach:
        "AI-beleid en naleving zitten in het traject, niet als factuur achteraf. We leggen vast welke data waar mag komen, wat de AI zelfstandig mag en wat langs een mens gaat. Inclusief AI-geletterdheidstraining, die sinds februari 2025 verplicht is.",
    },
  ],
} as const;

export const SERVICES = {
  eyebrow: "WAT WE DOEN",
  h2: 'Van "wat moeten we hiermee" tot "het draait en het levert op"',
  intro:
    "Je hoeft niet alles tegelijk. De meeste klanten beginnen met een scan en groeien daarna door. Sommigen huren ons alleen in voor het stuk waar ze zelf niet uitkomen.",
  cards: [
    {
      icon: "compass",
      title: "AI-consultancy & strategie",
      subtitle: "Voor wie wil weten waar AI écht iets oplevert — en waar niet.",
      items: [
        "AI-scan: procesanalyse en kansenkaart met business case per kans",
        "Toolkeuze en -sanering: wat schaf je aan, wat zeg je op",
        "AI-beleid: welke data waar mag, wat de AI zelfstandig mag",
        "AI Act-check en verplichte AI-geletterdheidstraining voor je team",
        "Roadmap voor zes maanden, met prioritering op terugverdientijd",
      ],
      link: { label: "Zo werkt de AI-scan", href: "#ai-scan" },
      highlight: false,
    },
    {
      icon: "users",
      title: "Projectondersteuning",
      subtitle: "Voor wie al bezig is, maar vastloopt of te weinig handen heeft.",
      items: [
        "Meedraaien in een lopend intern AI-project",
        "Een pilot die blijft hangen alsnog naar productie brengen",
        "Interim AI-lead, een of twee dagen per week",
        "Tweede mening op een offerte of voorstel van een andere leverancier",
        "Kennisoverdracht en begeleiding van je eigen mensen",
      ],
      link: { label: "Bespreek je project", href: "#contact" },
      highlight: false,
    },
    {
      icon: "workflow",
      title: "Maatwerk AI-automatiseringen",
      subtitle: "Voor wie precies weet wat er moet gebeuren en het gebouwd wil hebben.",
      items: [
        "Automatiseringen op maat, gekoppeld aan je bestaande systemen",
        "Kant-en-klare AI-agents voor sales, inbox en opvolging",
        "Koppelingen met CRM, agenda, inbox, WhatsApp en administratie",
        "Monitoring, beheer en doorontwikkeling in een maandabonnement",
        "Live binnen een week per agent, maatwerk binnen enkele weken",
      ],
      link: { label: "Bekijk de agents en tarieven", href: "#agents" },
      highlight: true,
    },
  ],
} as const;

export const METHOD = {
  eyebrow: "ONZE WERKWIJZE",
  h2: "Vier fasen. Na elke fase kun je stoppen.",
  intro:
    "Geen jaarcontract voordat er iets bewezen is. Je betaalt per fase en je ziet na elke fase wat het opgeleverd heeft.",
  phases: [
    {
      n: "01",
      title: "Scan",
      badge: "2 weken",
      body: "We spreken je team, kijken mee in de systemen en tekenen de processen uit. Daarna weet je precies waar AI geld of tijd oplevert, waar het niets toevoegt en wat het gaat kosten.",
      result:
        "Kansenkaart met business case per kans, toolinventarisatie, AI Act-check en een roadmap voor zes maanden.",
    },
    {
      n: "02",
      title: "Pilot",
      badge: "2 tot 4 weken",
      body: "We bouwen één automatisering — de kans met de kortste terugverdientijd. Met nulmeting vooraf en één afgesproken KPI.",
      result:
        "Een werkende automatisering in je eigen omgeving en na 30 dagen een meting die laat zien of het werkt.",
    },
    {
      n: "03",
      title: "Uitrol",
      badge: "4 tot 12 weken",
      body: "Werkt de pilot, dan rollen we de rest van de roadmap uit. Inclusief procesaanpassing, werkinstructies en training, zodat je team het ook daadwerkelijk gebruikt.",
      result: "De volledige set automatiseringen, documentatie en getrainde medewerkers.",
    },
    {
      n: "04",
      title: "Beheer & doorontwikkeling",
      badge: "doorlopend",
      body: "Wij monitoren, verbeteren en houden alles compatibel als je systemen of de wetgeving veranderen. Maandelijks opzegbaar na de eerste drie maanden.",
      result: "Monitoring, een maandrapportage met de KPI's en doorontwikkeling binnen een vast bedrag.",
    },
  ],
} as const;

export const SCAN = {
  eyebrow: "DE INSTAP",
  h2: "Begin met de AI-scan",
  body: [
    "De meeste bedrijven weten wel dát ze iets met AI moeten. Bijna niemand weet wát, en in welke volgorde. Daar begint het misgaan. De scan haalt die onzekerheid weg voordat je ergens aan vastzit.",
    "Twee weken. We spreken je team, kijken mee in je systemen en tekenen uit hoe het werk nu loopt. Je krijgt een rapport waar je ook zonder ons iets aan hebt.",
  ],
  listTitle: "Je krijgt:",
  items: [
    "Procesanalyse van drie tot vijf kernprocessen",
    "Kansenkaart: per kans de verwachte besparing, kosten en terugverdientijd",
    "Toolinventarisatie: wat je al hebt, wat overbodig is, wat ontbreekt",
    "AI Act-check: waar je nu niet aan de regels voldoet en wat dat kost om op te lossen",
    "Roadmap voor zes maanden, geprioriteerd op terugverdientijd",
    "Presentatie van de uitkomsten aan jou en je team",
  ],
  priceLabel: "Vaste prijs, geen nacalculatie",
  priceNote: "Volledig verrekenbaar als je daarna met ons verder gaat.",
  priceFooter: "Eerst een gesprek van 30 minuten. Pas daarna beslis je over de scan.",
} as const;

export const BRANCHES = {
  eyebrow: "BRANCHES",
  h2: "Waar we het verschil het snelst maken",
  intro:
    "In IT en marketing gebruikt inmiddels de helft van de bedrijven AI. In de bouw is dat 4,6% en in transport 3,6%. Juist daar liggen de grootste, makkelijkste winsten — en de minste concurrentie.",
  introSource: "CBS, 2025",
  cards: [
    {
      icon: "hardhat",
      title: "Bouw & installatie",
      body: "Offertes die dagen blijven liggen, werkbonnen die handmatig worden overgetypt, en een werkvoorbereider die halve dagen kwijt is aan mail.",
    },
    {
      icon: "briefcase",
      title: "Zakelijke dienstverlening",
      body: "Intakes, dossiervorming en urenverantwoording. Veel repeterend leeswerk dat niemand leuk vindt en dat wél factureerbare tijd opeet.",
    },
    {
      icon: "stethoscope",
      title: "Zorg & praktijken",
      body: "Afsprakenbeheer, herhaalvragen en verslaglegging. De telefoon staat roodgloeiend terwijl de wachtkamer vol zit.",
    },
    {
      icon: "home",
      title: "Makelaardij & vastgoed",
      body: "Bezichtigingsaanvragen buiten kantooruren, objectteksten en het eeuwige nabellen van geïnteresseerden.",
    },
    {
      icon: "truck",
      title: "Transport & logistiek",
      body: 'Ritstatus, vrachtbrieven en klantvragen over "waar blijft het". Nachtwerk dat prima geautomatiseerd kan.',
    },
    {
      icon: "cart",
      title: "E-commerce & retail",
      body: "Orderstatus, retouren en productvragen. Hetzelfde antwoord, twintig keer per dag, in drie kanalen tegelijk.",
    },
  ],
  footer:
    "Staat jouw branche er niet bij? Dat maakt weinig uit. We kijken naar het proces, niet naar de sector.",
  footerLink: "Neem contact op",
} as const;

export const AGENTS = {
  eyebrow: "KANT EN KLAAR",
  h2: "Drie agents die je binnen een week live hebt",
  intro:
    "Niet elk bedrijf heeft maatwerk nodig. Deze drie lossen de meest voorkomende knelpunten op en staan meestal binnen een week te draaien.",
  cards: [
    {
      icon: "zap",
      title: "AI Sales Assistant",
      body: "Leest elke nieuwe lead, kwalificeert hem, reageert persoonlijk binnen een minuut, zet hem in je CRM en boekt zelf de afspraak. Sales praat alleen nog met leads die ertoe doen.",
      badge: "10 stappen · live binnen een week",
    },
    {
      icon: "mail",
      title: "Inbox Draft Assistant",
      body: "Koppelt aan Gmail of Outlook, leest binnenkomende mail en zet een concept-antwoord klaar in jouw toon. Standaard verstuurt hij niets zelf — jij keurt goed. Hij leert van elke wijziging die je maakt.",
      badge: "Geen autosend · jij beslist",
    },
    {
      icon: "message",
      title: "WhatsApp Follow-up Agent",
      body: "Volgt leads op via WhatsApp na een vertraging die jij instelt, houdt het gesprek warm en draagt over aan een mens zodra het complex wordt.",
      badge: "Overdracht naar mens ingebouwd",
    },
  ],
} as const;

export const PRICING = {
  eyebrow: "TARIEVEN",
  h2: "Wat het kost",
  intro:
    "Alle bedragen ex. btw. Drie maanden minimum, daarna maandelijks opzegbaar met een maand opzegtermijn. Geen jaarcontract.",
  cards: [
    {
      title: "AI-scan",
      price: `${SITE.scanPrice} eenmalig`,
      featured: false,
      items: [
        "Procesanalyse en kansenkaart",
        "Toolinventarisatie en AI Act-check",
        "Roadmap voor zes maanden",
        "Presentatie aan je team",
        "Verrekenbaar bij vervolgopdracht",
      ],
    },
    {
      title: "Start",
      price: "€795 eenmalig + €495 per maand",
      featured: false,
      items: [
        "1 agent, 1 kanaal",
        "Tot 300 leads of gesprekken per maand",
        "Koppeling met formulier, inbox of CRM",
        "Support per e-mail",
      ],
    },
    {
      title: "Groei",
      badge: "Meest gekozen",
      price: "€1.295 eenmalig + €895 per maand",
      featured: true,
      items: [
        "2 agents naar keuze",
        "Koppeling met CRM én agenda",
        "Tot 750 leads of gesprekken per maand",
        "Maandrapportage met KPI's",
      ],
    },
    {
      title: "Compleet",
      price: "€1.795 eenmalig + €1.395 per maand",
      featured: false,
      items: [
        "Alle agents, onbeperkt aantal kanalen",
        "Fair use vanaf 2.000 per maand",
        "Voorrangssupport",
        "Elk kwartaal een strategiesessie",
      ],
    },
  ],
  buttonLabel: "Plan een verkenning",
  notes: [
    "Boven de fair-use-grens: €1,00 per extra lead of gesprek. WhatsApp Business-berichtkosten worden één op één doorbelast tegen het tarief van Meta.",
    "Consultancy en projectondersteuning gaan op dagdeel- of projectbasis. Dat bespreken we in de verkenning.",
  ],
} as const;

export const GOVERNANCE = {
  eyebrow: "GRIP EN NALEVING",
  h2: "Je houdt de controle. Ook juridisch.",
  body: [
    "Het grootste bezwaar tegen AI is niet de prijs — het is de angst dat er iets de deur uit gaat waar je niet achter staat. Daarom bepaal jij per proces wat de AI zelfstandig mag, wat eerst langs een mens gaat en wanneer er wordt overgedragen. De Inbox Draft Assistant verstuurt standaard helemaal niets zonder jouw akkoord.",
    "Daarbovenop is AI sinds kort ook echt gereguleerd. De meeste mkb-bedrijven weten niet dat een deel van die verplichtingen nu al voor hen geldt. Wij regelen dat mee in het traject, zonder aparte compliance-factuur.",
  ],
  points: [
    "Jij bepaalt per proces wat automatisch mag en wat langs een mens gaat",
    "Data blijft binnen de EU, met een verwerkersovereenkomst",
    "Alles wat de AI doet is terug te zien in een activiteitenlog",
    "AI-beleid en verplichte AI-geletterdheidstraining voor je team",
  ],
  timelineTitle: "De EU AI Act in het kort",
  timeline: [
    {
      date: "2 feb 2025",
      now: "geldt nu",
      title: "AI-geletterdheid verplicht.",
      body: "Personeel dat met AI werkt moet aantoonbaar weten hoe het werkt en welke risico's eraan zitten.",
    },
    {
      date: "2 aug 2026",
      now: "geldt nu",
      title: "Transparantieplicht.",
      body: "Elke chatbot moet zich kenbaar maken als AI en AI-gegenereerde content moet machineleesbaar gelabeld worden.",
    },
    {
      date: "2 dec 2027",
      title: "Hoog-risicosystemen.",
      body: "Onder meer AI in werving, selectie en kredietbeoordeling moet dan aan zware eisen voldoen en geregistreerd zijn.",
    },
  ],
  footnote:
    "Boetes lopen op tot €15 miljoen of 3% van de wereldwijde jaaromzet; voor mkb geldt het laagste van beide bedragen. Bron: EU AI Act.",
} as const;

export const PROOF = {
  h2: "Wat het in de praktijk doet",
  stats: [
    { value: 40, prefix: "~", suffix: " seconden", text: "tot de eerste reactie op een nieuwe lead" },
    { value: 3, suffix: "×", text: "sneller opgevolgd dan daarvoor" },
    { value: 0, text: "gemiste berichten buiten kantooruren" },
  ],
  quote:
    "Onze responstijd ging van dagen naar seconden. Sales praat nu alleen nog met leads die er toe doen.",
  quoteName: "Lotte van Dijk",
  quoteRole: "Head of Sales, B2B-software · 3× meer afspraken",
  placeholder: "PLAATSHOUDER — ruimte voor twee extra klantcases zodra beschikbaar",
} as const;

export const PERSON = {
  h2: "Geen accountmanager. De persoon die het bouwt.",
  body: [
    "Bij grote bureaus praat je met een verkoper, tekent je bij een consultant en krijg je een junior aan het werk. Hier niet. Je spreekt vanaf het eerste gesprek de persoon die het ook daadwerkelijk bouwt en beheert. Dat maakt de lijnen kort en de beloftes realistisch.",
    "Wat je van ons kunt verwachten: we zeggen het als AI niet de oplossing is. Dat is regelmatig het geval, en het scheelt je een hoop geld.",
  ],
  placeholder: `PLAATSHOUDER — foto en korte bio van ${SITE.person}`,
} as const;

export const FAQ = {
  h2: "Veelgestelde vragen",
  items: [
    {
      q: "Wij zijn een klein bedrijf. Is dit niet iets voor grote organisaties?",
      a: "Juist niet. Bij grote organisaties verdwijnt AI in vergadercycli. In een mkb-bedrijf kun je een proces in twee weken aanpassen en het effect meteen zien. Het cijfer waar het om draait: 66,2% van de bedrijven met meer dan 250 medewerkers gebruikt AI, tegenover 13,8% van de bedrijven met minder dan tien. Dat gat is nu nog een voorsprong die je kunt pakken. (CBS, 2025)",
    },
    {
      q: "We hebben al ChatGPT. Wat voegen jullie toe?",
      a: "ChatGPT is een goede assistent voor een individu. Het is geen bedrijfsproces. Het kent je klanten niet, staat niet in je CRM, doet 's nachts niets en laat geen spoor na. Wij bouwen de laag die dat wél doet — en zorgen dat het aansluit op hoe jullie werken.",
    },
    {
      q: "Wat als het niet werkt?",
      a: "Dan zetten we het uit. Elke automatisering heeft vooraf een nulmeting en één KPI. Na 30 dagen zie je of het effect er is. Zo niet, dan gaan we niet door met een tweede fase. Daarom werken we ook per fase en niet met een jaarcontract.",
    },
    {
      q: "Hoe lang duurt het voordat er iets draait?",
      a: "Een kant-en-klare agent staat meestal binnen een week live. De scan duurt twee weken. Een maatwerkautomatisering is doorgaans twee tot vier weken van start tot werkende pilot.",
    },
    {
      q: "Moeten wij technisch zijn?",
      a: "Nee. Jij levert toegang tot de systemen en je manier van werken aan. Wij doen de rest, inclusief het inwerken van je team.",
    },
    {
      q: "Wat gebeurt er met onze data?",
      a: "Die blijft binnen de EU en we sluiten een verwerkersovereenkomst. Je bepaalt zelf welke data de AI mag zien en wat er buiten blijft. Alles wat de AI doet, staat in een log.",
    },
    {
      q: "Zit ik ergens aan vast?",
      a: "Drie maanden minimum bij een abonnement, daarna maandelijks opzegbaar met een maand opzegtermijn. De scan is een losse opdracht met vaste prijs. Consultancy gaat per dagdeel.",
    },
    {
      q: "Wij hebben al een AI-project dat vastloopt. Kunnen jullie dat overnemen?",
      a: "Ja, dat is een van onze drie diensten. We kijken eerst wat er is gebouwd en waarom het blijft hangen. Vaak zit het niet in de techniek maar in het proces of de adoptie, en is er meer te redden dan mensen denken.",
    },
    {
      q: "Wat kost het als we alleen advies willen?",
      a: "Dan blijft het bij de scan. Je krijgt het rapport en de roadmap en kunt daar zelf mee verder, of ermee naar een andere partij. We houden niets achter.",
    },
  ],
} as const;

export const CONTACT = {
  h2: "Een half uur. Drie concrete kansen. Geen verplichtingen.",
  sub: "We kijken samen naar één proces waar het bij jullie schuurt, en zeggen eerlijk of AI daar iets oplevert. Ook als het antwoord nee is.",
  stageLabel: "Waar zit je nu?",
  stages: [
    "Ik oriënteer me nog",
    "Ik heb een concreet proces in gedachten",
    "We zijn al bezig maar het loopt vast",
    "Ik wil de AI-scan inplannen",
  ],
  messageLabel: "Waar loop je tegenaan?",
  submit: "Verstuur — ik neem binnen één werkdag contact op",
  privacy: "Je gegevens gaan naar niemand anders. Geen nieuwsbrief, tenzij je daar zelf om vraagt.",
  success: "Dank je. Ik neem binnen één werkdag contact op.",
} as const;

export const FOOTER = {
  blurb:
    "We bouwen AI-automatiseringen die blijven draaien — en zeggen het als AI niet de oplossing is.",
  services: [
    "AI-consultancy & strategie",
    "Projectondersteuning",
    "Maatwerk automatiseringen",
    "AI-scan",
  ],
  company: [
    { label: "Werkwijze", href: "#werkwijze" },
    { label: "Branches", href: "#branches" },
    { label: "Tarieven", href: "#tarieven" },
    { label: "Veelgestelde vragen", href: "#faq" },
  ],
  legal: ["Privacyverklaring", "Algemene voorwaarden", "AI-beleid"],
} as const;
