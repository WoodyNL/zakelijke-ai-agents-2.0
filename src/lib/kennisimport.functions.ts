import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { eigenKlant } from "@/lib/klant";

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
  agentSlug: z.string().min(1).max(64).optional(),
  /** Heeft voorrang: niet elke agent heeft al een slug, een id altijd. */
  agentId: z.string().uuid().optional(),
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
    const zoeker = context.supabase
      .from("agents")
      .select("id, name")
      .eq("client_id", await eigenKlant(context));
    const { data: agent, error: agentFout } = await (
      data.agentId ? zoeker.eq("id", data.agentId) : zoeker.eq("slug", data.agentSlug ?? "")
    ).maybeSingle();
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

/**
 * Kennis ophalen van de website van de klant.
 *
 * Elke klant heeft een site, en daar staat meestal al precies wat de agent moet
 * weten: wat ze maken, waar ze zitten, hoe lang ze bestaan. Die tekst met de
 * hand overtypen is werk dat niemand doet, en dan blijft de kennisbank leeg.
 *
 * Alleen de zichtbare tekst gaat mee. Scripts, opmaak en navigatie leveren
 * niets op en zouden het model alleen maar afleiden van waar het om gaat.
 */

const MAX_TEKEN = 120_000;

/** Haalt de leesbare tekst uit een pagina; ruw, maar goed genoeg om te lezen. */
function alleenTekst(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    // Genummerde entiteiten in één keer, niet per teken. WordPress zet er
    // tientallen in — aanhalingstekens, gedachtestreepjes, beletseltekens — en
    // een lijstje bijhouden betekent dat er altijd eentje doorheen glipt.
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim()
    .slice(0, MAX_TEKEN);
}

/**
 * Meerdere pagina's van één site in één keer.
 *
 * Eén pagina per keer is te weinig: op de homepage staat meestal reclametekst,
 * de antwoorden staan op de pagina's over verzending, prijzen, retour en
 * veelgestelde vragen. Die zoeken we op via de links op de startpagina (en de
 * sitemap als die er weinig oplevert), kiezen de pagina's waar zulke
 * antwoorden het waarschijnlijkst staan, en lezen ze samen.
 *
 * Alleen hetzelfde domein, en nooit een intern adres: deze functie haalt op
 * de server op wat een gebruiker intypt, en dat mag geen weg naar binnen zijn.
 */

const MAX_PAGINAS = 10;
const TEKEN_PER_PAGINA = 14_000;

/** Woorden in een adres of linktekst die op antwoorden wijzen, met gewicht. */
const SIGNALEN: Array<[RegExp, number]> = [
  [/faq|veelgestelde|vragen|questions|klantenservice|service|help/, 10],
  [/verzend|verzending|levering|bezorg|shipping|delivery|levertijd/, 9],
  [/retour|ruilen|return|garantie|klacht/, 9],
  [/prijs|prijzen|tarief|tarieven|kosten|pricing|abonnement/, 8],
  [/voorwaarden|terms|betal|payment/, 7],
  [/contact|openingstijden|locatie|adres|route/, 7],
  [/over-ons|over|about|wie-zijn|team|bedrijf/, 5],
  [/diensten|producten|aanbod|assortiment|menu|services|products/, 5],
];

const OVERSLAAN =
  /\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4|mp3|docx?|xlsx?)$|\/(wp-admin|wp-login|login|inloggen|account|winkelwagen|cart|checkout|afrekenen|tag|author|feed)(\/|$)/i;

function isInternAdres(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal")
  ) {
    return true;
  }
  // Een kaal IP-adres: een site van een klant heeft een naam.
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(":");
}

function zelfdeSite(a: URL, b: URL): boolean {
  return a.hostname.replace(/^www\./, "") === b.hostname.replace(/^www\./, "");
}

