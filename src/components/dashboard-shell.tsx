import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, Eye, LogOut } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { useMeekijken } from "@/hooks/use-meekijken";
import { schermenVoor, type Scherm } from "@/lib/agent-soorten";
import { getMe, listAgents } from "@/lib/dashboard.functions";
import { logMeekijkpagina, stopMeekijken } from "@/lib/meekijken.functions";
import { supabase } from "@/lib/supabase-browser";

const SCHERMLINKS: Record<Scherm, { to: string; label: string }> = {
  contacten: { to: "/contacten", label: "Contacten" },
  campagnes: { to: "/campagnes", label: "Campagnes" },
  berichten: { to: "/berichten", label: "Berichten" },
  antwoorden: { to: "/antwoorden", label: "Antwoorden" },
  bezorgen: { to: "/bezorgen", label: "Bezorgen" },
};

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

  const meekijken = useMeekijken();
  const sessie = meekijken.data ?? null;

  // Beheer is voor wie bij ons werkt, ook support. Uit dezelfde "me" als de
  // pagina's; de isAdmin die een pagina meegeeft is daarvoor te smal.
  const meFn = useServerFn(getMe);
  const me = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const isStaf = me.data?.isStaf === true || isAdmin === true;

  // Dezelfde sleutel als het dashboard, dus meestal al in het geheugen.
  const agentsFn = useServerFn(listAgents);
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: () => agentsFn() });
  const kinds = ((agentsQuery.data ?? []) as Array<{ kind?: string | null }>).map((a) => a.kind);

  // Begint of eindigt een meekijksessie, dan hoort alles wat in het geheugen
  // staat bij de verkeerde klant. Opnieuw ophalen, niet hopen.
  const vorigeSessie = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (meekijken.isLoading) return;
    const nu = sessie?.id ?? null;
    if (vorigeSessie.current !== undefined && vorigeSessie.current !== nu) {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "meekijken" });
    }
    vorigeSessie.current = nu;
  }, [sessie?.id, meekijken.isLoading, queryClient]);

  // Elk scherm dat tijdens meekijken open gaat, komt in de toegangslog van de
  // klant. Zonder sessie doet de database niets met deze aanroep.
  const logFn = useServerFn(logMeekijkpagina);
  useEffect(() => {
    if (sessie) logFn({ data: { pad } }).catch(() => {});
  }, [pad, sessie, logFn]);

  const stopFn = useServerFn(stopMeekijken);
  async function stoppen() {
    await stopFn();
    await queryClient.invalidateQueries();
    navigate({ to: "/admin" });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // Het menu volgt de agents. Contacten, Campagnes en de rest horen bij de
  // uitgaande e-mailagent; een klant met alleen een chat-assistent kreeg vijf
  // lege schermen. Welke soort welke schermen krijgt, staat in agent-soorten.ts.
  //
  // Een beheerder krijgt Beheer vooraan: daar komt hij na het inloggen uit. De
  // rest is zijn eigen portaal, of tijdens meekijken dat van de klant, maar
  // dan zonder Kennisbank: die blijft voor een beheerder altijd dicht.
  const links = [
    ...(isStaf ? [{ to: "/admin", label: "Beheer" }] : []),
    { to: "/dashboard", label: "Dashboard" },
    ...(sessie ? [] : [{ to: "/knowledge", label: "Kennisbank" }]),
    ...schermenVoor(kinds).map((s) => SCHERMLINKS[s]),
    { to: "/account", label: "Account" },
  ];

  return (
    <div className="theme-dark surface-gradient min-h-screen w-full font-sans text-ink antialiased">
      <header
        className="sticky top-0 z-40 border-b border-white/[0.08] backdrop-blur-md"
        style={{ backgroundColor: "rgba(10,10,15,0.82)" }}
      >
        {sessie && (
          <div
            role="status"
            className="border-b border-amber-400/30 bg-amber-400/12 px-4 py-2 text-[12.5px] text-amber-100 sm:px-6"
          >
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1.5">
              <Eye className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
              <span>
                Je kijkt mee bij <strong className="font-semibold">{sessie.klant}</strong>. Alleen
                lezen, en de klant ziet dit terug in zijn toegangslog. Eindigt om{" "}
                {new Date(sessie.verloopt_op).toLocaleTimeString("nl-NL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                .
              </span>
              <button
                type="button"
                onClick={stoppen}
                className="ml-auto rounded-full border border-amber-300/40 px-3 py-1 text-[12px] font-semibold text-amber-100 hover:bg-amber-400/15"
              >
                Stoppen
              </button>
            </div>
          </div>
        )}
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
