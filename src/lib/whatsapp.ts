/**
 * De regels van de WhatsApp-opvolger die zonder Meta en zonder database te
 * testen zijn: het 24-uursvenster, telefoonnummers, de overdrachtwoorden, en
 * het lezen van wat Meta's webhook stuurt.
 */

/** Binnen 24 uur na het laatste bericht van de klant mag je vrij antwoorden. */
export function vensterOpen(
  laatsteInkomendOp: string | null | undefined,
  nu = new Date(),
): boolean {
  if (!laatsteInkomendOp) return false;
  return nu.getTime() - new Date(laatsteInkomendOp).getTime() < 24 * 3_600_000;
}

/** "06 12 34 56 78" of "+31 6 1234 5678" → "31612345678", zoals Meta het wil. */
export function normaliseerNummer(ruw: string): string | null {
  let n = ruw.replace(/[^\d+]/g, "");
  if (n.startsWith("00")) n = `+${n.slice(2)}`;
  if (n.startsWith("+")) n = n.slice(1);
  else if (n.startsWith("0")) n = `31${n.slice(1)}`;
  if (!/^\d{10,15}$/.test(n)) return null;
  return n;
}

export type InkomendBericht = {
  waId: string;
  van: string;
  naam: string | null;
  tekst: string;
  tijdstip: string;
  /** Wat voor bericht: tekst, of iets anders (foto, spraak, locatie). */
  soort: string;
  phoneNumberId: string;
};
export type Statusmelding = {
  waId: string;
  status: "sent" | "delivered" | "read" | "failed";
  fout: string | null;
};

/**
 * Leest de webhook van Meta: entry[].changes[].value met messages, contacts
 * en statuses. Geeft alleen terug wat we kennen; de rest negeren we zonder
 * fout, want een webhook die 500 geeft wordt eindeloos opnieuw aangeboden.
 */
export function leesWebhook(payload: unknown): {
  berichten: InkomendBericht[];
  statussen: Statusmelding[];
} {
  const berichten: InkomendBericht[] = [];
  const statussen: Statusmelding[] = [];
  const entries = (payload as { entry?: unknown[] } | null)?.entry;
  if (!Array.isArray(entries)) return { berichten, statussen };
  for (const e of entries as Array<{ changes?: unknown[] }>) {
    for (const c of (e.changes ?? []) as Array<{ value?: Record<string, unknown> }>) {
      const v = c.value ?? {};
      const phoneNumberId = String(
        (v["metadata"] as { phone_number_id?: string } | undefined)?.phone_number_id ?? "",
      );
      const namen = new Map<string, string>();
      for (const ct of (v["contacts"] ?? []) as Array<{
        wa_id?: string;
        profile?: { name?: string };
      }>) {
        if (ct.wa_id && ct.profile?.name) namen.set(ct.wa_id, ct.profile.name);
      }
      for (const m of (v["messages"] ?? []) as Array<Record<string, unknown>>) {
        const van = String(m["from"] ?? "");
        const id = String(m["id"] ?? "");
        if (!van || !id) continue;
        const soort = String(m["type"] ?? "onbekend");
        const tekst =
          soort === "text"
            ? String((m["text"] as { body?: string } | undefined)?.body ?? "")
            : soort === "button"
              ? String((m["button"] as { text?: string } | undefined)?.text ?? "")
              : soort === "interactive"
                ? String(
                    (
                      m["interactive"] as
                        | { button_reply?: { title?: string }; list_reply?: { title?: string } }
                        | undefined
                    )?.button_reply?.title ??
                      (m["interactive"] as { list_reply?: { title?: string } } | undefined)
                        ?.list_reply?.title ??
                      "",
                  )
                : "";
        const ts = Number(m["timestamp"]);
        berichten.push({
          waId: id,
          van,
          naam: namen.get(van) ?? null,
          tekst,
          tijdstip: Number.isFinite(ts)
            ? new Date(ts * 1000).toISOString()
            : new Date().toISOString(),
          soort,
          phoneNumberId,
        });
      }
      for (const s of (v["statuses"] ?? []) as Array<Record<string, unknown>>) {
        const id = String(s["id"] ?? "");
        const status = String(s["status"] ?? "");
        if (!id || !["sent", "delivered", "read", "failed"].includes(status)) continue;
        const fouten = s["errors"] as Array<{ title?: string; message?: string }> | undefined;
        statussen.push({
          waId: id,
          status: status as Statusmelding["status"],
          fout: fouten?.[0]?.title ?? fouten?.[0]?.message ?? null,
        });
      }
    }
  }
  return { berichten, statussen };
}

/** Wat de klant terugkrijgt als een mens het overneemt. Kort, zoals WhatsApp hoort. */
export function overdrachtTekst(bedrijfsnaam: string, vensterOpen: boolean): string {
  return vensterOpen
    ? `Dank je, ik geef dit door aan een collega van ${bedrijfsnaam}. Die neemt het persoonlijk met je op.`
    : `Dank je. Een collega van ${bedrijfsnaam} neemt het persoonlijk met je op.`;
}

/** Mag de agent nu zélf beginnen? Binnen het venster van de klant, op een werkdag. */
export function magZelfBeginnen(
  venster: { begin: number; eind: number },
  delen: { weekdag: number; minuten: number },
): boolean {
  if (delen.weekdag === 0 || delen.weekdag === 6) return false;
  return delen.minuten >= venster.begin && delen.minuten < venster.eind;
}

/**
 * Welke leads van de sales-assistent aan opvolging toe zijn: een nummer, een
 * verstuurd eerste antwoord dat al `naDagen` oud is, nog niet opgevolgd, en
 * nog open (past of twijfel). Een afgewezen of gewonnen lead laat je met rust.
 */
export function leadsOmOpTeVolgen<
  T extends { telefoon: string | null; status: string; verzonden_op: string | null; id: string },
>(leads: T[], alOpgevolgd: Set<string>, naDagen: number, nu = new Date()): T[] {
  const grens = nu.getTime() - Math.max(0, naDagen) * 86_400_000;
  return leads.filter(
    (l) =>
      !!l.telefoon &&
      normaliseerNummer(l.telefoon) !== null &&
      (l.status === "gekwalificeerd" || l.status === "twijfel") &&
      !!l.verzonden_op &&
      new Date(l.verzonden_op).getTime() <= grens &&
      !alOpgevolgd.has(l.id),
  );
}
