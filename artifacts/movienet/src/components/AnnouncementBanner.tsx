import { useEffect, useState } from "react";
import { X, Megaphone } from "lucide-react";
import { useLocation } from "wouter";

type Item = {
  id: number;
  title: string;
  body: string;
  level: string;
  placement?: "top" | "center";
  active?: boolean;
};

const levelBorder: Record<string, string> = {
  info: "border-violet-400/40",
  warning: "border-amber-400/40",
  success: "border-emerald-400/40",
};

/** Solid ash glass — not see-through over hero posters */
const ashGlass =
  "bg-zinc-900/95 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.06)]";

const ashPill =
  "bg-zinc-850 bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/12 shadow-[0_12px_40px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.08)]";

export function AnnouncementBanner() {
  const [loc] = useLocation();
  const [items, setItems] = useState<Item[]>([]);
  // in-memory only — refresh / leave home and come back shows again
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.announcements)
            ? data.announcements
            : [];
        setItems(list.filter((a: Item) => a && a.id != null && a.active !== false));
      })
      .catch(() => {});
  }, [loc]);

  // Re-show when navigating to home
  useEffect(() => {
    if (loc === "/" || loc === "") setDismissed(new Set());
  }, [loc]);

  function dismiss(id: number) {
    setDismissed((prev) => new Set(prev).add(id));
  }

  const visible = items.filter((i) => !dismissed.has(i.id));
  if (!visible.length) return null;

  const top = visible.filter((i) => i.placement === "top");
  const center = visible.filter((i) => (i.placement || "center") !== "top");

  return (
    <>
      {top.length > 0 && (
        <div className="relative z-30 px-3 pt-3 mt-14 space-y-2">
          {top.map((a) => (
            <div
              key={a.id}
              className={
                "relative rounded-2xl px-5 py-3.5 pr-12 text-sm text-white " +
                ashPill +
                " " +
                (levelBorder[a.level] || levelBorder.info)
              }
            >
              <div className="flex gap-3 items-center">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-700/80 border border-white/15">
                  <Megaphone className="w-4 h-4 text-violet-300" />
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-tight text-white">{a.title}</p>
                  <p className="text-zinc-300 text-xs mt-0.5 whitespace-pre-wrap line-clamp-3">
                    {a.body}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(a.id)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 border border-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {center.map((a) => (
        <div
          key={a.id}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div
            className={
              "relative w-full max-w-md rounded-3xl px-6 py-6 text-white " +
              ashGlass +
              " " +
              (levelBorder[a.level] || levelBorder.info)
            }
          >
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(a.id)}
              className="absolute right-3 top-3 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center text-center gap-3 pt-2">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 border border-white/15">
                <Megaphone className="w-6 h-6 text-violet-300" />
              </span>
              <h2 className="text-xl font-bold text-white">{a.title}</h2>
              <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">{a.body}</p>
              <button
                type="button"
                onClick={() => dismiss(a.id)}
                className="mt-2 w-full rounded-2xl bg-zinc-100 text-zinc-900 font-semibold py-3 hover:bg-white transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
