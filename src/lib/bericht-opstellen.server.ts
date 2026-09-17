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
  herkomst: "oud_klant" | "koud";
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
  soort?: "eerste" | "opvolging" | "navraag" | undefined;
};

export type Concept = { onderwerp: string; tekst: string };

function kennisAlsTekst(kennis: KennisRegel[]): string {
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

function systeemprompt(o: Opdracht): string {
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

  return `Je schrijft namens ${o.bedrijfsnaam} één e-mail aan één persoon. Je schrijft Nederlands.${navraag}

# De belangrijkste regel

Je mag niets beweren over ${o.bedrijfsnaam} dat niet letterlijk in de kennisbank hieronder staat. Geen product, geen prijs, geen levertijd, geen kwaliteitsclaim, geen geschiedenis.

Weet je iets niet, dan laat je het weg. Je omschrijft het niet vaag, je maakt er geen slag om de arm van, en je verzint geen voorbeeld. Een korte mail die klopt is oneindig veel beter dan een vlotte mail met één verzonnen zin erin — die ene zin kost het vertrouwen van iemand die je jaren kende.

Staat er niets bruikbaars in de kennisbank, schrijf dan alleen dat je contact opneemt en wat je voorstelt. Dat is genoeg.

# Aan wie je schrijft

${watWeWetenVanDeOntvanger(o.contact)}

${
  o.soort === "navraag"
    ? `Deze persoon heeft het pakket gehad. Waar hij vandaan komt in de lijst doet er nu niet meer toe; schrijf over wat er bezorgd is en niet over hoe het contact ooit begon.`
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
      : "Je kent de naam niet. Gebruik geen aanhef met een naam erin en schrijf niet 'Beste heer/mevrouw'; begin gewoon."
  }
- Eindig met één concrete vraag waar ja of nee op past.
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
      max_tokens: 1200,
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

  const antwoord = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const tekst = antwoord.content?.find((b) => b.type === "text")?.text ?? "";

  // Het model hoort kale JSON te geven, maar een enkele keer komt er een
  // codeblok omheen. Dat opvangen is goedkoper dan een mislukt bericht.
  const schoon = tekst.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();

  let concept: Concept;
  try {
    concept = JSON.parse(schoon) as Concept;
  } catch {
    throw new Error(`Onleesbaar antwoord van het model: ${schoon.slice(0, 200)}`);
  }
  if (!concept.onderwerp?.trim() || !concept.tekst?.trim()) {
    throw new Error("Het model gaf een leeg onderwerp of een lege tekst terug.");
  }
  return { onderwerp: concept.onderwerp.trim(), tekst: concept.tekst.trim() };
}
