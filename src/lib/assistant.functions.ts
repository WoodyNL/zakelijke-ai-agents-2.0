import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Grenzen. Dit eindpunt staat open voor iedereen op internet en kost geld per
 * aanroep, dus de invoer wordt hier begrensd voordat er ook maar iets richting
 * Anthropic gaat. Een lang gesprek wordt afgekapt in plaats van geweigerd: de
 * bezoeker merkt er niets van, maar de rekening loopt niet op.
 */
const MAX_TEKENS_PER_BERICHT = 1500;
const MAX_BERICHTEN = 24;

const berichtSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(MAX_TEKENS_PER_BERICHT),
});

const chatSchema = z.object({
  messages: z.array(berichtSchema).min(1).max(MAX_BERICHTEN),
  // Welke agent er antwoordt. De browser bepaalt dit, maar kan er niets mee
  // forceren: de server controleert of die agent live staat en of hij op het
  // domein van dit verzoek mag draaien.
  agent: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{1,64}$/, "Ongeldige agent")
    .default("website-assistent"),
});

export type ChatInvoer = z.input<typeof chatSchema>;

export const vraagAssistent = createServerFn({ method: "POST" })
  .validator((input: ChatInvoer) => chatSchema.parse(input))
  .handler(async ({ data }) => {
    const { beantwoord } = await import("./assistant.server");
    const { getRequest } = await import("@tanstack/react-start/server");

    // Het domein komt uit de header, niet uit de invoer: een aanroeper mag zelf
    // niet bepalen namens welke site hij spreekt. Origin wordt door de browser
    // gezet en is niet door paginascript te vervalsen; Referer is de terugval
    // voor verzoeken waar Origin ontbreekt.
    const request = getRequest();
    const origin =
      request?.headers.get("origin") ??
      (request?.headers.get("referer")
        ? new URL(request.headers.get("referer") as string).origin
        : null);

    // Alleen de laatste beurten meesturen. Het gesprek blijft zo betaalbaar en
    // de assistent heeft ruim genoeg context aan de laatste paar vragen.
    const berichten = data.messages.slice(-MAX_BERICHTEN);

    try {
      const { tekst, leadVastgelegd } = await beantwoord(berichten, data.agent, origin);
      return { ok: true as const, tekst, leadVastgelegd };
    } catch (err) {
      // De echte fout hoort in de serverlogs, niet bij de bezoeker: hij zegt
      // niets zinnigs tegen een klant en kan interne details bevatten.
      console.error("assistent: beantwoorden mislukt", err);
      return {
        ok: false as const,
        tekst:
          "Sorry, ik kan even niet antwoorden. Probeer het zo nog eens, of stuur je vraag naar wouter@zakelijkeaiagents.nl — dan krijg je binnen één werkdag antwoord.",
        leadVastgelegd: false,
      };
    }
  });
