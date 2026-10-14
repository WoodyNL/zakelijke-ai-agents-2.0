import { beschikbaar, wisselCodeIn, type Aanbieder } from "@/lib/postvak/aanbieders.server";
import { leesBriefje, versleutel } from "@/lib/postvak/kluis.server";

/**
 * Waar de klant terugkomt nadat hij bij Google of Microsoft toestemming heeft
 * gegeven.
 *
 * Dit adres staat open op internet: iedereen kan het aanroepen. Daarom hangt
 * alles aan het ondertekende briefje dat we bij het starten meegaven. Zonder
 * geldige handtekening gebeurt er niets — anders kon iemand met een eigen code
 * een mailbox koppelen aan de agent van een ander.
 *
 * De klant ziet van dit adres niets: het stuurt hem meteen terug naar zijn
 * eigen supportscherm, met in de link of het gelukt is.
 */

function terug(bericht: string, gelukt: boolean): Response {
  const basis = process.env["SITE_URL"] ?? "https://zakelijkeaiagents.nl";
  const url = new URL("/support", basis);
  url.searchParams.set(gelukt ? "gekoppeld" : "koppelfout", bericht);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

export async function verwerkTerugkomst(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const fout = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // De klant drukte op "annuleren" bij Google of Microsoft.
  if (fout) return terug("geannuleerd", false);
  if (!code || !state) return terug("onvolledig", false);

  const briefje = await leesBriefje(state).catch(() => null);
  if (!briefje) return terug("verlopen", false);

  const aanbieder = briefje.provider as Aanbieder;
  if (!beschikbaar(aanbieder)) return terug("niet-ingesteld", false);

  const url2 = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url2 || !key) return terug("server", false);

  try {
    const tokens = await wisselCodeIn(aanbieder, code);
    const res = await fetch(`${url2}/rest/v1/rpc/postvak_koppel`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        _agent_id: briefje.agentId,
        _provider: aanbieder,
        _email: tokens.email,
        _naam: tokens.naam,
        _map: briefje.map,
        _toegang: await versleutel(tokens.toegang),
        _vernieuwen: tokens.vernieuwen ? await versleutel(tokens.vernieuwen) : null,
        _verloopt_op: tokens.verlooptOp.toISOString(),
        _door: briefje.userId,
      }),
    });
    if (!res.ok) {
      console.error("postvak: koppeling opslaan mislukt", res.status, await res.text());
      return terug("opslaan", false);
    }

    // Het kanaal meteen omzetten, anders blijft het scherm zeggen dat er
    // doorgestuurd wordt terwijl de mailbox gekoppeld is.
    await fetch(`${url2}/rest/v1/support_instellingen?agent_id=eq.${briefje.agentId}`, {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ kanaal: aanbieder === "google" ? "gmail" : "outlook" }),
    }).catch(() => {});

    return terug(tokens.email, true);
  } catch (err) {
    console.error("postvak: koppelen mislukt", err);
    return terug("mislukt", false);
  }
}
