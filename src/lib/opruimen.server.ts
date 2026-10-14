/**
 * Het opruimen aanzwengelen.
 *
 * Er is geen plek waar we een taak kunnen laten draaien: dit project heeft geen
 * eigen server en Lovable Cloud geeft ons geen planner. Dus hangen we het aan
 * het verkeer dat er toch al is. Elk verzoek kán het opruimen aanzetten; de
 * database bepaalt of het werkelijk tijd is (hoogstens eens per zes uur) en
 * doet het werk.
 *
 * Twee remmen, want "elk verzoek" is er veel:
 *
 *   Hier een klok in het geheugen, zodat één instantie hoogstens één keer per
 *   uur de moeite neemt om het te vrágen.
 *   In de database een claim, zodat tien instanties samen toch één opruimbeurt
 *   opleveren.
 *
 * En het blokkeert nooit een bezoeker: de aanroeper geeft dit mee aan
 * waitUntil, zodat het ná het antwoord afloopt.
 */

let laatsteVraag = 0;
const UUR = 60 * 60 * 1000;

export async function ruimOpIndienNodig(): Promise<void> {
  if (Date.now() - laatsteVraag < UUR) return;
  laatsteVraag = Date.now();

  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  // Lokaal is die sleutel er niet. Dan ruimen we ook niets op, en dat klopt:
  // lokaal staat er niets dat verlopen kan.
  if (!url || !key) return;

  try {
    const res = await fetch(`${url}/rest/v1/rpc/ruim_op_indien_nodig`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) {
      console.warn("opruimen: mislukt", res.status);
      return;
    }
    const uit = (await res.json()) as { gedraaid?: boolean; verwijderd?: Record<string, number> };
    if (uit?.gedraaid) console.info("opruimen: gedraaid", uit.verwijderd);
  } catch (err) {
    console.warn("opruimen: mislukt", err);
  }
}
