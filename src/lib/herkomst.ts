/**
 * De groepen waarin een contact kan vallen, en hoe ze heten op het scherm.
 *
 * Eén plek, omdat dit al twee keer is misgegaan. Toen er een derde groep
 * bijkwam stond er op drie schermen "oud-klant, of anders koud" — een
 * tweeweg-keuze op iets met drie waarden. Een testcampagne werd daardoor in de
 * campagnelijst getoond als "koud", en dat is precies het etiket waarop je
 * besluit of er post naar tweehonderd echte zaken mag.
 *
 * Zo'n keuze valt stilzwijgend de verkeerde kant op: geen foutmelding, geen
 * lege plek, gewoon het verkeerde woord. Daarom staat de lijst hier en controleert
 * scripts/test-herkomst.ts dat elke waarde een naam heeft. Komt er een vierde
 * groep bij, dan zakt die test in plaats van dat er ergens "koud" verschijnt.
 */

export const HERKOMSTEN = ["oud_klant", "koud", "test"] as const;

export type Herkomst = (typeof HERKOMSTEN)[number];

/** Zoals het in een lijst of op een label staat. */
export const HERKOMST_LABEL: Record<Herkomst, string> = {
  oud_klant: "oud-klanten",
  koud: "koud",
  test: "testadressen",
};

/** Zoals het bij één contact staat; enkelvoud. */
export const HERKOMST_ENKEL: Record<Herkomst, string> = {
  oud_klant: "oud-klant",
  koud: "koud",
  test: "testadres",
};

/** Veilig een naam opzoeken, ook als de database ooit iets onbekends teruggeeft. */
export function herkomstNaam(waarde: string, enkelvoud = false): string {
  const tabel = enkelvoud ? HERKOMST_ENKEL : HERKOMST_LABEL;
  return (tabel as Record<string, string>)[waarde] ?? waarde;
}
