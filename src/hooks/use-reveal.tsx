import * as React from "react";

/** Reveals children with a soft rise once they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
  ...rest
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section";
} & React.HTMLAttributes<HTMLElement>) {
  const ref = React.useRef<HTMLElement | null>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      // @ts-expect-error polymorphic ref
      ref={ref}
      data-shown={shown ? "true" : "false"}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
