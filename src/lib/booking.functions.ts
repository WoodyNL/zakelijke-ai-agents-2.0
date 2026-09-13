import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CONTACT_EMAIL = "wouter@zakelijkeaiagents.nl";

const bookingSchema = z.object({
  day: z.string().min(1),
  time: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  channel: z.enum(["email", "whatsapp"]),
  phone: z.string().optional(),
});

export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => bookingSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env["RESEND_API_KEY"];
    if (!apiKey) {
      throw new Error(
        "E-mailverzending is nog niet geconfigureerd (RESEND_API_KEY ontbreekt). Neem contact op via de website.",
      );
    }

    const lines = [
      `Dag: ${data.day}`,
      `Tijd: ${data.time}`,
      `Naam: ${data.name}`,
      `E-mail: ${data.email}`,
      `Bevestiging via: ${data.channel === "whatsapp" ? "WhatsApp" : "E-mail"}`,
      ...(data.phone ? [`Telefoon: ${data.phone}`] : []),
    ];

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Zakelijke AI Agents <demo@zakelijkeaiagents.nl>",
        to: [CONTACT_EMAIL],
        reply_to: data.email,
        subject: `Nieuwe demo-aanvraag — ${data.name}`,
        text: lines.join("\n"),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[booking] Resend gaf ${res.status}: ${body}`);
      throw new Error("Versturen van de demo-aanvraag is mislukt. Probeer het nog eens.");
    }

    return { ok: true } as const;
  });
