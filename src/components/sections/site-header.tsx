import { Link } from "@tanstack/react-router";
import { LogIn, Menu, X } from "lucide-react";
import * as React from "react";
import { BrandLogo } from "@/components/brand-logo";
import { NAV, SITE } from "@/content/site";
import { Container } from "./ui";

export function SiteHeader() {
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-md transition-colors duration-300 ${
        scrolled ? "border-white/12" : "border-white/[0.06]"
      }`}
      style={{ backgroundColor: scrolled ? "rgba(10,10,15,0.9)" : "rgba(10,10,15,0.55)" }}
    >
      <Container className="flex h-[72px] items-center justify-between gap-4">
        <Link to="/" className="mr-8 flex items-center gap-3" onClick={() => setOpen(false)}>
          {/* Hier stond vanaf 2xl de tagline naast het logo. De container
              groeit niet mee (1152px), dus die paste nooit: de balk stak 90px
              buiten zijn kader. */}
          <BrandLogo />
        </Link>

        <nav aria-label="Hoofdmenu" className="hidden items-center gap-0.5 lg:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="nav-link px-2.5 py-2 text-[13px] font-medium whitespace-nowrap text-ink/80"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {/* Klanten moeten hun portaal kunnen vinden vanaf de voorpagina; op
              de subpagina's stond de knop al, hier ontbrak hij. Tussen lg en
              xl alleen het icoon, anders past de balk niet naast het menu. */}
          <Link
            to="/auth"
            aria-label="Inloggen klantportaal"
            className="nav-link inline-flex items-center gap-1.5 px-2.5 py-2 text-[13px] font-medium whitespace-nowrap text-ink/75 hover:text-ink"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            <span className="hidden xl:inline">Inloggen</span>
          </Link>
          {/* De balk is nooit breder dan de container (1152px), en met
              Inloggen erbij paste AI-scan er op geen enkel scherm meer naast:
              de knop viel rechts buiten beeld. AI-scan staat als knop in de
              hero en in het telefoonmenu; hier vervalt het. Tussen lg en xl
              is de knoptekst korter, anders past het daar ook niet. */}
          <a
            href="#contact"
            className="cta-purple inline-flex h-11 items-center whitespace-nowrap rounded-full px-5 text-[13px] font-semibold text-white xl:px-6"
          >
            <span className="xl:hidden">Gratis verkenning</span>
            <span className="hidden xl:inline">{SITE.ctaPrimary}</span>
          </a>
        </div>

        <button
          type="button"
          aria-label={open ? "Menu sluiten" : "Menu openen"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-ink lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </Container>

      {open && (
        <div className="border-t border-white/10 lg:hidden" style={{ backgroundColor: "rgba(10,10,15,0.97)" }}>
          <Container className="flex flex-col gap-1 py-4">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-[14px] text-ink/85 transition-colors hover:bg-white/8 hover:text-ink"
              >
                {n.label}
              </a>
            ))}
            <a
              href="#ai-scan"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-3 text-[14px] font-semibold text-ink/85 transition-colors hover:bg-white/8 hover:text-ink"
            >
              AI-scan
            </a>
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-3 text-[14px] text-ink/85 transition-colors hover:bg-white/8 hover:text-ink"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Inloggen klantportaal
            </Link>
            <a
              href="#contact"
              onClick={() => setOpen(false)}
              className="cta-purple mt-2 inline-flex h-12 items-center justify-center rounded-full px-6 text-[14px] font-semibold text-white"
            >
              {SITE.ctaPrimary}
            </a>
          </Container>
        </div>
      )}
    </header>
  );
}
