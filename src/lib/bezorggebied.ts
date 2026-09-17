/**
 * Ligt een plaats op de vrijdagroute van de chauffeur?
 *
 * Dit bepaalt wat een contact te horen krijgt. Binnen het gebied kan de agent
 * zeggen "onze chauffeur brengt vrijdag een proefpakket langs"; daarbuiten is
 * dat een belofte die niemand kan waarmaken — en dat is het slechtste eerste
 * contact dat je met een oud-klant kunt hebben.
 *
 * De lijst staat hier en niet in de database, omdat hij bij het inlezen van een
 * contactlijst al nodig is en omdat een route iets is dat je met de klant
 * bespreekt en niet iets dat per rij verschilt.
 */

export const BEZORGGEBIED: Record<string, string[]> = {
  "Katwijk en omgeving": ["katwijk", "katwijk aan zee", "katwijk aan den rijn", "rijnsburg", "valkenburg"],
  Bollenstreek: [
    "noordwijk", "noordwijkerhout", "de zilk", "lisse", "hillegom",
    "sassenheim", "voorhout", "warmond", "oegstgeest",
  ],
  "Kust en Zuid-Kennemerland": [
    "zandvoort", "bentveld", "aerdenhout", "vogelenzang", "bloemendaal",
    "overveen", "haarlem", "heemstede", "bennebroek",
  ],
  Haarlemmermeer: [
    "hoofddorp", "nieuw-vennep", "badhoevedorp", "zwanenburg", "vijfhuizen",
    "cruquius", "rijsenhout", "lijnden", "schiphol", "schiphol-rijk", "abbenes",
    "beinsdorp", "buitenkaag", "weteringbrug", "burgerveen", "aalsmeer", "amstelveen",
  ],
  "Leiden en omgeving": [
    "leiden", "leiderdorp", "voorschoten", "zoeterwoude", "stompwijk",
    "hoogmade", "koudekerk aan den rijn",
  ],
  "Den Haag en omgeving": [
    "den haag", "s-gravenhage", "scheveningen", "loosduinen", "ypenburg",
    "rijswijk", "voorburg", "leidschendam", "wassenaar", "delft", "nootdorp",
    "wateringen", "zoetermeer",
  ],
  "Alphen en de Rijnstreek": [
    "alphen aan den rijn", "boskoop", "hazerswoude-dorp", "hazerswoude-rijndijk",
    "aarlanderveen", "zwammerdam", "woubrugge", "rijnsaterwoude", "leimuiden",
    "roelofarendsveen", "oude wetering", "nieuwe wetering", "ter aar",
    "nieuwkoop", "bodegraven",
  ],
};

/**
 * Plaatsen die net buiten de route liggen en in overleg soms wel kunnen.
 *
 * Nu leeg. Amsterdam stond hier even, maar is er bewust uit gehaald: een
 * uitzondering die alleen in de code staat en niet in de kennisbank, laat de
 * agent iets anders zeggen dan wat er is afgesproken. Wat hier staat moet ook
 * in het kennisbestand staan.
 */
export const OP_DE_RAND: string[] = [];

/**
 * Maakt van een ingetypte plaatsnaam iets vergelijkbaars.
 *
 * In een aangeleverde lijst staat alles door elkaar: LEIDEN, Leiden,
 * 's-Gravenhage, "Katwijk ZH", "Nieuw Vennep". Wie dat niet gelijktrekt, zet
 * de helft van een klantenbestand ten onrechte buiten het gebied.
 */
export function normaliseerPlaats(ruw: string): string {
  let t = ruw.trim().toLowerCase();
  t = t.replace(/^['’`]s[- ]/, "s-"); // 's-Gravenhage → s-gravenhage
  t = t.replace(/[.,]/g, " ");
  // Provincieaanduidingen die achter een plaatsnaam staan: Katwijk ZH,
  // Bergen NH. Die horen niet bij de naam.
  t = t.replace(/\b(zh|nh|nb|ov|gld|ut|fr|gr|dr|li|fl|z-h|n-h)\b/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/\s*-\s*/g, "-");
  return t;
}

const ALLE = new Map<string, string>();
for (const [streek, plaatsen] of Object.entries(BEZORGGEBIED)) {
  for (const p of plaatsen) ALLE.set(p, streek);
  // "Nieuw-Vennep" en "Nieuw Vennep" zijn dezelfde plaats.
  for (const p of plaatsen) if (p.includes("-")) ALLE.set(p.replace(/-/g, " "), streek);
}

export type Gebiedsuitkomst =
  | { binnen: true; streek: string }
  | { binnen: false; rand: boolean };

export function bepaalGebied(plaats: string | null | undefined): Gebiedsuitkomst | null {
  if (!plaats || !plaats.trim()) return null; // onbekend is iets anders dan buiten
  const p = normaliseerPlaats(plaats);
  const streek = ALLE.get(p) ?? ALLE.get(p.replace(/-/g, " "));
  if (streek) return { binnen: true, streek };
  return { binnen: false, rand: OP_DE_RAND.includes(p) };
}

/** Kort antwoord voor wie alleen wil weten of de chauffeur kan komen. */
export function ligtInGebied(plaats: string | null | undefined): boolean | null {
  const uit = bepaalGebied(plaats);
  return uit === null ? null : uit.binnen;
}
