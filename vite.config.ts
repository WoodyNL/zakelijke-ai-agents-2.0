// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          /**
           * Supabase in een eigen brok.
           *
           * De Supabase-client wordt door vier routes gebruikt — inloggen,
           * wachtwoord herstellen en twee schermen in het klantportaal — en
           * daardoor belandde hij in de gedeelde hoofdbrok. Die haalt elke
           * bezoeker binnen, ook iemand die alleen de landingspagina leest en
           * nooit inlogt: ruim 60 kB aan inlog- en realtime-code waar op die
           * pagina niets mee gebeurt.
           *
           * Apart gezet wordt hij pas opgehaald door de route die hem nodig
           * heeft. Dit verandert alleen de indeling van de bestanden, niet
           * welke code er draait.
           */
          manualChunks(id: string): string | undefined {
            if (id.includes("@supabase/")) return "supabase";
            return undefined;
          },
        },
      },
    },
  },
});
