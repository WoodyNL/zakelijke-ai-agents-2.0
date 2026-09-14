import brandMark from "@/assets/logo-zakelijke-ai-agents.png.asset.json";

/** Brand mark: the Zakelijke AI Agents node logo. */
export function BrandMark({ className = "size-8" }: { className?: string }) {
  return (
    <img
      src={brandMark.url}
      alt=""
      aria-hidden="true"
      className={`${className} rounded-xl bg-white/85 p-1 object-contain shadow-sm ring-1 ring-ink/5`}
    />
  );
}

export function BrandLogo({
  markClassName = "size-8",
  textClassName = "text-[15px]",
}: {
  markClassName?: string;
  textClassName?: string;
}) {
  return (
    <>
      <BrandMark className={markClassName} />
      <span
        className={`font-display ${textClassName} font-semibold tracking-tight whitespace-nowrap`}
      >
        Zakelijke AI Agents
      </span>
    </>
  );
}
