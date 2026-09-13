import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import * as React from "react";
import { BrandLogo } from "@/components/brand-logo";
import { NAV, SITE } from "@/content/site";
import { Container, shadowBrand } from "./ui";

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
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled ? "border-b border-white/10 backdrop-blur-md" : "border-b border-transparent"
      }`}
      style={scrolled ? { backgroundColor: "rgba(10,10,15,0.85)" } : undefined}
    >
      <Container className="flex h-[72px] items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <BrandLogo />
          <span className="hidden text-[11px] text-ink/45 sm:block">{SITE.tagline}</span>
        </Link>

        <nav aria-label="Hoofdmenu" className="hidden items-center gap-6 lg:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="text-[13px] text-ink/65 hover:text-ink">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a href="#ai-scan" className="text-[13px] font-semibold text-ink/70 hover:text-ink">
            AI-scan
          </a>
          <a
            href="#contact"
            className="inline-flex h-10 items-center rounded-full bg-brand px-5 text-[13px] font-semibold text-primary-foreground cta-lift"
            style={shadowBrand}
          >
            {SITE.ctaPrimary}
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
                className="rounded-xl px-3 py-3 text-[14px] text-ink/75 hover:bg-white/5 hover:text-ink"
              >
                {n.label}
              </a>
            ))}
            <a
              href="#ai-scan"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-3 text-[14px] text-ink/75 hover:bg-white/5 hover:text-ink"
            >
              AI-scan
            </a>
            <a
              href="#contact"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-brand px-6 text-[14px] font-semibold text-primary-foreground"
              style={shadowBrand}
            >
              {SITE.ctaPrimary}
            </a>
          </Container>
        </div>
      )}
    </header>
  );
}
