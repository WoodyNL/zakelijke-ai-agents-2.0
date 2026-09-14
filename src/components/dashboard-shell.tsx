import { BrandLogo } from "@/components/brand-logo";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-browser";
import type { ReactNode } from "react";

export function DashboardShell({
  children,
  isAdmin,
  userName,
}: {
  children: ReactNode;
  isAdmin?: boolean | undefined;
  userName?: string | undefined;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="surface-gradient min-h-screen w-full font-sans text-ink antialiased">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
        <header className="flex items-center justify-between animate-rise">
          <Link to="/dashboard" className="flex items-center gap-2">
            <BrandLogo />
          </Link>
          <nav className="flex items-center gap-2 text-[12px] font-medium">
            {isAdmin && (
              <Link
                to="/admin"
                className="rounded-full border border-white/60 bg-white/60 px-3.5 py-2 text-brand hover:bg-white/80"
              >
                Beheer
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/knowledge"
                className="rounded-full border border-white/60 bg-white/60 px-3.5 py-2 text-brand hover:bg-white/80"
              >
                Kennis
              </Link>
            )}
            <Link
              to="/account"
              className="rounded-full border border-white/60 bg-white/60 px-3.5 py-2 text-brand hover:bg-white/80"
            >
              Account
            </Link>
            {userName && <span className="hidden text-ink/55 sm:inline">{userName}</span>}
            <button
              onClick={signOut}
              className="rounded-full bg-brand px-3.5 py-2 text-primary-foreground"
              style={{ boxShadow: "0 12px 26px -12px oklch(0.2 0.04 285 / 0.8)" }}
            >
              Uitloggen
            </button>
          </nav>
        </header>
        <main className="mt-7">{children}</main>
      </div>
    </div>
  );
}

export const STATUS_META: Record<string, { label: string; dot: string; chip: string }> = {
  live: { label: "Live", dot: "bg-mint", chip: "bg-mint/20 text-brand" },
  paused: { label: "Gepauzeerd", dot: "bg-ink/30", chip: "bg-ink/10 text-ink/70" },
  setup: { label: "In opbouw", dot: "bg-amber-400", chip: "bg-amber-400/25 text-brand" },
};