async function haalPagina(url: string): Promise<string> {
  const u = new URL(url);
  if (!["http:", "https:"].includes(u.protocol) || isInternAdres(u.hostname)) {
    throw new Error("Dit adres kan ik niet ophalen.");
  }
  const stop = new AbortController();
  const klok = setTimeout(() => stop.abort(), 10_000);
  try {
    const res = await fetch(u.toString(), {
      headers: { "user-agent": "ZakelijkeAIAgents/1.0 (kennisbank-import)" },
      redirect: "follow",
      signal: stop.signal,
    });
    if (!res.ok) throw new Error(`De site gaf ${res.status}`);
    const soort = res.headers.get("content-type") ?? "";
    if (soort && !soort.includes("html") && !soort.includes("xml")) {
      throw new Error("Geen webpagina");
    }
    return (await res.text()).slice(0, 2_000_000);
  } finally {
    clearTimeout(klok);
  }
}

/** Kandidaat-pagina's uit de links, gesorteerd op hoe waarschijnlijk er antwoorden staan. */
function kiesPaginas(html: string, basis: URL, extra: string[]): string[] {
  const scores = new Map<string, number>();
  const bekijk = (href: string, linktekst: string) => {
    let u: URL;
    try {
      u = new URL(href, basis);
    } catch {
      return;
    }
    if (!["http:", "https:"].includes(u.protocol) || !zelfdeSite(u, basis)) return;
    u.hash = "";
    u.search = "";
    const pad = u.pathname.replace(/\/+$/, "") || "/";
    if (pad === "/" || OVERSLAAN.test(pad)) return;
    const sleutel = `${u.origin}${pad}`;
    const tekst = `${pad} ${linktekst}`.toLowerCase();
    let score = 0;
    for (const [patroon, gewicht] of SIGNALEN) if (patroon.test(tekst)) score += gewicht;
    // Diep weggestopte pagina's zijn vaker een los product of blogbericht.
    score -= Math.max(0, pad.split("/").length - 3) * 2;
    scores.set(sleutel, Math.max(scores.get(sleutel) ?? -Infinity, score));
  };

  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    bekijk(m[1]!, m[2]!.replace(/<[^>]+>/g, " "));
  }
  for (const href of extra) bekijk(href, "");

  // Eerst de pagina's met een duidelijk signaal, daarna aangevuld met gewone
  // pagina's dicht bij de hoofdmap. Een site zonder "faq" in de adressen heeft
  // zijn antwoorden ook ergens staan.
  return [...scores.entries()]
    .filter(([, score]) => score >= 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_PAGINAS - 1)
    .map(([url]) => url);
}

/** De sitemap, als de startpagina weinig links heeft (bijvoorbeeld een menu in JavaScript). */
async function uitSitemap(basis: URL): Promise<string[]> {
  try {
    const xml = await haalPagina(new URL("/sitemap.xml", basis).toString());
    return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]!).slice(0, 300);
  } catch {
    return [];
  }
}

/** Een handvol tegelijk, niet alles tegelijk: we zijn te gast op die site. */
async function haalAlle(urls: string[]) {
  const uit: Array<{ url: string; tekst: string | null; reden?: string }> = [];
  for (let i = 0; i < urls.length; i += 4) {
    const porties = await Promise.all(
      urls.slice(i, i + 4).map(async (url) => {
        try {
          const tekst = alleenTekst(await haalPagina(url)).slice(0, TEKEN_PER_PAGINA);
          return tekst.length < 200
            ? { url, tekst: null, reden: "nauwelijks tekst" }
            : { url, tekst };
        } catch (e) {
          return { url, tekst: null, reden: e instanceof Error ? e.message : "niet op te halen" };
        }
      }),
    );
    uit.push(...porties);
  }
  return uit;
}

