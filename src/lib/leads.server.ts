// Serverzijde van het leadproces. Apart bestand omdat zowel het contactformulier
// als de website-assistent dit gebruiken, en omdat *.functions.ts naar de
// clientbundle kan lekken — deze code moet daar nooit terechtkomen.
// Laad hem met een dynamische import binnen een handler.

const NOTIFY_TO = "wouter@zakelijkeaiagents.nl";
const NOTIFY_FROM = "Zakelijke AI Agents <noreply@zakelijkeaiagents.nl>";

function esc(v: string) {
  return v.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}

export type LeadData = {
  name: string;
  company: string;
  email: string;
  phone?: string;
  stage?: string;
  message?: string;
  /** Alleen gevuld bij een lead uit een chat; het contactformulier heeft geen agent. */
  agentId?: string;
};

export async function notifyByEmail(data: LeadData) {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    throw new Error("RESEND_API_KEY ontbreekt");
  }

  const rows: Array<[string, string]> = [
    ["Naam", data.name],
    ["Bedrijf", data.company],
    ["E-mail", data.email],
    ["Telefoon", data.phone || "—"],
    ["Fase", data.stage || "—"],
    ["Bericht", data.message || "—"],
  ];

  const html = `<h2>Nieuwe aanvraag via de website</h2><table cellpadding="6" style="font-family:sans-serif;font-size:14px">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="color:#666"><strong>${k}</strong></td><td>${esc(v).replace(/\n/g, "<br>")}</td></tr>`,
    )
    .join("")}</table>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: NOTIFY_FROM,
      to: [NOTIFY_TO],
      reply_to: data.email,
      subject: `Nieuwe aanvraag: ${data.name} (${data.company})`,
      html,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend melding mislukt [${res.status}]: ${await res.text()}`);
  }
}

/** Slaat de aanvraag op in de database; gooit bij een fout zodat de aanroeper kan terugvallen op e-mail. */
export async function storeLead(data: LeadData) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // De cast is tijdelijk: src/integrations/supabase/types.ts wordt gegenereerd
  // uit de live database, en agent_id bestaat daar pas nadat de fase 0-migratie
  // is gedraaid. Zodra Lovable de types opnieuw genereert kan deze cast weg.
  const { error } = await supabaseAdmin.from("lead_requests").insert({
    name: data.name,
    company: data.company,
    email: data.email,
    phone: data.phone || null,
    stage: data.stage ?? "",
    message: data.message || null,
    agent_id: data.agentId ?? null,
  } as never);
  if (error) throw new Error(error.message);
}

