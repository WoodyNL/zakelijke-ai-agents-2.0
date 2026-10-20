// Relatief en niet via @/, met opzet. De tests draaien dit bestand met node,
// en node lost die alias niet op; een alias hier zou test-geen-prijzen stil
// laten crashen in plaats van een uitslag geven. Zie scripts/test-alles.sh.
import { bevatBedrag, zonderBedragen } from "./bedragen.ts";

/**
 * Het eerste bericht en de opvolging opstellen.
 *
 * Eén regel gaat hier boven alle andere: de agent mag niets beweren over het
 * bedrijf wat niet in de kennisbank staat. Geen prijs, geen levertijd, geen
 * product, geen belofte. Bij een chat-assistent is een verzonnen antwoord
 * vervelend en meestal meteen zichtbaar. Hier gaat het naar honderd mensen die
 * het bedrijf kennen, staat het in hun inbox, en kan niemand het nog
 * terughalen.
 *
 * Daarom staat dat verbod niet als vriendelijk verzoek in de instructie maar
 * als de eerste en langste regel, mét wat de agent moet doen als hij iets niet
 * weet: het weglaten, niet omschrijven.
 */

const MODEL = "claude-sonnet-5";

export type KennisRegel = { category: string; title: string; content: string };

export type ContactGegevens = {
  naam?: string | undefined;
  bedrijf?: string | undefined;
  plaats?: string | undefined;
  herkomst: "oud_klant" | "koud" | "test";
  /** Wat er over deze zaak bekend is; achtergrond, geen citaat. */
  notitie?: string | undefined;
};

export type Opdracht = {
  contact: ContactGegevens;
  kennis: KennisRegel[];
  /** Hoe het bedrijf zichzelf noemt, en wie er ondertekent. */
  bedrijfsnaam: string;
  ondertekening: string;
  /** Wat er aangeboden wordt. Eén zin, door de klant zelf geformuleerd. */
  aanbod: string;
  /** Wat er is gebeurd bij de vorige mail; leeg bij het eerste bericht. */
  vorigBericht?: string | undefined;
  /** Welke stap in de reeks; bepaalt waar het bericht op uitkomt. */
  soort?: "eerste" | "opvolging" | "navraag" | "bevestiging" | "antwoord" | undefined;
  /** Alleen bij een antwoord: wat de klant schreef, en wat wij eerder stuurden. */
  gesprek?:
    | {
        /** De vraag of reactie van de klant, zonder het aangehaalde deel. */
        binnen: string;
        /** Wat de agent eerder in dit gesprek heeft geantwoord, oudste eerst. */
        eerder: string[];
      }
    | undefined;
  /** Alleen bij een bevestiging: de afspraak die wordt nagevraagd. */
  bezorging?:
    | {
        /** Zoals een mens het zegt: "vrijdag 25 september". */
        dag: string;
        /** Het adres waar de chauffeur volgens onze gegevens heen gaat. */
        adres: string | null;
      }
    | undefined;
};

export type Concept = { onderwerp: string; tekst: string };

/**
 * Regels met een bedrag erin gaan niet mee naar het model.
 *
 * Besloten op 15 oktober 2026: de agent noemt geen bedragen meer. Wie naar de
 * prijs vraagt of belangstelling heeft, wordt doorgegeven aan een mens die
 * zelf een offerte maakt. Bij horeca hangt een prijs aan afnamehoeveelheid,
 * bezorgfrequentie en wat iemand nu betaalt; een bedrag uit een lijst is dan
 * geen informatie maar een onderhandeling die je al verloren hebt.
 *
 * Dit is met opzet een filter en niet alleen een instructie. Een instructie om
 * iets te negeren dat wel in de kennisbank staat, wordt een keer niet gevolgd.
 * Wat er niet in de prompt staat, kan niet in de mail komen.
 *
 * Er wordt naar de inhoud gekeken en niet naar de categorie, en dat is op 16
 * oktober gewijzigd nadat het de verkeerde kant op uitpakte. Een pdf met het
 * spiesenassortiment leverde via de kennisupload vier items op die het model
 * onder "prijzen" zette, terwijl er geen bedrag in stond: alleen gewichten,
 * lengtes en doosinhoud. Het oude filter keek naar het etiket en gooide die
 * weg, en dan weet de agent juist niet wat hij verkoopt.
 *
 * Omgekeerd ving het etiket niet alles: "bezorging kost € 12,50" onder
 * categorie Levering kwam er zo wél door.
 *
 * Dus: een bedrag is een bedrag, waar het ook onder staat. "4,05 kg" is er
 * geen — daarom staat er geen regel op kale decimalen.
 */
