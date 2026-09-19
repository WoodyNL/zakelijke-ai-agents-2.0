// Meldingen vanuit het portaal: fair use, uitnodigingen. Alleen op de server;
// laad met een dynamische import binnen een handler.

const VAN = "Zakelijke AI Agents <noreply@zakelijkeaiagents.nl>";
export const BEHEER_ADRES = "wouter@zakelijkeaiagents.nl";

export function esc(v: string) {
  return v.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
  );
}

/** Een korte, opgemaakte mail: een paar alinea's en eventueel één knop. */
export function opmaak(alineas: string[], knop?: { tekst: string; url: string }) {
  const tekst = alineas.map((a) => `<p style="margin:0 0 14px;line-height:1.6">${a}</p>`).join("");
  const knopHtml = knop
    ? `<p style="margin:20px 0"><a href="${esc(knop.url)}" style="background:#6d5bd0;color:#fff;padding:11px 20px;border-radius:999px;text-decoration:none;font-weight:600">${esc(knop.tekst)}</a></p>`
    : "";
  return `<div style="font-family:-apple-system,Segoe UI,sans-serif;font-size:14px;color:#1d1b2a;max-width:560px">${tekst}${knopHtml}<p style="margin:24px 0 0;color:#888;font-size:12px">Zakelijke AI Agents</p></div>`;
}

export async function stuurMail(m: {
  aan: string[];
  onderwerp: string;
  html: string;
  bcc?: string[];
}) {
  const sleutel = process.env["RESEND_API_KEY"];
  if (!sleutel) throw new Error("RESEND_API_KEY ontbreekt");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sleutel}` },
    body: JSON.stringify({
      from: VAN,
      to: m.aan,
      ...(m.bcc?.length ? { bcc: m.bcc } : {}),
      subject: m.onderwerp,
      html: m.html,
    }),
  });
  if (!res.ok) throw new Error(`Mail versturen mislukt [${res.status}]: ${await res.text()}`);
}
