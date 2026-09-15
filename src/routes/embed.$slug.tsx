import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AssistantChat } from "@/components/sections/assistant-chat";

/**
 * De pagina die in een iframe op de site van een klant draait.
 *
 * Bewust een iframe en geen script dat in de pagina van de klant injecteert.
 * Pickaxe deed dat laatste op onze eigen site: hun thema-CSS met !important
 * over selectors als header, button en a overschreef de styling van de hele
 * pagina. Dat doe je een klant niet aan, en het is meteen het verschil dat je
 * kunt uitleggen in een verkoopgesprek.
 *
 * De domeincontrole hoort hier en niet alleen bij het chatverzoek. Zodra dit
 * in een iframe draait, komen de chatverzoeken van ons eigen domein, dus daar
 * valt niet meer aan af te lezen op wiens site de agent staat. Bij het laden
 * van dit document stuurt de browser wel de Referer van de klantpagina mee, en
 * die kan paginascript niet vervalsen.
 */

const controleerInsluiting = createServerFn({ method: "GET" })
  .validator((input: { slug: string }) =>
    z.object({ slug: z.string().regex(/^[a-z0-9-]{1,64}$/) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { haalAgent, domeinToegestaan } = await import("@/lib/assistant.server");
    const { getRequest } = await import("@tanstack/react-start/server");

    let config;
    try {
      config = await haalAgent(data.slug);
    } catch {
      return { toegestaan: false as const, reden: "Deze agent bestaat niet of staat niet live." };
    }

    const request = getRequest();
    const referer = request?.headers.get("referer") ?? null;
    const herkomst = referer ? new URL(referer).origin : null;

    if (!domeinToegestaan(config, herkomst)) {
      return {
        toegestaan: false as const,
        reden: `Deze agent mag niet draaien op ${herkomst ?? "dit adres"}.`,
      };
    }

    return { toegestaan: true as const, naam: config.name, welkom: config.welcome_text };
  });

export const Route = createFileRoute("/embed/$slug")({
  // Een embed hoort nooit in zoekresultaten: de inhoud staat al op de site van
  // de klant, en een losse chatpagina zonder context is waardeloos als resultaat.
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Assistent" },
    ],
  }),
  loader: ({ params }) => controleerInsluiting({ data: { slug: params.slug } }),
  component: EmbedPagina,
});

function EmbedPagina() {
  const uitkomst = Route.useLoaderData();
  const { slug } = Route.useParams();

  if (!uitkomst.toegestaan) {
    return (
      <div className="theme-dark flex min-h-screen items-center justify-center bg-[#0c0c13] p-6 font-sans">
        <p className="max-w-[40ch] text-center text-[13px]/[1.7] text-ink/60">{uitkomst.reden}</p>
      </div>
    );
  }

  return (
    <div className="theme-dark min-h-screen bg-[#0c0c13] p-3 font-sans text-ink antialiased">
      {uitkomst.welkom ? (
        <AssistantChat agent={slug} welkom={uitkomst.welkom} volledigeHoogte />
      ) : (
        <AssistantChat agent={slug} volledigeHoogte />
      )}
    </div>
  );
}
