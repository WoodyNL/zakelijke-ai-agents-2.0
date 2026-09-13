import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const NOTIFY_TO = "wouter@zakelijkeaiagents.nl";
const NOTIFY_FROM = "Zakelijke AI Agents <noreply@zakelijkeaiagents.nl>";

function esc(v: string) {
  return v.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}

async function notifyByEmail(data: {
  name: string;
  company: string;
  email: string;
  phone?: string;
  stage?: string;
  message?: string;
}) {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    console.warn("RESEND_API_KEY ontbreekt — geen melding verstuurd");
    return;
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
    console.error(`Resend melding mislukt [${res.status}]: ${await res.text()}`);
  }
}

const leadSchema = z.object({
  name: z.string().trim().min(1, "Vul je naam in").max(100),
  company: z.string().trim().min(1, "Vul je bedrijf in").max(150),
  email: z.string().trim().email("Vul een geldig e-mailadres in").max(255),
  phone: z.string().trim().max(40).optional().default(""),
  stage: z.string().trim().max(120).optional().default(""),
  message: z.string().trim().max(2000).optional().default(""),
});

export type LeadInput = z.input<typeof leadSchema>;

export const submitLeadRequest = createServerFn({ method: "POST" })
  .validator((input: LeadInput) => leadSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("lead_requests").insert({
      name: data.name,
      company: data.company,
      email: data.email,
      phone: data.phone || null,
      stage: data.stage ?? "",
      message: data.message || null,
    });

    if (error) {
      console.error("lead_requests insert failed", error.message);
      throw new Error("Opslaan is niet gelukt");
    }

    try {
      await notifyByEmail(data);
    } catch (err) {
      console.error("lead notificatie mislukt", err);
    }

    return { ok: true as const };
  });

export const listLeadRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lead_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      name: string;
      company: string;
      email: string;
      phone: string | null;
      stage: string;
      message: string | null;
      created_at: string;
    }>;
  });
