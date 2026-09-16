import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

/** Het pad waarop Resend binnengekomen antwoorden meldt. */
const INBOUND_PAD = "/api/inbound";

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // De webhook wordt hier afgehandeld en niet als serverfunctie, om twee
      // redenen. Serverfuncties zitten achter de CSRF-controle, en die hoort
      // een verzoek van buiten juist tegen te houden — daar is dit eindpunt de
      // uitzondering op, want het wordt met opzet door een vreemde partij
      // aangeroepen. En de handtekening wordt berekend over de ruwe tekst van
      // het verzoek, dus die mag onderweg niet ontleed of opnieuw opgebouwd
      // worden. De echtheidscontrole zit in verwerkInboundWebhook zelf.
      if (new URL(request.url).pathname === INBOUND_PAD) {
        const { verwerkInboundWebhook } = await import("./lib/inbound.server");
        return await verwerkInboundWebhook(request);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
