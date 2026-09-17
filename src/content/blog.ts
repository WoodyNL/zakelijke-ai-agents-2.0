/**
 * De artikelen op de site, op één plek.
 *
 * Er stond één artikel, bereikbaar via losse verwijzingen maar zonder
 * overzichtspagina: /blog gaf een 404. Zolang het één stuk is valt daarmee te
 * leven, maar bij het tweede artikel heb je een plek nodig waar ze samenkomen
 * — en een zoekmachine heeft die plek nodig om te zien dat het een reeks is.
 *
 * De datums horen bij wat er in de geschiedenis van het bestand staat. Schrijf
 * ze hier over als een artikel inhoudelijk wordt herzien, niet bij een
 * spelfout: `gewijzigd` is een signaal dat de inhoud is bijgewerkt.
 */
export type Artikel = {
  pad: string;
  titel: string;
  samenvatting: string;
  gepubliceerd: string;
  gewijzigd?: string;
  leestijd: string;
};

export const ARTIKELEN: Artikel[] = [
  {
    pad: "/blog/waarom-ai-pilots-mislukken",
    titel: "Waarom 95% van de AI-pilots niets oplevert (en hoe dat anders kan)",
    samenvatting:
      "MIT NANDA, McKinsey, Gartner en S&P Global onderzochten waarom AI-projecten stranden. Vijf oorzaken die in elk onderzoek terugkomen, en wat er per oorzaak wél werkt.",
    gepubliceerd: "2026-09-13",
    gewijzigd: "2026-09-17",
    leestijd: "6 minuten",
  },
];

/** "2026-09-13" → "13 september 2026". */
export function datumInWoorden(iso: string) {
  const maanden = [
    "januari",
    "februari",
    "maart",
    "april",
    "mei",
    "juni",
    "juli",
    "augustus",
    "september",
    "oktober",
    "november",
    "december",
  ];
  const [jaar, maand, dag] = iso.split("-");
  return `${Number(dag)} ${maanden[Number(maand) - 1]} ${jaar}`;
}
