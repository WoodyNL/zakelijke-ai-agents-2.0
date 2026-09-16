import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Een bestand omzetten naar kennisitems.
 *
 * Bewust geen PDF- of afbeeldingsbibliotheek: Claude leest die formaten
 * rechtstreeks. Een Excel-bestand wordt in de browser al naar tekst omgezet,
 * want een binair zipformaat ontleden hoort niet thuis op de server voor iets
 * wat de browser net zo goed kan.
 *
 * Het resultaat wordt níét opgeslagen. Het gaat terug naar het scherm zodat
 * iemand het eerst nakijkt. Een kennisbank die zichzelf vult met wat een model
 * uit een pdf meende te lezen, is precies het soort automatisering waar dit
 * bedrijf klanten voor waarschuwt.
 */

const MAX_BYTES = 8 * 1024 * 1024;
const MODEL = "claude-sonnet-5";

const TOEGESTAAN = {
  "application/pdf": "document",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "text/plain": "text",
  "text/markdown": "text",
  "text/csv": "text",
  "application/json": "text",
} as const;

const invoerSchema = z.object({
  agentSlug: z.string().min(1).max(64),
  bestandsnaam: z.string().min(1).max(255),
  mediatype: z.string().min(1).max(100),
  /** base64 voor pdf en afbeeldingen, platte tekst voor de rest. */
  inhoud: z.string().min(1),
});

export type KennisVoorstel = {
  category: string;
  title: string;
  question: string | null;
  content: string;
};

const EXTRACTIE_TOOL = {
  name: "leg_kennis_vast",
  description:
    "Geef de kennisitems terug die je uit het document hebt gehaald, klaar om na controle in een kennisbank te zetten.",
  input_schema: {
    type: "object" as const,
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: [
                "bedrijf",
                "agents",
                "prijzen",
                "veelgestelde vragen",
                "bezwaren",
                "proces",
                "overig",
              ],
            },
            title: { type: "string", description: "Korte, herkenbare titel van dit stukje kennis" },
            question: {
              type: "string",
              description:
                "De vraag van een klant waar dit item antwoord op geeft. Laat weg als het geen vraag beantwoordt.",
            },
            content: {
              type: "string",
              description:
                "Het antwoord in volledige zinnen, in het Nederlands, zonder opmaak. Alleen wat er werkelijk in het document staat.",
            },
          },
          required: ["category", "title", "content"],
        },
      },
    },
    required: ["items"],
  },
};

const INSTRUCTIE = `Je verwerkt een document voor de kennisbank van een AI-assistent die klantvragen beantwoordt op een website.

Haal eruit wat een klant zou kunnen vragen: diensten, prijzen, voorwaarden, doorlooptijden, werkwijze, veelgestelde vragen en bezwaren.

Regels:
- Schrijf alleen op wat er werkelijk in het document staat. Vul niets aan uit eigen kennis, ook niet als je het antwoord weet.
- Staat er een bedrag of termijn in, neem het exact over. Rond niet af en reken niets om.
- Nederlands, volledige zinnen, geen opmaak en geen opsommingstekens.
- Eén onderwerp per item. Liever tien korte items dan drie lange.
- Is een passage onleesbaar of dubbelzinnig, sla hem over in plaats van te gokken.
- Levert het document niets bruikbaars op, geef dan een lege lijst terug.`;

export const importeerKennis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => invoerSchema.parse(d))
  .handler(async ({ context, data }) => {
    const soort = TOEGESTAAN[data.mediatype as keyof typeof TOEGESTAAN];
    if (!soort) {
      throw new Error(
        `Dit bestandstype kan ik niet lezen (${data.mediatype}). Gebruik pdf, afbeelding, tekst, csv, json of Excel.`,
      );
    }

    if (data.inhoud.length > MAX_BYTES * 1.4) {
      throw new Error("Dit bestand is te groot. Splits het op, of houd het onder 8 MB.");
    }

    // Controleer dat deze gebruiker bij die agent hoort vóór we iets aan het
    // model voorleggen, zodat niemand ons modeltegoed kan gebruiken voor een
    // agent die niet van hem is.
    const { data: agent, error: agentFout } = await context.supabase
      .from("agents")
      .select("id, name")
      .eq("slug", data.agentSlug)
      .maybeSingle();
    if (agentFout) throw new Error(agentFout.message);
    if (!agent) throw new Error("Deze agent bestaat niet, of is niet van jou.");

    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY ontbreekt op de server.");

    const blok =
      soort === "document"
        ? {
            type: "document",
            source: { type: "base64", media_type: data.mediatype, data: data.inhoud },
          }
        : soort === "image"
          ? {
              type: "image",
              source: { type: "base64", media_type: data.mediatype, data: data.inhoud },
            }
          : { type: "text", text: data.inhoud.slice(0, 200_000) };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: INSTRUCTIE,
        tools: [EXTRACTIE_TOOL],
        tool_choice: { type: "tool", name: "leg_kennis_vast" },
        messages: [
          {
            role: "user",
            content: [
              blok,
              {
                type: "text",
                text: `Bestand: ${data.bestandsnaam}. Haal hier de kennis uit voor de assistent van ${agent.name}.`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const tekst = (await res.text()).slice(0, 300);
      console.error("kennisimport: Anthropic gaf een fout", res.status, tekst);
      throw new Error("Het document kon niet worden gelezen. Probeer het opnieuw.");
    }

    const antwoord = (await res.json()) as {
      content: Array<{ type: string; name?: string; input?: { items?: KennisVoorstel[] } }>;
    };

    const tool = antwoord.content.find((b) => b.type === "tool_use");
    const items = tool?.input?.items ?? [];

    return {
      agentNaam: agent.name as string,
      items: items.map((i) => ({
        category: i.category,
        title: i.title,
        question: i.question ?? null,
        content: i.content,
      })),
    };
  });
