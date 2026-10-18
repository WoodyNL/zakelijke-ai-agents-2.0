/**
 * Een spreadsheet of CSV als rijen tekst.
 *
 * Dezelfde lezer als bij contacten en prijzen, nu één keer opgeschreven. De
 * bibliotheek wordt pas geladen als er werkelijk een bestand wordt gekozen;
 * zij is groot en de meeste bezoeken van het portaal hebben hem niet nodig.
 */
export async function leesBestand(bestand: File): Promise<string[][]> {
  const XLSX = await import("xlsx");
  const buffer = await bestand.arrayBuffer();
  const werkboek = XLSX.read(buffer, { type: "array", cellDates: false });
  const naam = werkboek.SheetNames[0];
  const blad = naam ? werkboek.Sheets[naam] : undefined;
  if (!blad) throw new Error("Het eerste werkblad is leeg.");
  return XLSX.utils
    .sheet_to_json<string[]>(blad, { header: 1, defval: "", raw: false })
    .map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? "")) : []));
}