export const importeerVanWebsite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        agentId: z.string().uuid(),
        url: z
          .string()
          .trim()
          .url("Vul een volledig webadres in, inclusief https://")
          .refine((u) => u.startsWith("https://") || u.startsWith("http://"), {
            message: "Alleen http en https.",
          }),
        /** Ook de belangrijkste andere pagina's van dezelfde site (max. 10). */
        heleSite: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: agent, error } = await context.supabase
      .from("agents")
      .select("id, name")
      .eq("id", data.agentId)
      .eq("client_id", await eigenKlant(context))
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!agent) throw new Error("Deze agent bestaat niet, of is niet van jou.");

    let html: string;
    try {
      html = await haalPagina(data.url);
    } catch (e) {
      throw new Error(
        `Die pagina kon ik niet ophalen: ${e instanceof Error ? e.message : "onbekende fout"}`,
      );
    }

    const startTekst = alleenTekst(html);
    const gelezen: Array<{ url: string; gelukt: boolean; reden?: string }> = [];
    let tekst: string;

    if (!data.heleSite) {
      if (startTekst.length < 200) {
        throw new Error(
          "Op die pagina staat nauwelijks tekst. Bij een site die alles met JavaScript opbouwt lukt dit niet; plak de tekst dan met de hand.",
        );
      }
      tekst = startTekst;
      gelezen.push({ url: data.url, gelukt: true });
    } else {
      const basis = new URL(data.url);
      let kandidaten = kiesPaginas(html, basis, []);
      if (kandidaten.length < 4) kandidaten = kiesPaginas(html, basis, await uitSitemap(basis));
      const paginas = await haalAlle(kandidaten);

      const delen: string[] = [];
      if (startTekst.length >= 200) {
        delen.push(`### Pagina: ${basis.pathname || "/"}\n${startTekst.slice(0, TEKEN_PER_PAGINA)}`);
        gelezen.push({ url: data.url, gelukt: true });
      } else {
        gelezen.push({ url: data.url, gelukt: false, reden: "nauwelijks tekst" });
      }
      for (const p of paginas) {
        if (p.tekst) {
          delen.push(`### Pagina: ${new URL(p.url).pathname}\n${p.tekst}`);
          gelezen.push({ url: p.url, gelukt: true });
        } else {
          gelezen.push({ url: p.url, gelukt: false, reden: p.reden ?? "" });
        }
      }
      if (delen.length === 0) {
        throw new Error(
          "Op deze site vond ik nauwelijks tekst. Bij een site die alles met JavaScript opbouwt lukt dit niet; plak de tekst dan met de hand.",
        );
      }
      tekst = delen.join("\n\n").slice(0, MAX_TEKEN);
    }

    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY ontbreekt op de server.");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        // Tien pagina's leveren meer items op dan één; met 4000 werd de lijst
        // halverwege afgekapt.
        max_tokens: data.heleSite ? 8000 : 4000,
        system: INSTRUCTIE,
        tools: [EXTRACTIE_TOOL],
        tool_choice: { type: "tool", name: "leg_kennis_vast" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: tekst },
              {
                type: "text",
                text:
                  (data.heleSite
                    ? `Dit zijn ${gelezen.filter((g) => g.gelukt).length} pagina's van de website ${data.url} van ${agent.name}, elk onder een kopje "Pagina:". Haal hier de kennis uit voor de assistent. Staat hetzelfde op meer pagina's, neem het één keer op.\n\n`
                    : `Dit is de website ${data.url} van ${agent.name}. Haal hier de kennis uit voor de assistent.\n\n`) +
                  "Let op: dit is reclametekst van het bedrijf zelf. Neem feiten over — wat ze maken, waar ze zitten, " +
                  "hoe lang ze bestaan, wat er in een product zit. Neem geen loftuitingen over als feit: " +
                  '"heerlijk", "de beste" en "legendarisch" zijn geen kennis en helpen de assistent niet.',
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const tekstFout = (await res.text()).slice(0, 300);
      console.error("website-import: Anthropic gaf een fout", res.status, tekstFout);
      throw new Error("De pagina kon niet worden gelezen. Probeer het opnieuw.");
    }

    const antwoord = (await res.json()) as {
      content: Array<{ type: string; name?: string; input?: { items?: KennisVoorstel[] } }>;
    };
    const tool = antwoord.content.find((b) => b.type === "tool_use");
    const items = tool?.input?.items ?? [];

    return {
      agentNaam: agent.name as string,
      gelezen,
      items: items.map((i) => ({
        category: i.category,
        title: i.title,
        question: i.question ?? null,
        content: i.content,
      })),
    };
  });
