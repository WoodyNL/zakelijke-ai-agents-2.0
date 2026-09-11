import { useState } from "react";
import brandMark from "@/assets/logo-zakelijke-ai-agents.png.asset.json";

/** Brand mark: the Zakelijke AI Agents node logo. Falls back to a plain initial if the asset fails to load. */
export function BrandMark({ className = "size-8" }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-hidden="true"
        className={`${className} grid place-items-center rounded-xl bg-brand font-display text-[11px] font-bold text-primary-foreground shadow-sm ring-1 ring-ink/5`}
      >
        Z
      </span>
    );
  }

  return (
    <img
      src={brandMark.url}
      alt=""
      aria-hidden="true"
      onError={() => setFailed(true)}
      className={`${className} rounded-xl bg-white/85 p-1 object-contain shadow-sm ring-1 ring-ink/5`}
    />
  );
}

export function BrandLogo({
  markClassName = "size-8",
  textClassName = "text-[15px]",
  hideTextOnMobile = true,
}: {
  markClassName?: string;
  textClassName?: string;
  hideTextOnMobile?: boolean;
}) {
  return (
    <>
      <BrandMark className={markClassName} />
      <span
        className={`font-display ${textClassName} font-semibold tracking-tight ${
          hideTextOnMobile ? "hidden sm:inline-block" : ""
        }`}
      >
        Zakelijke AI Agents
      </span>
    </>
  );
}
