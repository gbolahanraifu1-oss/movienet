import { useMemo, type MouseEvent } from "react";
import { pickBanner, tryPopunder } from "../lib/ads";

type Props = {
  label?: string;
  /** Allow popunder on click (default true). Never use on Watch player. */
  popunder?: boolean;
  className?: string;
};

/**
 * Banner ad slot. Fills "Advertisement" headers.
 * Optional popunder on click — disabled when popunder={false}.
 */
export function AdSlot({
  label = "Advertisement",
  popunder = true,
  className = "",
}: Props) {
  const ad = useMemo(() => pickBanner(), []);

  function onClick(_e: MouseEvent) {
    if (popunder) tryPopunder("banner");
    // let default navigate for the <a>
  }

  return (
    <div className={`w-full max-w-5xl mx-auto my-6 px-4 ${className}`}>
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5 text-center">
        {label}
      </p>
      <a
        href={ad.clickUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={onClick}
        className="ad-slot block min-h-[90px] rounded-lg border border-zinc-800 bg-zinc-900/60 overflow-hidden hover:border-primary/40 transition-colors"
        data-ad-slot="movienet-banner"
      >
        <img
          src={ad.imageUrl}
          alt={ad.alt || "Sponsored"}
          className="w-full h-auto max-h-[120px] object-contain mx-auto"
          loading="lazy"
        />
      </a>
    </div>
  );
}
