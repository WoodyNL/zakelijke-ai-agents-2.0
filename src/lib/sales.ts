/**
 * De regels van de sales-assistent die zonder model en database te testen zijn.
 *
 * Het model beoordeelt een lead tegen "wie past bij jou"; deze functies
 * bepalen wat we met dat oordeel doen. De belangrijkste: een antwoord gaat
 * alleen vanzelf de deur uit als de lead past, er geen vragen openstaan en de
 * klant dat heeft aangezet. Twijfel gaat altijd naar een mens — een
 * sales-assistent die een twijfelgeval zelf afwijst, kost de ene klant die
 * net wél paste.
 */

export type Oordeel = "past" | "past_niet" | "onduidelijk";

/** Wat het model teruggeeft, rechtgetrokken tot de drie waarden die we kennen. */
export function leesOordeel(ruw: unknown): Oordeel {
  const t = String(ruw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (t === "past" || t === "ja" || t === "yes" || t === "fit") return "past";
  if (t === "past_niet" || t === "nee" || t === "no" || t === "no_fit" || t === "niet")
    return "past_niet";
  return "onduidelijk";
}

/** Welke status een lead krijgt na de beoordeling. */
export function statusNaOordeel(o: Oordeel): "gekwalificeerd" | "afgewezen" | "twijfel" {
  return o === "past" ? "gekwalificeerd" : o === "past_niet" ? "afgewezen" : "twijfel";
}

/** Mag het eerste antwoord vanzelf weg? */
export function magZelfAntwoorden(o: {
  zelfAntwoorden: unknown;
  oordeel: Oordeel;
  vragen: string[];
  heeftTekst: boolean;
}): boolean {
  return o.zelfAntwoorden === true && o.oordeel === "past" && o.vragen.length === 0 && o.heeftTekst;
}

/** Hoeveel minuten te laat tegenover het doel, of 0 als op tijd. */
export function minutenTeLaat(ontvangenOp: string, doelMinuten: unknown, nu = new Date()): number {
  const doel = Number(doelMinuten);
  const grens = Number.isFinite(doel) && doel > 0 ? doel : 5;
  const verstreken = (nu.getTime() - new Date(ontvangenOp).getTime()) / 60_000;
  return Math.max(0, Math.round(verstreken - grens));
}

/** Welke bronnen de agent in de gaten houdt. */
export function bronnenAan(ruw: unknown): Set<"formulier" | "chat" | "mail"> {
  const uit = new Set<"formulier" | "chat" | "mail">();
  const lijst = Array.isArray(ruw) ? ruw.map((x) => String(x).toLowerCase()) : ["formulier"];
  for (const b of lijst) {
    if (b.startsWith("form")) uit.add("formulier");
    if (b.startsWith("chat")) uit.add("chat");
    if (b.startsWith("mail") || b.startsWith("e-mail") || b.startsWith("email")) uit.add("mail");
  }
  return uit;
}