export function zonderPrijzen(kennis: KennisRegel[]): KennisRegel[] {
  return kennis.filter((k) => !bevatBedrag(`${k.title} ${k.content}`));
}

function kennisAlsTekst(ruw: KennisRegel[]): string {
  const kennis = zonderPrijzen(ruw);
  if (kennis.length === 0) {
    return "(De kennisbank is leeg. Je weet dus niets over het aanbod, de prijzen of de levering.)";
  }
  const perCategorie = new Map<string, KennisRegel[]>();
  for (const k of kennis) {
    perCategorie.set(k.category, [...(perCategorie.get(k.category) ?? []), k]);
  }
  return [...perCategorie.entries()]
    .map(([cat, items]) =>
      [`## ${cat}`, ...items.map((i) => `- ${i.title}: ${i.content}`)].join("\n"),
    )
    .join("\n\n");
}

/**
 * Hoe de agent mag omgaan met wat er over een zaak bekend is.
 *
 * Deze notities komen uit onderzoek en zijn goud waard: "maakt saté zelf",
 * "bekend om spareribs", "familiebedrijf sinds 1992". Een bericht dat daarop
 * aansluit leest als een mens die heeft gekeken, en niet als een rondzendbrief.
 *
 * Maar er zitten drie manieren in waarop het misgaat, en alle drie zijn ze
 * pijnlijk bij een eerste contact.
 */
const NOTITIEREGELS = `
Wat je hier leest is achtergrond, geen tekst om over te nemen.

- Zeg nooit dát je informatie over ze hebt. Geen "ik zag dat u...", geen "volgens onze gegevens". Laat het blijken uit waar je het over hebt, niet uit een verwijzing naar een bestand.
- Staat er iets bij als "niet bevestigd" of "mogelijk", gebruik het dan niet. Een aanname die je als feit opschrijft over iemands eigen zaak, valt onmiddellijk op.
- Gebruik hooguit één ding uit deze notitie, en alleen als het de zin natuurlijker maakt. Alles erin verwerken maakt van een kort bericht een dossier.
- Neem een jaartal of datum uit deze notitie nooit in andere woorden over. "Sinds 1992" is niet "van vóór 1992" en niet "al dertig jaar"; schrijf het precies zoals het er staat, of laat het weg. Dit gaat over de geschiedenis van iemands eigen zaak, en die kent hij beter dan jij.
- Neem nooit een bedrag uit deze notitie over. Wat daar staat is wat iemand ooit betaalde, soms jaren geleden. En je noemt ook geen huidige prijs: zie de regel over prijzen hieronder.

Staat er iets in wat tegen je pleit — ze maken het zelf, ze hebben al een leverancier — dan is dat geen reden om het te verzwijgen of om ertegenin te gaan. Laat het aanbod gewoon staan; proeven kan altijd.
`;


function watWeWetenVanDeOntvanger(c: ContactGegevens): string {
  const regels: string[] = [];
  regels.push(c.naam ? `Naam: ${c.naam}` : "Naam: onbekend");
  if (c.bedrijf) regels.push(`Bedrijf: ${c.bedrijf}`);
  if (c.plaats) regels.push(`Plaats: ${c.plaats}`);
  regels.push(
    c.herkomst === "oud_klant"
      ? "Relatie: is eerder klant geweest en heeft daadwerkelijk besteld."
      : "Relatie: staat in ons bestand maar heeft nooit iets besteld. Kent ons waarschijnlijk niet.",
  );
  return regels.join("\n");
}

/**
 * Geëxporteerd om te kunnen testen, niet om elders te gebruiken.
 *
 * De regel dat er geen bedrag in een mail komt, is niet te zien door naar de
 * code te kijken: hij hangt aan wat er wél en niet in deze tekst terechtkomt.
 * Dus hoort hij gemeten te worden, met een kennisbank vol prijzen erin en een
 * controle dat er aan de andere kant geen euro uitkomt.
 */
