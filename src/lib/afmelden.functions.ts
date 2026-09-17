import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Iemand van de lijst halen.
 *
 * Bewust géén inlogcontrole: de ontvanger van een koude mail heeft geen account
 * en gaat er ook geen maken. De sleutel uit de link is het enige bewijs, en dat
 * is genoeg — hij is niet te raden en geeft verder nergens toegang toe.
 *
 * De functie in de database geeft niets terug over de klant: een onbekende
 * sleutel en een geldige geven hetzelfde antwoord. Zo is de link niet te
 * gebruiken om te achterhalen wie er in een lijst staat.
 */
export async function meldAf(sleutel: string): Promise<boolean> {
  const url = process.env["SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) return false;

  const res = await fetch(`${url}/rest/v1/rpc/outbound_afmelden`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ _sleutel: sleutel }),
  });
  return res.ok;
}

export const afmelden = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ sleutel: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const ok = await meldAf(data.sleutel);
    if (!ok) throw new Error("Afmelden is niet gelukt. Probeer het zo nog eens.");
    return { ok: true };
  });
