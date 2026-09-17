/**
 * Welke pagina's onderaan elke SEO-pagina naar elkaar verwijzen.
 *
 * Hier stond eerst op elke pagina dezelfde lijst met alle elf adressen. Dat
 * leest als een inhoudsopgave, maar het zegt niets: als alles naar alles wijst,
 * valt er uit de verwijzingen niet af te leiden welke pagina's bij elkaar horen
 * of welke de belangrijkste zijn. Een zoekmachine herkent zo'n blok dat overal
 * gelijk is bovendien als sjabloon en telt de links er nauwelijks in mee.
 *
 * Daarom verwijst elke pagina nu naar drie of vier pagina's die er echt bij
 * horen. Er zijn drie groepen — oriënteren en adviseren, de agents zelf, en
 * Amsterdam — met per pagina één oversteek naar een andere groep, zodat het
 * geen drie losse eilanden worden.
 *
 * De tarievenpagina staat met opzet niet in de lijsten hieronder: die wordt
 * overal automatisch achteraan gezet. Het is de pagina waar je bezoekers
 * uiteindelijk wilt hebben, en de enige waarvoor "vanaf overal bereikbaar"
 * daadwerkelijk klopt.
 */

export const TARIEVEN_PAD = "/tarieven";

/** Het opschrift waaronder een adres in het blok verschijnt. */
export const PAGINA_LABELS: Record<string, string> = {
  "/tarieven": "Tarieven",
  "/ai-scan": "AI-scan",
  "/ai-voor-het-mkb-amsterdam": "AI voor het MKB in Amsterdam",
  "/ai-automatisering-op-maat": "Maatwerk AI-automatisering",
  "/ai-project-vastgelopen": "AI-project vastgelopen?",
  "/ai-consultancy-mkb": "AI-consultancy & strategie",
  "/ai-agents-amsterdam": "AI agents in Amsterdam",
  "/ai-lead-opvolging": "AI lead opvolging",
  "/whatsapp-follow-up-automatiseren": "WhatsApp follow-up automatiseren",
  "/ai-klantenservice-automatiseren": "AI klantenservice automatiseren",
  "/blog/waarom-ai-pilots-mislukken": "Waarom AI-pilots mislukken",
};

const VERWANT: Record<string, string[]> = {
  // Oriënteren en adviseren.
  "/ai-scan": [
    "/ai-consultancy-mkb",
    "/ai-project-vastgelopen",
    "/blog/waarom-ai-pilots-mislukken",
    "/ai-voor-het-mkb-amsterdam",
  ],
  "/ai-consultancy-mkb": [
    "/ai-scan",
    "/ai-project-vastgelopen",
    "/ai-automatisering-op-maat",
    "/blog/waarom-ai-pilots-mislukken",
  ],
  "/ai-project-vastgelopen": [
    "/blog/waarom-ai-pilots-mislukken",
    "/ai-consultancy-mkb",
    "/ai-scan",
  ],
  "/blog/waarom-ai-pilots-mislukken": [
    "/ai-project-vastgelopen",
    "/ai-scan",
    "/ai-consultancy-mkb",
  ],

  // De agents zelf.
  "/ai-lead-opvolging": [
    "/whatsapp-follow-up-automatiseren",
    "/ai-klantenservice-automatiseren",
    "/ai-automatisering-op-maat",
    "/ai-agents-amsterdam",
  ],
  "/whatsapp-follow-up-automatiseren": [
    "/ai-lead-opvolging",
    "/ai-klantenservice-automatiseren",
    "/ai-agents-amsterdam",
  ],
  "/ai-klantenservice-automatiseren": [
    "/ai-lead-opvolging",
    "/whatsapp-follow-up-automatiseren",
    "/ai-automatisering-op-maat",
  ],
  "/ai-automatisering-op-maat": [
    "/ai-lead-opvolging",
    "/ai-klantenservice-automatiseren",
    "/ai-scan",
    "/ai-voor-het-mkb-amsterdam",
  ],

  // Amsterdam.
  "/ai-voor-het-mkb-amsterdam": ["/ai-agents-amsterdam", "/ai-scan", "/ai-consultancy-mkb"],
  "/ai-agents-amsterdam": [
    "/ai-voor-het-mkb-amsterdam",
    "/ai-lead-opvolging",
    "/ai-klantenservice-automatiseren",
  ],

  // De tarievenpagina wijst terug naar waar de bedragen over gaan.
  "/tarieven": [
    "/ai-scan",
    "/ai-automatisering-op-maat",
    "/ai-consultancy-mkb",
    "/ai-voor-het-mkb-amsterdam",
  ],
};

/**
 * De adressen waar het blok onderaan {@link pad} naartoe verwijst.
 *
 * Kent de tabel het pad niet — een nieuwe pagina die nog niet is ingedeeld —
 * dan vallen we terug op alle andere pagina's. Liever te veel verwijzingen dan
 * een pagina die nergens aan vastzit.
 */
export function verwantePaginas(pad: string): string[] {
  const genormaliseerd = pad.length > 1 && pad.endsWith("/") ? pad.slice(0, -1) : pad;
  const verwant = VERWANT[genormaliseerd];

  if (!verwant) {
    return Object.keys(PAGINA_LABELS).filter((p) => p !== genormaliseerd);
  }

  return genormaliseerd === TARIEVEN_PAD ? verwant : [...verwant, TARIEVEN_PAD];
}
