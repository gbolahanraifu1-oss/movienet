import { useEffect, useId, useRef } from "react";

type Props = {
  label?: string;
  /** kept for API compat — Adsterra popunder is global in index.html */
  popunder?: boolean;
  className?: string;
};

/** Adsterra 300×250 banner key */
const ADSTERRA_BANNER_KEY = "36deb6e043caf9ec74adfc4a66cd4ebb";

/**
 * Live Adsterra 300×250 banner.
 * Popunder is loaded once in index.html <head>.
 */
export function AdSlot({
  label = "Advertisement",
  className = "",
}: Props) {
  const reactId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const slotId = `ad-${reactId.replace(/:/g, "")}`;

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    // Clear previous inject (StrictMode / remount)
    el.innerHTML = "";

    // Adsterra expects global atOptions then invoke.js
    const cfg = document.createElement("script");
    cfg.type = "text/javascript";
    cfg.text = `
      atOptions = {
        'key': '${ADSTERRA_BANNER_KEY}',
        'format': 'iframe',
        'height': 250,
        'width': 300,
        'params': {}
      };
    `;
    el.appendChild(cfg);

    const inv = document.createElement("script");
    inv.type = "text/javascript";
    inv.src = `https://www.highperformanceformat.com/${ADSTERRA_BANNER_KEY}/invoke.js`;
    inv.async = true;
    el.appendChild(inv);

    return () => {
      try {
        el.innerHTML = "";
      } catch {
        /* */
      }
    };
  }, [slotId]);

  return (
    <div className={`w-full max-w-5xl mx-auto my-6 px-4 ${className}`}>
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5 text-center">
        {label}
      </p>
      <div
        className="ad-slot flex justify-center min-h-[250px] rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden"
        data-ad-slot="adsterra-300x250"
      >
        <div ref={boxRef} id={slotId} className="flex justify-center items-start w-[300px] min-h-[250px]" />
      </div>
    </div>
  );
}
