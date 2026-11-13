import { useEffect, useRef, useState } from "react";
import { getVideoAd } from "../lib/ads";

type Props = { onDone: () => void };

/** Pre-roll: skippable after skipAfterSec. No popunder. */
export function VideoPreroll({ onDone }: Props) {
  const ad = getVideoAd();
  const [elapsed, setElapsed] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const doneRef = useRef(false);

  const duration = ad?.durationSec ?? 15;
  const skipAfter = ad?.skipAfterSec ?? 5;

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }

  useEffect(() => {
    if (!ad?.src) {
      finish();
      return;
    }
    const id = window.setInterval(() => {
      setElapsed((e) => {
        const n = e + 1;
        if (n >= skipAfter) setCanSkip(true);
        if (n >= duration) {
          window.clearInterval(id);
          finish();
        }
        return n;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ad?.src) return null;

  return (
    <div className="absolute inset-0 z-20 bg-black flex flex-col">
      <div className="relative flex-1 min-h-0">
        <video
          className="absolute inset-0 w-full h-full object-contain bg-black"
          src={ad.src}
          autoPlay
          playsInline
          onEnded={finish}
          onClick={() => {
            if (ad.clickUrl) window.open(ad.clickUrl, "_blank", "noopener");
          }}
        />
        <div className="absolute top-3 left-3 text-[10px] uppercase tracking-wider bg-black/70 text-zinc-300 px-2 py-1 rounded">
          Ad · {Math.max(0, duration - elapsed)}s
        </div>
        {canSkip ? (
          <button
            type="button"
            onClick={finish}
            className="absolute bottom-4 right-4 bg-white text-black text-xs font-bold px-4 py-2 rounded-full shadow-lg hover:bg-zinc-200"
          >
            Skip Ad
          </button>
        ) : (
          <div className="absolute bottom-4 right-4 bg-black/70 text-zinc-300 text-xs px-3 py-2 rounded-full">
            Skip in {Math.max(0, skipAfter - elapsed)}s
          </div>
        )}
      </div>
    </div>
  );
}
