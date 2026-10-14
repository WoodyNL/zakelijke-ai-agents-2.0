import type { Aanbieder } from "@/lib/postvak/aanbieders.server";

/**
 * Lezen uit en schrijven naar de mailbox van een klant.
 *
 * Twee aanbieders met dezelfde drie handelingen: welke nieuwe post is er, zet
 * een concept klaar in hetzelfde gesprek, en verstuur een antwoord. De rest van
 * het platform praat alleen met deze drie en weet niet van Gmail of Graph af.
 *
 * Eén keuze die overal doorwerkt: we halen alleen nieuwe post op uit de map die
 * de klant heeft aangewezen, niet uit zijn hele mailbox. Wie zijn supportvragen
 * in een apart label zet, geeft ons daarmee ook precies dat label — en niets
 * van de rest.
 */

export type Postvakbericht = {
  /** Het id bij de aanbieder; tegelijk onze sleutel tegen dubbel verwerken. */
  id: string;
  /** Het gesprek waar dit bericht bij hoort, voor het antwoord. */
  gesprek: string | null;
  messageId: string | null;
  vanEmail: string;
  vanNaam: string | null;
  onderwerp: string | null;
  tekst: string;
  ontvangenOp: string;
};

export type Antwoord = { onderwerp: string; tekst: string };

/** HTML uit een mail terugbrengen tot leesbare tekst. */
function naarTekst(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const web64 = (s: string) =>
  btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const vanWeb64 = (s: string) =>
  decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));

async function bijGoogle<T>(toegang: string, pad: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${pad}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${toegang}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Gmail [${res.status}]: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

async function bijGraph<T>(toegang: string, pad: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${pad}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${toegang}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Outlook [${res.status}]: ${(await res.text()).slice(0, 200)}`);
  // Graph geeft bij versturen een 202 zonder inhoud terug.
  return (res.status === 204 || res.status === 202 ? {} : await res.json()) as T;
}

/* --- Gmail ------------------------------------------------------------- */

type GmailDeel = {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailDeel[];
  headers?: Array<{ name: string; value: string }>;
};

function gmailTekst(deel: GmailDeel | undefined): string {
  if (!deel) return "";
  if (deel.mimeType === "text/plain" && deel.body?.data) return vanWeb64(deel.body.data);
  if (deel.parts) {
    // Platte tekst heeft de voorkeur; een multipart/alternative heeft beide.
    const plat = deel.parts.find((p) => p.mimeType === "text/plain" && p.body?.data);
    if (plat) return vanWeb64(plat.body!.data!);
    for (const p of deel.parts) {
      const t = gmailTekst(p);
      if (t) return t;
    }
  }
  if (deel.mimeType === "text/html" && deel.body?.data) return naarTekst(vanWeb64(deel.body.data));
  return "";
}

function kop(headers: Array<{ name: string; value: string }> | undefined, naam: string): string {
  return headers?.find((h) => h.name.toLowerCase() === naam.toLowerCase())?.value ?? "";
}

function splitsAfzender(ruw: string): { email: string; naam: string | null } {
  const m = /^\s*(?:"?([^"<]*?)"?\s*)?<([^>]+)>\s*$/.exec(ruw);
  if (m) return { email: (m[2] ?? "").trim().toLowerCase(), naam: (m[1] ?? "").trim() || null };
  return { email: ruw.trim().toLowerCase(), naam: null };
}

/** Een RFC822-bericht als antwoord in hetzelfde gesprek. */
function rfc822(o: {
  aan: string;
  van: string;
  onderwerp: string;
  tekst: string;
  inAntwoordOp: string | null;
}): string {
  const regels = [
    `To: ${o.aan}`,
    `From: ${o.van}`,
    `Subject: ${o.onderwerp}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
  ];
  // Zonder deze twee koppen hangt het antwoord los in de inbox van de
  // ontvanger in plaats van onder de vraag die hij stelde.
  if (o.inAntwoordOp) {
    regels.push(`In-Reply-To: ${o.inAntwoordOp}`, `References: ${o.inAntwoordOp}`);
  }
  return `${regels.join("\r\n")}\r\n\r\n${o.tekst}`;
}

/* --- De drie handelingen ------------------------------------------------ */

