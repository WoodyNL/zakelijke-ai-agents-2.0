import { BEHEER_ADRES, esc, opmaak, stuurMail } from "@/lib/mail.server";

/**
 * Waarschuwt bij 80% en bij 100% van de fair use (fase 4 van het beheerplan).
 *
 * De site belooft: "Boven de grens? Dan waarschuwen we vooraf, niet pas op de
 * factuur." Een balk op het dashboard ziet alleen wie toevallig inlogt; deze
 * mail komt aan.
 *
 * Wordt na elk geteld gesprek aangeroepen. De database onthoudt welke drempels
 * deze maand al gemeld zijn, dus dit is meestal een lege aanroep. Mislukt het,
 * dan staat het het gesprek niet in de weg.
 */
export async function meldFairUse(agentId: string) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) return;

  try {
    const res = await fetch(`${url}/rest/v1/rpc/fair_use_melding`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ _agent_id: agentId }),
    });
    if (!res.ok) return;
    const nieuw = (await res.json()) as Array<{
      drempel: number;
      gebruikt: number;
      grens: number;
      agent: string;
      klant: string;
      klant_email: string;
      meld_email: string | null;
    }>;

    for (const m of nieuw) {
      const aan = [m.meld_email || m.klant_email].filter(Boolean);
      if (aan.length === 0) continue;
      const vol = m.drempel >= 100;
      await stuurMail({
        aan,
        bcc: [BEHEER_ADRES],
        onderwerp: vol
          ? `${m.agent} zit boven de afgesproken fair use`
          : `${m.agent} zit op ${m.drempel}% van de fair use`,
        html: opmaak([
          `Hoi ${esc(m.klant)},`,
          vol
            ? `Je agent <strong>${esc(m.agent)}</strong> heeft deze maand ${m.gebruikt} gesprekken gevoerd. Dat is boven de afgesproken ${m.grens}. Hij blijft gewoon werken; wat erboven zit, rekenen we af tegen het afgesproken tarief per gesprek.`
            : `Je agent <strong>${esc(m.agent)}</strong> heeft deze maand ${m.gebruikt} van de afgesproken ${m.grens} gesprekken gevoerd. We laten het je nu weten, zodat een factuur achteraf je niet verrast.`,
          "Verwacht je dat dit vaker gebeurt? Laat het ons weten, dan kijken we samen of een ander pakket beter past. In je portaal zie je het verbruik per dag.",
        ]),
      });
    }
  } catch (err) {
    console.warn("fair use: melding mislukt", err);
  }
}