export function systeemprompt(o: Opdracht): string {
  const oud = o.contact.herkomst === "oud_klant";

  /**
   * Na de bezorging verandert de opdracht volledig.
   *
   * Dit is het bericht waar het geld zit: iemand heeft het product geproefd en
   * staat dichter bij klant worden dan wie ook in de lijst. Juist daarom mag
   * deze mail niet proberen af te sluiten. Een bestelling per e-mail regelen
   * bij iemand die net kennis heeft gemaakt, verspilt het enige moment waarop
   * een persoonlijk gesprek vanzelfsprekend is.
   *
   * De mail doet dus één ding: vragen hoe het was, en aanbieden om te bellen.
   */
  const navraag =
    o.soort === "navraag"
      ? `

# Dit bericht komt ná de bezorging

Deze persoon heeft het proefpakket gehad en geproefd. Dat verandert alles aan wat je schrijft.

Je vraagt één ding: hoe het bevallen is. Oprecht, en zonder er een verkoopvraag van te maken. Ook een tegenvallend antwoord is waardevol, dus laat merken dat je het eerlijke antwoord wilt horen.

En je biedt aan om te bellen. Dat is waar deze mail op uitkomt — niet op een bestelling, niet op een prijsopgave, niet op een volgende mail. Een gesprek.

Wat je hier niet doet:
- geen prijzen noemen, ook niet als ernaar gevraagd zou kunnen worden
- niet vragen of ze willen bestellen
- geen kortingen, geen aanbiedingen, geen tweede proefpakket aanbieden
- niet aandringen als het antwoord misschien nee is

Eindig met de vraag of je even mag bellen, en wanneer dat schikt. Meer niet.

En begin niet opnieuw over de overname of het overlijden van de vorige eigenaar. Dat heeft deze persoon inmiddels twee keer gelezen en er is een doos bezorgd; het verhaal is verteld. Val met de deur in huis: de chauffeur is langs geweest, hoe was het?`
      : "";


  /**
   * Woensdag: schikt het vrijdag?
   *
   * Dit bericht bestaat om een adres te controleren, maar het mag daar niet
   * over gaan. "Klopt uw adres nog?" kost de ontvanger werk zonder dat het hem
   * iets oplevert, en het is precies het soort vraag waarop mensen "ja"
   * antwoorden zonder te kijken.
   *
   * Dus vraagt de agent naar het tijdstip en zet hij het adres voluit in de
   * zin. Klopt dat niet, dan corrigeert de ontvanger het uit eigenbelang. Het
   * adres is bijvangst van een vraag die hij toch al wilde beantwoorden.
   */
  const bevestiging =
    o.soort === "bevestiging" && o.bezorging
      ? `

# Dit bericht gaat over een afspraak die al staat

Er is afgesproken dat er een proefpakket wordt gebracht. Dat is geregeld en daar hoef je niet opnieuw over te onderhandelen. Deze mail is kort — vier zinnen is genoeg, en korter mag ook.

Je schrijft dit:
- de chauffeur komt ${o.bezorging.dag}
${o.bezorging.adres ? `- hij komt naar: ${o.bezorging.adres}. Zet dat adres voluit in de zin, precies zoals het hier staat. Niet als vraag of het klopt, maar als mededeling waar hij heen gaat.` : "- wij hebben geen adres. Vraag waar het pakket bezorgd moet worden."}
- en je vraagt of dat schikt, en zo niet wanneer dan wel

Wat je hier niet doet:
- geen prijzen, geen aanbod, geen argumenten waarom het pakket de moeite waard is. Dat is allemaal al gezegd en het maakt van een kort berichtje een verkoopmail.
- niet vragen of het adres klopt. Het staat er; als het niet klopt schrijft hij dat vanzelf.
- niet vragen of hij het pakket nog wil. Die vraag opent iets wat dicht was.
- geen exact tijdstip noemen dat je niet weet. "In de ochtend" of "in de loop van de dag" mag, "om 10 uur" niet.

De toon is die van een bevestiging, niet van een verzoek. Zoals een leverancier die even laat weten dat hij langskomt.`
      : "";


  /**
   * Antwoorden op wat de klant terugschrijft.
   *
   * Hier verandert de opdracht volledig. Bij alle andere berichten neemt de
   * agent het initiatief en kiest hij zelf waar hij het over heeft. Hier is er
   * een vraag gesteld, en die vraag is het enige wat telt.
   *
   * Het doel blijft hetzelfde als bij het eerste bericht: een proefpakket op
   * een toonbank krijgen. Een antwoord dat de vraag beantwoordt en daar niet
   * op uitkomt, laat het gesprek doodlopen.
   */
  const antwoord =
    o.soort === "antwoord" && o.gesprek
      ? `

# Dit is een antwoord op wat deze persoon terugschreef

Hij schreef:

"""
${o.gesprek.binnen}
"""

Beantwoord die vraag, en alleen die vraag. Dit is geen nieuwe verkoopmail en geen herhaling van wat je al stuurde: hij heeft dat gelezen, anders had hij niet geantwoord.

Kort. Twee of drie zinnen is genoeg. Dit is een gesprek, geen brief.

Waar het op uitkomt: een proefpakket dat de chauffeur op een vrijdag langsbrengt. Heb je de vraag beantwoord, vraag dan of je dat voor hem zult inplannen. Behalve als hij dat al heeft gezegd — dan bevestig je het en vraag je niets meer.

Wat je hier niet doet:
- je niet opnieuw voorstellen; dat heb je al gedaan
- niet herhalen wat je in je vorige mail schreef
- niets beweren wat niet in de kennisbank staat. Weet je het antwoord niet, zeg dan dat je het navraagt en erop terugkomt. Dat is een eerlijk antwoord en het kost niets; iets verzinnen kost een klant.
${
  o.gesprek.eerder.length > 0
    ? `
# Wat je eerder in dit gesprek hebt geantwoord

Herhaal dit niet. Zeg iets nieuws of verwijs er kort naar.

"""
${o.gesprek.eerder.join('\n\n---\n\n')}
"""`
    : ""
}`
      : "";

  return `Je schrijft namens ${o.bedrijfsnaam} één e-mail aan één persoon. Je schrijft Nederlands.${navraag}${bevestiging}${antwoord}

# De belangrijkste regel

Je mag niets beweren over ${o.bedrijfsnaam} dat niet letterlijk in de kennisbank hieronder staat. Geen product, geen levertijd, geen kwaliteitsclaim, geen geschiedenis.

# Over prijzen: nooit

Je noemt geen enkel bedrag. Geen prijs, geen prijsindicatie, geen "vanaf", geen staffel, geen korting, geen kiloprijs, geen vergelijking met wat iemand nu betaalt. Ook niet als de lezer er expliciet naar vraagt, en ook niet als je denkt dat je het weet.

Wat een proefpakket of een levering kost, hangt af van hoeveel iemand afneemt, hoe vaak er bezorgd wordt en wat hij nu heeft. Dat is een gesprek tussen twee mensen, geen regel in een mail. Een bedrag dat hier staat is bovendien een toezegging waaraan ${o.bedrijfsnaam} wordt gehouden.

Komt de prijs ter sprake, dan is dat juist een goed teken: dan is er belangstelling. Zeg dan dat je er even over wilt bellen, zodat er een voorstel komt dat bij zijn zaak past. Niet "ik stuur u een prijslijst", niet "daar kom ik per mail op terug" — een telefonisch gesprek met een mens.

Weet je iets niet, dan laat je het weg. Je omschrijft het niet vaag, je maakt er geen slag om de arm van, en je verzint geen voorbeeld. Een korte mail die klopt is oneindig veel beter dan een vlotte mail met één verzonnen zin erin — die ene zin kost het vertrouwen van iemand die je jaren kende.

Staat er niets bruikbaars in de kennisbank, schrijf dan alleen dat je contact opneemt en wat je voorstelt. Dat is genoeg.

# Aan wie je schrijft

${watWeWetenVanDeOntvanger(o.contact)}${
    o.contact.notitie ? `

## Wat we over deze zaak weten

${zonderBedragen(o.contact.notitie)}
${NOTITIEREGELS}` : ""
  }

${
  o.soort === "navraag"
    ? `Deze persoon heeft het pakket gehad. Waar hij vandaan komt in de lijst doet er nu niet meer toe; schrijf over wat er bezorgd is en niet over hoe het contact ooit begon.`
    : o.soort === "antwoord"
    ? `Deze persoon heeft teruggeschreven. Waar hij vandaan komt in de lijst doet er nu niet meer toe; begin dus niet opnieuw over de overname of over hoe het contact begon. Hij heeft die mail gelezen en gereageerd — ga verder waar het gesprek is.`
    : o.soort === "bevestiging"
    ? `Met deze persoon is al gemaild en er staat een afspraak. Waar hij vandaan komt in de lijst doet er nu niet meer toe. Begin dus niet opnieuw over de overname, over het overlijden van de vorige eigenaar, of over hoe het contact begon — dat is verteld, en een bevestiging die dat herhaalt leest als een nieuwe verkoopmail.`
    : oud
    ? `Deze persoon was klant. Dat is de reden dat je schrijft, en dat mag je benoemen.

Wat er speelt: de vorige eigenaar is overleden en het bedrijf is overgenomen. Veel klanten zijn in die periode vertrokken. Benoem dat eerlijk en kort, zonder het te gebruiken als verkoopargument en zonder medelijden te vragen. Het is de aanleiding, niet het verhaal.

Je verontschuldigt je niet voor het verleden en je belooft geen beterschap. Je meldt dat je er weer bent en vraagt of ze willen proeven.`
    : `Deze persoon heeft nooit iets besteld en kent het bedrijf waarschijnlijk niet. Doe dus niet alsof er een band is: geen "we spraken elkaar", geen "zoals afgesproken", geen verwijzing naar eerdere bestellingen.

Zeg in de eerste zin wie je bent en waarom je schrijft. Hou het kort — korter dan bij een bekende.

Wat je hierboven over de relatie leest, is achtergrond voor jou. Zet het niet in de mail. Schrijf dus nooit dat je ziet dat iemand nog niets heeft besteld, dat hij in je systeem staat, of dat je zijn gegevens hebt: dat wrijft iets in en verraadt dat er een bestand achter zit.`
}

${
    o.soort === "navraag"
      ? `# Waar het pakket over ging

${o.aanbod}

Dat is geweest. Je biedt het niet opnieuw aan.`
      : o.soort === "antwoord"
      ? `# Waar het gesprek over gaat

${o.aanbod}

Dat heb je al aangeboden. Je biedt het niet opnieuw aan; je beantwoordt zijn vraag erover.`
      : o.soort === "bevestiging"
      ? `# Wat er bezorgd wordt

${o.aanbod}

Dit is waar de afspraak over gaat. Je hoeft het niet opnieuw aan te prijzen en je noemt het hooguit in een halve bijzin, zodat duidelijk is waar het pakket over gaat.`
      : `# Wat je voorstelt

${o.aanbod}

Dit is het enige dat je aanbiedt. Je verzint er geen korting, geen actie en geen extra bij.`
  }

# Hoe je schrijft

- Zakelijk en vriendelijk, zonder gewichtigheid. Schrijf zoals een ondernemer aan een andere ondernemer schrijft.
- Kort. Vijf tot acht zinnen, en de mail is klaar.
- Geen verkooptaal. Geen "wij zijn dé specialist", geen uitroeptekens, geen "wist u dat".
- Geen opsommingstekens; dit is een bericht, geen folder.
- ${
    o.contact.naam
      ? `De naam zoals wij hem hebben is "${o.contact.naam}". Staat de voornaam er voluit, gebruik dan alléén die: "Beste ${o.contact.naam.split(" ")[0]}," en niet de hele naam. Voor- en achternaam samen in de aanhef klinkt als een brief van een instantie.

Staat er een initiaal of alleen een achternaam, verzin er dan geen voornaam bij — dat valt onmiddellijk op en is pijnlijk. Schrijf dan "Beste meneer/mevrouw ${o.contact.naam.split(" ").slice(1).join(" ") || o.contact.naam}" of laat de naam weg en begin gewoon.`
      : o.contact.bedrijf
        ? `Je kent de naam van deze persoon niet, alleen de zaak: "${o.contact.bedrijf}". Schrijf dan "Beste ${o.contact.bedrijf}," als aanhef.

Dat is met opzet geen "Geachte heer/mevrouw". Dit gaat naar strandtenten, snackbars en familiezaken; die aanhef is daar te stijf, en het is bovendien het eerste teken dat een mail naar duizend mensen tegelijk ging. De naam van de zaak erin is warmer en laat zien dat je weet wie je schrijft.`
        : "Je kent de naam niet en de zaak ook niet. Gebruik dan geen aanhef met een naam erin en schrijf niet 'Geachte heer/mevrouw'; begin gewoon met je eerste zin."
  }
- Eindig met één concrete vraag waar ja of nee op past.
${
  o.soort === "bevestiging"
    ? `- Noem de dag die hierboven staat, voluit. Dat is de hele reden dat je schrijft: die vrijdag is gereserveerd en er staat een doos voor klaar. "Op een vrijdag" is hier fout — dan weet de lezer nog steeds niet wanneer hij thuis moet zijn.`
    : `- Noem geen specifieke datum of "komende vrijdag". Welke vrijdag het wordt, wordt later ingepland en hangt af van hoeveel er die dag mee kan. Zeg "op een vrijdag" en niets preciezers; een datum die niet gereserveerd is, is een toezegging die je niet kunt nakomen.`
}
- Zeg niet of iemand binnen of buiten het bezorggebied valt. De route bepaalt wél wat je mag toezeggen — staat er in de kennisbank dat de chauffeur door zijn plaats rijdt, dan mag je aanbieden dat hij langskomt — maar je benoemt het niet. "U zit in ons bezorggebied" is geen zin die een mens schrijft; die weet gewoon dat het om de hoek is. Het verraadt dat er een lijst achter zit waarin mensen in vakjes staan, en dat is precies wat deze mail niet moet uitstralen. Noem de plaats gerust ("onze chauffeur rijdt op vrijdag door Katwijk"), maar nooit de indeling.
- Spreek de lezer aan met "u", en hou dat de hele mail vol. Dit zijn horecaondernemers en slagers die het bedrijf van vroeger kenden.

# Nederlands

Dit gaat naar mensen die hun eigen taal goed kennen; één kromme zin doet meer af aan het vertrouwen dan de hele mail goedmaakt.

- Let op lidwoorden en geslacht. Het is "onze kip", niet "ons kip". Twijfel je bij de of het, kies dan een andere formulering.
- Geen vertaald Engels. Schrijf zoals iemand in Nederland het zou zeggen, niet zoals een handleiding het opschrijft.
- Korte zinnen. Twee gedachten aan elkaar plakken met een komma levert bijna altijd een zin op die je hardop niet zou zeggen; maak er dan twee zinnen van of laat de tweede weg.
- Herhaal binnen twee zinnen niet hetzelfde zelfstandig naamwoord. Staat "proefpakket" er al, schrijf dan "dat" of "het".
- Let op wie in een zin de handelende partij is. Een bedrijf raakt klanten kwijt; klanten raken geen bedrijf kwijt. Schrijf dus "zijn wij veel klanten kwijtgeraakt" of "zijn veel klanten vertrokken", nooit "zijn veel klanten ons kwijtgeraakt".
- Lees elke zin terug voordat je hem opschrijft: klinkt dit als een mens die dit typt, of als een tekst die is samengesteld?
- Onderteken met: ${o.ondertekening}
- Geen afmeldregel; die wordt er automatisch onder gezet.

# De onderwerpregel

Kort, concreet en zonder lokkertje. Geen "belangrijk", geen vraagteken om nieuwsgierigheid te wekken, geen naam van de ontvanger erin.

# Kennisbank

${kennisAlsTekst(o.kennis)}

${o.vorigBericht ? `# Wat je eerder stuurde\n\nDit ging al naar deze persoon, en er kwam geen antwoord. Herhaal het niet, verwijs er kort naar en voeg iets toe.\n\n"""\n${o.vorigBericht}\n"""` : ""}

# Je antwoord

Geef uitsluitend JSON terug, zonder omhulsel of toelichting:
{"onderwerp": "...", "tekst": "..."}`;
}

export async function stelBerichtOp(o: Opdracht): Promise<Concept> {
  // Het aanbod en de ondertekening typt de klant zelf in het campagneformulier,
  // en die gaan letterlijk de prompt in. Het filter op de kennisbank doet daar
  // niets, dus kon er langs deze weg alsnog een prijs in een mail belanden —
  // gevonden bij de laatste controle vóór de eerste echte verzending.
  //
  // Hier wordt geweigerd en niet weggefilterd. Een halve zin van Frank
  // ("daarna (bedrag weggelaten) per stuk") is erger dan een foutmelding: dan
  // gaat er een kromme mail weg en weet hij niet waarom.
  for (const [veld, tekst] of [
    ["het aanbod", o.aanbod],
    ["de ondertekening", o.ondertekening],
  ] as const) {
    if (bevatBedrag(tekst)) {
      throw new Error(
        `Er staat een bedrag in ${veld}. Deze agent noemt geen prijzen: wie ernaar vraagt wordt gebeld. Haal het bedrag eruit en probeer het opnieuw.`,
      );
    }
  }

  const sleutel = process.env["ANTHROPIC_API_KEY"];
  if (!sleutel) throw new Error("ANTHROPIC_API_KEY ontbreekt op de server.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": sleutel,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      // Ruim, want een te krappe limiet kapt het antwoord af en dan is het
      // bericht weg. Gemeten op 17 oktober 2026: een geslaagde mail kost 475
      // tot 872 tokens, maar één op de drie pogingen liep tegen de oude grens
      // van 1200 aan en leverde halve JSON op. Bij honderdzevenendertig
      // berichten zijn dat tientallen contacten die worden overgeslagen.
      //
      // Hoger kost niets: er wordt afgerekend per token die er werkelijk
      // uitkomt, niet per token die je toestaat.
      max_tokens: 4000,
      system: [
        {
          type: "text",
          text: systeemprompt(o),
          // De instructie is lang en per campagne gelijk; alleen de contactregels
          // verschillen. Zonder caching betalen we die lengte 137 keer.
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: "Schrijf de e-mail." }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Opstellen mislukt [${res.status}]: ${(await res.text()).slice(0, 300)}`);
  }

  const antwoord = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
    stop_reason?: string;
  };
  const tekst = antwoord.content?.find((b) => b.type === "text")?.text ?? "";

  // Een enkele keer komt er helemaal geen tekst terug. Dat liep hieronder uit
  // op "Onleesbaar antwoord van het model:" met niets erachter, en zo'n regel
  // komt in de lijst overgeslagen contacten te staan waar een mens naar kijkt.
  // Dan weet hij niet of het aan zijn kennisbank ligt, aan het adres, of aan
  // niets. Opnieuw proberen helpt meestal: het gebeurde hier één keer op twee
  // pogingen met dezelfde invoer.
  if (!tekst.trim()) {
    throw new Error(
      `Het model gaf geen tekst terug${antwoord.stop_reason ? ` (${antwoord.stop_reason})` : ""}. Probeer deze portie opnieuw.`,
    );
  }

  // Het model hoort kale JSON te geven, maar een enkele keer komt er een
  // codeblok omheen. Dat opvangen is goedkoper dan een mislukt bericht.
  const schoon = tekst.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();

  let concept: Concept;
  try {
    concept = JSON.parse(schoon) as Concept;
  } catch {
    // Afgekapt is iets anders dan onleesbaar, en vraagt iets anders van de
    // lezer: niet nakijken wat er staat, maar het gewoon opnieuw proberen.
    if (antwoord.stop_reason === "max_tokens") {
      throw new Error(
        "Het bericht werd halverwege afgekapt. Probeer deze portie opnieuw; dit gaat vanzelf goed.",
      );
    }
    throw new Error(`Onleesbaar antwoord van het model: ${schoon.slice(0, 200)}`);
  }
  if (!concept.onderwerp?.trim() || !concept.tekst?.trim()) {
    throw new Error("Het model gaf een leeg onderwerp of een lege tekst terug.");
  }
  return { onderwerp: concept.onderwerp.trim(), tekst: concept.tekst.trim() };
}
