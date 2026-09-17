import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { organizationJsonLd, paginaMeta } from "../lib/seo";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Deze pagina bestaat niet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          De pagina is verplaatst of heeft nooit bestaan. Hieronder staat waar de meeste bezoekers
          naartoe willen.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Naar de homepage
          </Link>
          <Link
            to="/tarieven"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Tarieven
          </Link>
          <Link
            to="/ai-scan"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            AI-scan
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Deze pagina kon niet worden geladen
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Er ging iets mis aan onze kant. Probeer het opnieuw of ga terug naar de homepage.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Opnieuw proberen
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Naar de homepage
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      // Standaardwaarden voor elke pagina die niets eigens meegeeft. Routes
      // die wél in de zoekresultaten horen, overschrijven dit met hun eigen
      // paginaMeta(); TanStack vervangt een meta-tag met dezelfde naam.
      ...paginaMeta({
        pad: "/",
        titel: "AI-agency voor het MKB | Zakelijke AI Agents",
        beschrijving:
          "AI-scan, projectondersteuning en maatwerk AI-automatiseringen voor het MKB. Wij zijn het verschil tussen een AI-experiment en iets dat blijft draaien.",
        ogBeschrijving:
          "95% van de AI-pilots levert nooit een euro op. Wij bouwen AI-automatiseringen die dat wel doen.",
      }),
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      // De lettertypen staan nu op eigen domein (zie @font-face in styles.css),
      // dus de twee preconnects en de stylesheet van Google zijn weg. Deze
      // twee bestanden dekken samen bijna alle tekst op de pagina; ze vooraf
      // opvragen scheelt de wachttijd tot de browser de CSS heeft gelezen.
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: "/fonts/inter-latin.woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: "/fonts/grotesk-latin.woff2",
        crossOrigin: "anonymous",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
    scripts: [{ type: "application/ld+json", children: organizationJsonLd() }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
