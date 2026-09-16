import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/lib/supabase-browser";

/**
 * De schil om alles achter de inlog.
 *
 * Draait bewust op hetzelfde donkere thema als de landingspagina. Een klant die
 * op de site is geweest en dan inlogt, hoort niet het gevoel te krijgen dat hij
 * bij een ander bedrijf terechtkomt: het portaal is onderdeel van wat hij koopt.
 */
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
  const pad = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // De kennisbank en de contactenlijst zijn voor iedereen: RLS zorgt dat een
  // klant alleen ziet wat bij zijn eigen agents hoort. Alleen het beheerpaneel
  // blijft afgeschermd.
  //
  // Contacten staat er ook voor een klant zonder e-mailagent, en dat is een
  // afweging. Een menu-item dat niets doet is rommelig, maar een scherm dat
  // bestaat zonder link is erger: dat is eerder in dit project gebeurd en toen
  // dacht iedereen dat de functie ontbrak. De pagina legt zelf uit wanneer er
  // niets te doen valt.
  const links = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/knowledge", label: "Kennisbank" },
    { to: "/contacten", label: "Contacten" },
    { to: "/campagnes", label: "Campagnes" },
    { to: "/berichten", label: "Berichten" },
    { to: "/antwoorden", label: "Antwoorden" },
    ...(isAdmin ? [{ to: "/admin", label: "Beheer" }] : []),
    { to: "/account", label: "Account" },
  ];

  return (
    <div className="theme-dark surface-gradient min-h-screen w-full font-sans text-ink antialiased">
      <header
        className="sticky top-0 z-40 border-b border-white/[0.08] backdrop-blur-md"
        style={{ backgroundColor: "rgba(10,10,15,0.82)" }}
      >
        <div className="mx-auto flex h-[68px] w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link to="/dashboard" className="flex shrink-0 items-center gap-3">
            <BrandLogo textClassName="text-[14px]" />
          </Link>

          <nav aria-label="Klantportaal" className="ml-2 hidden items-center gap-0.5 md:flex">
            {links.map((l) => {
              const actief = pad.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`nav-link px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors ${
                    actief ? "bg-white/[0.07] text-ink" : "text-ink/70 hover:text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <a
              href="/"
              className="nav-link hidden px-3 py-2 text-[12.5px] font-medium text-ink/60 hover:text-ink lg:inline-flex lg:items-center lg:gap-1"
            >
              Website
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            {userName && (
              <span className="hidden items-center gap-2.5 sm:flex">
                <span aria-hidden="true" className="h-4 w-px bg-white/12" />
                <span className="max-w-[18ch] truncate text-[12.5px] text-ink/45">{userName}</span>
              </span>
            )}
            <button
              type="button"
              onClick={signOut}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 px-3.5 text-[12.5px] font-semibold text-ink/80 transition-colors hover:border-violet/40 hover:bg-white/5 hover:text-ink"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Uitloggen
            </button>
          </div>
        </div>

        {/* Op een telefoon past de navigatie niet naast het logo; dan komt hij
            eronder als scrollbare rij in plaats van achter een hamburgermenu,
            want met drie tot vier bestemmingen is verbergen onnodig. */}
        <nav
          aria-label="Klantportaal"
          className="flex gap-1 overflow-x-auto border-t border-white/[0.06] px-4 py-2 md:hidden"
        >
          {links.map((l) => {
            const actief = pad.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`nav-link shrink-0 px-3 py-1.5 text-[12.5px] font-medium ${
                  actief ? "bg-white/[0.07] text-ink" : "text-ink/70"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}

/**
 * Statuskleuren. Naast de kleur staat altijd een woord, zodat de status ook
 * leesbaar is voor wie kleuren niet onderscheidt.
 */
export const STATUS_META: Record<string, { label: string; dot: string; chip: string }> = {
  live: {
    label: "Live",
    dot: "bg-mint",
    chip: "border-mint/30 bg-mint/12 text-mint",
  },
  paused: {
    label: "Gepauzeerd",
    dot: "bg-ink/40",
    chip: "border-white/12 bg-white/5 text-ink/65",
  },
  setup: {
    label: "In opbouw",
    dot: "bg-amber-400",
    chip: "border-amber-400/30 bg-amber-400/12 text-amber-300",
  },
};
