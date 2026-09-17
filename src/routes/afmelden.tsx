import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { afmelden } from "@/lib/afmelden.functions";

/**
 * De pagina waar een afmeldlink op uitkomt.
 *
 * Er staat met opzet een knop tussen, en dat is geen beleefdheid. Bedrijven
 * laten inkomende post scannen door beveiligingssoftware die elke link in een
 * mail alvast opent. Zou deze pagina meteen afmelden bij het openen, dan haalde
 * zo'n scanner ongevraagd mensen van de lijst die de mail nog niet eens hadden
 * gelezen.
 *
 * De afmeldknop in Gmail en Outlook werkt wél in één klik: die stuurt een POST
 * in plaats van een GET, en die wordt elders afgehandeld. Scanners doen dat
 * niet.
 */

export const Route = createFileRoute("/afmelden")({
  validateSearch: z.object({ s: z.string().optional() }),
  head: () => ({
    meta: [{ title: "Afmelden" }, { name: "robots", content: "noindex" }],
  }),
  component: AfmeldPagina,
});

function AfmeldPagina() {
  const { s } = useSearch({ from: "/afmelden" });
  const afmeldFn = useServerFn(afmelden);

  const [klaar, zetKlaar] = useState(false);
  const [bezig, zetBezig] = useState(false);
  const [fout, zetFout] = useState<string | null>(null);

  async function bevestig() {
    if (!s) return;
    zetBezig(true);
    zetFout(null);
    try {
      await afmeldFn({ data: { sleutel: s } });
      zetKlaar(true);
    } catch (e) {
      zetFout(e instanceof Error ? e.message : "Afmelden is niet gelukt.");
    } finally {
      zetBezig(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[34rem] flex-col justify-center px-6 py-16">
      <div className="card-glass-lg rounded-3xl p-6 sm:p-8">
        {klaar ? (
          <>
            <h1 className="font-display text-[22px] font-bold text-brand">
              Je bent afgemeld
            </h1>
            <p className="mt-3 text-[14px]/[1.75] text-ink/70">
              We sturen je geen post meer. Ook niet als je adres later opnieuw in een lijst
              wordt aangeleverd — dat hebben we vastgelegd.
            </p>
          </>
        ) : !s ? (
          <>
            <h1 className="font-display text-[22px] font-bold text-brand">
              Deze link is niet compleet
            </h1>
            <p className="mt-3 text-[14px]/[1.75] text-ink/70">
              Er ontbreekt een stukje aan de link. Open hem opnieuw vanuit de e-mail, of
              antwoord gewoon op het bericht met "graag afmelden" — dan doen we het met de
              hand.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-[22px] font-bold text-brand">
              Geen post meer ontvangen?
            </h1>
            <p className="mt-3 text-[14px]/[1.75] text-ink/70">
              Eén klik en je staat van de lijst. Je hoeft verder niets in te vullen en er
              volgt geen bevestigingsmail.
            </p>

            <button
              type="button"
              onClick={bevestig}
              disabled={bezig}
              className="mt-6 rounded-xl bg-violet px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-violet/90 disabled:opacity-40"
            >
              {bezig ? "Bezig…" : "Ja, meld me af"}
            </button>

            {fout && <p className="mt-4 text-[13px] text-rose-300">{fout}</p>}
          </>
        )}
      </div>
    </main>
  );
}
