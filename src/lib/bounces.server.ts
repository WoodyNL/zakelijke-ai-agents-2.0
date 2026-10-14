import { BEHEER_ADRES, esc, opmaak, stuurMail } from "@/lib/mail.server";
import { trekGeplandeBerichtenIn } from "@/lib/verzenden.server";

/**
 * Wat er gebeurt nadat de database heeft besloten dat er gestopt moet worden.
 *
 * Twee dingen, in deze volgorde. Eerst de post intrekken die al bij de
 * verzender klaarstaat — dat is het enige wat de schade nog beperkt, want
 * ingeplande mail vertrekt vanzelf. Daarna pas de klant mailen.
 *
 * Omgekeerd zou betekenen dat een klant leest "we zijn gestopt" terwijl er nog
 * veertig berichten onderweg zijn.
 */

export type Stopmelding = {
  soort: "bounce" | "klacht";
  campagne_gestopt: boolean;
  agent_gepauzeerd: boolean;
  agent_id: string;
  agent: string;
  campagne_id: string | null;
  campagne: string | null;
  klant: string;
  klant_email: string;
  meld_email: string | null;
  verzonden: number;
  onbezorgbaar: number;
  percentage: number;
  drempel: number;
};

export async function verwerkStopmelding(m: Stopmelding): Promise<void> {
  try {
    // Een gepauzeerde agent: alles intrekken. Een gestopte campagne: alleen
    // die campagne, want zijn andere post mag gewoon door.
    if (m.agent_gepauzeerd) {
      await trekGeplandeBerichtenIn(m.agent_id);
    } else if (m.campagne_gestopt && m.campagne_id) {
      await trekGeplandeBerichtenIn(m.agent_id, m.campagne_id);
    }
  } catch (err) {
    console.warn("bounces: ingeplande post intrekken mislukt", err);
  }

  const aan = [m.meld_email || m.klant_email].filter(Boolean);
  if (aan.length === 0) return;

  const klacht = m.soort === "klacht";
  const wat = m.agent_gepauzeerd
    ? `We hebben <strong>${esc(m.agent)}</strong> op pauze gezet`
    : `We hebben de campagne <strong>${esc(m.campagne ?? "")}</strong> stilgezet`;

  try {
    await stuurMail({
      aan,
      bcc: [BEHEER_ADRES],
      onderwerp: klacht
        ? `${m.agent}: iemand meldde je mail als spam`
        : `${m.agent} is gepauzeerd: te veel post komt niet aan`,
      html: opmaak([
        `Hoi ${esc(m.klant)},`,
        klacht
          ? `Een ontvanger heeft je bericht gemeld als spam. ${wat}, en wat nog klaarstond is ingetrokken.`
          : `Van de ${m.verzonden} berichten die zijn verstuurd, kwamen er ${m.onbezorgbaar} niet aan (${m.percentage}%). Dat is boven de grens van ${m.drempel}% die voor deze agent geldt. ${wat}, en wat nog klaarstond is ingetrokken.`,
        klacht
          ? "Eén klacht lijkt klein, maar hij telt zwaar: e-mailproviders kijken ernaar en een handvol klachten beschadigt je verzendadres voor maanden. Daarom stoppen we meteen in plaats van af te wachten."
          : "Dit beschermt je verzendadres. Post die niet aankomt telt bij Gmail en Outlook als signaal dat je lijst niet klopt, en dat raakt ook je gewone mail aan je eigen klanten.",
        klacht
          ? "Kijk even naar wie het kreeg: stond diegene op de juiste lijst, en klopt het aanbod voor hem? Daarna kun je de campagne zelf weer aanzetten in je portaal."
          : "Meestal komt het door een verouderde lijst. Haal de adressen eruit die niet meer bestaan, en zet de agent daarna zelf weer aan in je portaal.",
        "Wil je dat we meekijken? Mail ons gerust, dan lopen we de lijst samen na.",
      ]),
    });
  } catch (err) {
    console.warn("bounces: melding versturen mislukt", err);
  }
}
