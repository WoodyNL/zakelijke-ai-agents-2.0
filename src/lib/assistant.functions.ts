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
});

export type ChatInvoer = z.input<typeof chatSchema>;

export const vraagAssistent = createServerFn({ method: "POST" })
  .validator((input: ChatInvoer) => chatSchema.parse(input))
  .handler(async ({ data }) => {
    const { beantwoord } = await import("./assistant.server");

    // Alleen de laatste beurten meesturen. Het gesprek blijft zo betaalbaar en
    // de assistent heeft ruim genoeg context aan de laatste paar vragen.
    const berichten = data.messages.slice(-MAX_BERICHTEN);

    try {
      const { tekst, leadVastgelegd } = await beantwoord(berichten);
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
