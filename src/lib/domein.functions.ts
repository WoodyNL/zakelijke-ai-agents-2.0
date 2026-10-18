import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { beoordeel, domeinVan, type Dns, type Gezondheid } from "@/lib/domeingezondheid";

/**
 * Vraagt de DNS-records van een verzenddomein op via DNS-over-HTTPS en
 * beoordeelt ze. Geen sleutel nodig, geen opslag: elke aanroep kijkt opnieuw,
 * want dit is precies wat je wilt controleren nadat je iets hebt aangepast.
 */
async function vraag(naam: string, type: "TXT" | "CNAME"): Promise<string[]> {
  const res = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(naam)}&type=${type}`,
    {
      headers: { accept: "application/dns-json" },
    },
  );
  if (!res.ok) return [];
  const j = (await res.json()) as { Answer?: Array<{ type: number; data: string }> };
  const gewenst = type === "TXT" ? 16 : 5;
  return (j.Answer ?? []).filter((a) => a.type === gewenst).map((a) => a.data);
}

export const controleerVerzenddomein = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ email: z.string().trim().email() }).parse(d))
  .handler(async ({ data }): Promise<Gezondheid | null> => {
    const domein = domeinVan(data.email);
    if (!domein) return null;
    const [txt, dmarc, dkim] = await Promise.all([
      vraag(domein, "TXT"),
      vraag(`_dmarc.${domein}`, "TXT"),
      vraag(`resend._domainkey.${domein}`, "CNAME"),
    ]);
    const dns: Dns = { txt, dmarc, dkim: dkim[0]?.replace(/\.$/, "") ?? null };
    return beoordeel(domein, dns);
  });
