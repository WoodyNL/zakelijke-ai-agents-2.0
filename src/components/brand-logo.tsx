/** Brand mark: the Zakelijke AI Agents node logo. */
export function BrandMark({ className = "size-8" }: { className?: string }) {
  return (
    // Het merkteken stond op de assetopslag van het bouwplatform: 69 kB PNG
    // van 1024 px, om op 32 px te tonen. Nu 5 kB WebP van 96 px, op eigen
    // domein. De maten staan erbij zodat de browser de ruimte al kent
    // voordat het plaatje er is en de kop er niet overheen springt.
    <img
      src="/logo-zakelijke-ai-agents.webp"
      width={96}
      height={96}
      alt=""
      aria-hidden="true"
      decoding="async"
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
