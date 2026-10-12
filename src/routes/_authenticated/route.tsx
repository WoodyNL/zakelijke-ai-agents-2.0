import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase-browser";
import { tweedeStapNodig } from "@/lib/tweede-stap";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Een sessie met alleen een wachtwoord komt hier niet binnen zolang er een
    // app is ingesteld. Terug naar /auth, dat scherm vraagt om de code.
    if (await tweedeStapNodig()) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
