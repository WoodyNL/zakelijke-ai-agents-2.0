/**
 * Alle teksten en cijfers van de landingspagina.
 * Pas hier aan; de secties lezen hieruit.
 */

export const SITE = {
  name: "Zakelijke AI Agents",
  tagline: "AI-agency voor het MKB",
  scanPrice: "€1.450",
  person: "Wouter Ransijn",
  email: "wouter@zakelijkeaiagents.nl",
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
  { name: "HubSpot", category: "CRM", icon: "crm" },
  { name: "Pipedrive", category: "CRM", icon: "crm" },
  { name: "Salesforce", category: "CRM", icon: "crm" },
  { name: "Gmail & Outlook", category: "E-mail", icon: "mail" },
  { name: "WhatsApp Business", category: "Berichten", icon: "message" },
  { name: "Slack & Teams", category: "Samenwerken", icon: "team" },
  { name: "Exact Online", category: "Administratie", icon: "database" },
  { name: "Microsoft 365", category: "Werkplek", icon: "workspace" },
  { name: "Google Workspace", category: "Werkplek", icon: "workspace" },
  { name: "Make", category: "Automatisering", icon: "workflow" },
  { name: "n8n", category: "Automatisering", icon: "workflow" },
  { name: "Zapier", category: "Automatisering", icon: "workflow" },
  { name: "Calendly", category: "Planning", icon: "calendar" },
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
      result:
        "Monitoring, een maandrapportage met de KPI's en doorontwikkeling binnen een vast bedrag.",
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
    "Alle bedragen ex. btw. Je begint met een scan of met \u00e9\u00e9n agent, en beslist daarna pas of je verder gaat. Abonnementen: drie maanden minimum, daarna maandelijks opzegbaar. Trajecten: vaste prijs vooraf, geen nacalculatie.",
  cards: [
    {
      schemaPrice: 1450,
      kicker: "Stap 1 \u2014 weten",
      title: "AI-scan",
      price: `${SITE.scanPrice} eenmalig`,
      featured: false,
      items: [
        "Procesanalyse van drie tot vijf kernprocessen",
        "Kansenkaart met terugverdientijd per kans",
        "Toolinventarisatie en AI Act-check",
        "Roadmap voor zes maanden",
        "Presentatie aan jou en je team",
      ],
      note: "Volledig verrekenbaar bij een vervolgopdracht.",
    },
    {
      schemaPrice: 795,
      kicker: "Kant-en-klaar",
      title: "AI-agent",
      price: "\u20ac795 eenmalig + \u20ac495 per maand",
      featured: false,
      items: [
        "\u00c9\u00e9n agent op \u00e9\u00e9n kanaal, live binnen een week",
        "Tot 300 leads of gesprekken per maand",
        "Koppeling met je formulier, inbox of CRM",
        "Monitoring, updates en support per e-mail",
        "Uitbreiden met een extra agent: \u20ac395 per maand",
      ],
      note: "Geen scan nodig. De snelste manier om te zien of het werkt.",
    },
    {
      schemaPrice: 4500,
      kicker: "Stap 2 \u2014 bouwen",
      title: "AI-traject",
      badge: "Meest gekozen",
      price: "vanaf \u20ac4.500 eenmalig + \u20ac395 per maand",
      featured: true,
      items: [
        "\u00c9\u00e9n proces herontworpen \u00e9n geautomatiseerd",
        "Vaste prijs, bepaald na de scan",
        "Nulmeting vooraf, \u00e9\u00e9n KPI, meting na 30 dagen",
        "Koppelingen met je eigen systemen",
        "Werkinstructies en training voor je team",
        "Daarna \u20ac395 p.m. beheer en maandrapportage",
      ],
      note: "Levert het na 30 dagen niets op, dan zetten we het uit.",
    },
    {
      schemaPrice: 2450,
      kicker: "Stap 3 \u2014 doorpakken",
      title: "AI-partner",
      price: "\u20ac2.450 per maand",
      featured: false,
      items: [
        "Twee vaste dagen per maand aan capaciteit",
        "Je roadmap wordt uitgevoerd, niet alleen geschreven",
        "Al je automatiseringen beheerd en doorontwikkeld",
        "Elk kwartaal een strategiesessie",
        "AI Act-bewaking en teamtraining inbegrepen",
        "Geen losse projectfacturen meer",
      ],
      note: "Ruim de helft goedkoper dan \u00e9\u00e9n medewerker erbij.",
    },
  ],
  buttonLabel: "Plan een verkenning",
  rateSheet: {
    h3: "Losse tarieven",
    sub: "Voor als je iets kleiners of iets groters nodig hebt dan de pakketten hierboven.",
    items: [
      {
        label: "AI-verkenning",
        detail: "30 minuten, vrijblijvend, geen presentatie",
        price: "Gratis",
        free: true,
      },
      {
        label: "AI Act-pakket",
        detail: "Check, AI-beleid en de verplichte geletterdheidstraining",
        price: "\u20ac950 eenmalig",
        free: false,
      },
      {
        label: "Extra agent",
        detail: "Op een bestaand abonnement",
        price: "\u20ac395 p.m.",
        free: false,
      },
      {
        label: "Losse expertise",
        detail: "Tweede mening, meedraaien in je project, workshop",
        price: "\u20ac695 per dagdeel",
        free: false,
      },
      {
        label: "Hele dag",
        detail: "Aaneengesloten dag, bijvoorbeeld een implementatiedag",
        price: "\u20ac1.195 per dag",
        free: false,
      },
      {
        label: "Interim AI-lead",
        detail: "\u00c9\u00e9n vaste dag per week bij jullie aan tafel",
        price: "vanaf \u20ac4.250 p.m.",
        free: false,
      },
      {
        label: "Boven de fair-use-grens",
        detail: "Per extra lead of gesprek",
        price: "\u20ac1,00",
        free: false,
      },
    ],
  },
  notes: [
    "WhatsApp Business-berichtkosten worden \u00e9\u00e9n op \u00e9\u00e9n doorbelast tegen het tarief van Meta. Fair use: 300 gesprekken per maand bij AI-agent, 2.000 bij AI-traject en AI-partner.",
    "De AI-scan is verrekenbaar met elk vervolgtraject. Het AI Act-pakket is verrekenbaar met de scan.",
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
    {
      value: 40,
      prefix: "~",
      suffix: " seconden",
      text: "tot de eerste reactie op een nieuwe lead",
    },
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
  name: "Wouter Ransijn",
  role: "Oprichter & AI-automatisering specialist",
  bio: [
    "Zeven jaar zelfstandig ondernemer, de laatste twee jaar volledig gericht op AI-automatisering voor het mkb.",
    "Werkt dagelijks met Claude Code, n8n, Zapier en Make om processen te bouwen die daadwerkelijk draaien — geen pilots die na drie maanden stilvallen.",
  ],
  skills: ["Claude Code", "n8n", "Zapier", "Make", "AI-strategie", "Procesautomatisering"],
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
      a: "Drie maanden minimum bij een abonnement, daarna maandelijks opzegbaar met een maand opzegtermijn. De scan en het AI-traject zijn losse opdrachten met een vaste prijs vooraf, zonder nacalculatie. Losse expertise gaat per dagdeel \u00e0 \u20ac695.",
    },
    {
      q: "Wij hebben al een AI-project dat vastloopt. Kunnen jullie dat overnemen?",
      a: "Ja, dat is een van onze drie diensten. We kijken eerst wat er is gebouwd en waarom het blijft hangen. Vaak zit het niet in de techniek maar in het proces of de adoptie, en is er meer te redden dan mensen denken.",
    },
    {
      q: "Wat kost het als we alleen advies willen?",
      a: "Dan blijft het bij de AI-scan van \u20ac1.450. Je krijgt het rapport en de roadmap en kunt daar zelf mee verder, of ermee naar een andere partij. Ga je wel met ons door, dan is dat bedrag volledig verrekenbaar. We houden niets achter.",
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
  // Deze stonden hier als drie losse woorden en werden als <span> gerenderd:
  // opschriften zonder pagina eronder. Nu zijn het verwijzingen naar teksten
  // die er echt zijn — vereist door de AVG, en op een site die naleving
  // verkoopt ook gewoon een kwestie van geloofwaardigheid.
  legal: [
    { label: "Privacyverklaring", href: "/privacyverklaring" },
    { label: "Algemene voorwaarden", href: "/algemene-voorwaarden" },
    { label: "AI-beleid", href: "/ai-beleid" },
  ],
} as const;
