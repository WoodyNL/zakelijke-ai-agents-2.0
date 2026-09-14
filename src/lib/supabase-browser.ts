import { createClient } from "@supabase/supabase-js";
import { brokeredPreviewStorage } from "@/integrations/supabase/previewAuthStorage";
import type { Database } from "@/integrations/supabase/types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./supabase-public-config";

/**
 * De Supabase-client voor de browser.
 *
 * Vervangt integrations/supabase/client.ts, dat een fout gooit zodra de
 * VITE_SUPABASE_*-variabelen ontbreken in de build. Die staan hier apart omdat
 * het origineel een gegenereerd bestand is dat Lovable bij elke sync
 * overschrijft.
 *
 * Belangrijk: dit moet de enige client-side Supabase-client blijven. Twee
 * instanties delen dezelfde sessieopslag en gaan elkaar in de weg zitten.
 */
function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // Nieuwe Supabase-sleutels zijn losse strings, geen bearer-JWT's.
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

function createSupabaseClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY) },
    auth: {
      storage: brokeredPreviewStorage(),
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