export async function haalNieuwe(
  aanbieder: Aanbieder,
  toegang: string,
  map: string,
  sinds: string | null,
): Promise<{ berichten: Postvakbericht[]; cursor: string | null }> {
  if (aanbieder === "google") {
    // Gmail kent geen "sinds dit moment", wel een zoekvraag. Twee dagen terug
    // is ruim genoeg: dubbele post vangen we af op het bericht-id, dat uniek
    // in de database staat.
    const waar = map.toUpperCase() === "INBOX" ? "in:inbox" : `label:${JSON.stringify(map)}`;
    const vraag = encodeURIComponent(`${waar} newer_than:2d -in:chats`);
    const lijst = await bijGoogle<{ messages?: Array<{ id: string }> }>(
      toegang,
      `/messages?maxResults=25&q=${vraag}`,
    );

    const berichten: Postvakbericht[] = [];
    for (const m of lijst.messages ?? []) {
      const vol = await bijGoogle<{
        id: string;
        threadId: string;
        internalDate: string;
        payload: GmailDeel;
      }>(toegang, `/messages/${m.id}?format=full`);
      const h = vol.payload.headers;
      const van = splitsAfzender(kop(h, "From"));
      if (!van.email) continue;
      berichten.push({
        id: vol.id,
        gesprek: vol.threadId,
        messageId: kop(h, "Message-ID") || null,
        vanEmail: van.email,
        vanNaam: van.naam,
        onderwerp: kop(h, "Subject") || null,
        tekst: gmailTekst(vol.payload).slice(0, 20_000),
        ontvangenOp: new Date(Number(vol.internalDate || Date.now())).toISOString(),
      });
    }
    return { berichten, cursor: berichten[0]?.ontvangenOp ?? sinds };
  }

  // Microsoft kan wél "sinds dit moment", dus daar halen we alleen echt nieuwe
  // post op. De eerste keer: het laatste uur, zodat een verse koppeling niet
  // meteen honderd oude vragen gaat beantwoorden.
  const vanaf = sinds ?? new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const waar =
    map.toUpperCase() === "INBOX"
      ? "/me/mailFolders/inbox/messages"
      : `/me/mailFolders/${encodeURIComponent(map)}/messages`;
  const lijst = await bijGraph<{
    value: Array<{
      id: string;
      conversationId: string;
      internetMessageId: string;
      subject: string;
      receivedDateTime: string;
      from?: { emailAddress?: { address?: string; name?: string } };
      body?: { contentType: string; content: string };
    }>;
  }>(
    toegang,
    `${waar}?$top=25&$orderby=receivedDateTime asc` +
      `&$filter=${encodeURIComponent(`receivedDateTime gt ${vanaf}`)}` +
      `&$select=id,conversationId,internetMessageId,subject,receivedDateTime,from,body`,
  );

  const berichten = (lijst.value ?? [])
    .filter((m) => m.from?.emailAddress?.address)
    .map((m) => ({
      id: m.id,
      gesprek: m.conversationId ?? null,
      messageId: m.internetMessageId ?? null,
      vanEmail: m.from!.emailAddress!.address!.toLowerCase(),
      vanNaam: m.from!.emailAddress!.name ?? null,
      onderwerp: m.subject || null,
      tekst: (m.body?.contentType === "html"
        ? naarTekst(m.body.content)
        : (m.body?.content ?? "")
      ).slice(0, 20_000),
      ontvangenOp: m.receivedDateTime,
    }));

  const laatste = berichten.at(-1)?.ontvangenOp ?? sinds;
  return { berichten, cursor: laatste };
}

/**
 * Zet het concept klaar in de mailbox van de klant.
 *
 * Dit is waarom een koppeling meer waard is dan doorsturen: het concept staat
 * in zijn eigen Postvak IN, onder de vraag, klaar om te verzenden of aan te
 * passen. Hij hoeft ons portaal niet open te hebben.
 */
export async function zetConcept(
  aanbieder: Aanbieder,
  toegang: string,
  bericht: Postvakbericht,
  antwoord: Antwoord,
  vanAdres: string,
): Promise<string> {
  if (aanbieder === "google") {
    const raw = web64(
      rfc822({
        aan: bericht.vanEmail,
        van: vanAdres,
        onderwerp: antwoord.onderwerp,
        tekst: antwoord.tekst,
        inAntwoordOp: bericht.messageId,
      }),
    );
    const uit = await bijGoogle<{ id: string }>(toegang, "/drafts", {
      method: "POST",
      body: JSON.stringify({ message: { raw, threadId: bericht.gesprek } }),
    });
    return uit.id;
  }

  const uit = await bijGraph<{ id: string }>(toegang, `/me/messages/${bericht.id}/createReply`, {
    method: "POST",
    body: JSON.stringify({ comment: antwoord.tekst }),
  });
  return uit.id;
}

export async function verstuurAntwoord(
  aanbieder: Aanbieder,
  toegang: string,
  bericht: Postvakbericht,
  antwoord: Antwoord,
  vanAdres: string,
): Promise<void> {
  if (aanbieder === "google") {
    const raw = web64(
      rfc822({
        aan: bericht.vanEmail,
        van: vanAdres,
        onderwerp: antwoord.onderwerp,
        tekst: antwoord.tekst,
        inAntwoordOp: bericht.messageId,
      }),
    );
    await bijGoogle(toegang, "/messages/send", {
      method: "POST",
      body: JSON.stringify({ raw, threadId: bericht.gesprek }),
    });
    return;
  }

  await bijGraph(toegang, `/me/messages/${bericht.id}/reply`, {
    method: "POST",
    body: JSON.stringify({ comment: antwoord.tekst }),
  });
}
