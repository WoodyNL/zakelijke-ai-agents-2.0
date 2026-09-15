import * as React from "react";

export const shadowBrand = {
  boxShadow: "0 10px 30px -10px oklch(0.55 0.22 293 / 0.6), 0 0 24px -6px oklch(0.60 0.20 290 / 0.45)",
} as const;

export function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-6xl px-5 md:px-8 ${className}`}>{children}</div>;
}

export function Section({
  id,
  labelledBy,
  children,
  tinted = false,
  className = "",
}: {
  id?: string;
  labelledBy?: string;
  children: React.ReactNode;
  tinted?: boolean;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={`scroll-mt-24 py-16 md:py-24 ${tinted ? "section-tinted" : ""} ${className}`}
    >
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet">{children}</p>
  );
}

export function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="mt-3 max-w-[22ch] font-display text-[28px]/[1.15] font-bold tracking-tight text-brand sm:text-[36px]/[1.1]"
    >
      {children}
    </h2>
  );
}

export function Lead({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 max-w-[68ch] text-[15px]/[1.75] text-ink/75">{children}</p>;
}

export function Source({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-[11.5px]/[1.5] text-ink/55">{children}</p>;
}

export function Check({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`mt-[2px] shrink-0 text-mint ${className}`}>
      ✓
    </span>
  );
}

export function CtaButton({
  href = "#contact",
  children,
  className = "",
  variant = "primary",
}: {
  href?: string;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "outline";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full text-[14px] font-semibold cta-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";
  return (
    <a
      href={href}
      className={
        variant === "primary"
          ? `${base} h-12 px-7 text-white cta-purple ${className}`
          : `${base} h-12 border border-white/15 bg-white/5 px-6 text-ink/85 hover:bg-white/10 hover:text-ink ${className}`
      }
    >
      {children}
    </a>
  );
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Telt op naar de eindwaarde zodra het getal in beeld komt. */
export function CountUp({
  value,
  prefix = "",
  suffix = "",
  display,
  className = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  display?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const [shown, setShown] = React.useState(0);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setShown(value);
      setDone(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.disconnect();
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / 800);
            const eased = 1 - Math.pow(1 - t, 3);
            setShown(Math.round(value * eased));
            if (t < 1) requestAnimationFrame(tick);
            else setDone(true);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {done && display ? display : `${prefix}${shown}${suffix}`}
    </span>
  );
}
