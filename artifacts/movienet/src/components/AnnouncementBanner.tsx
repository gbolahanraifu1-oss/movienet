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
  info: "border-violet-400/30",
  warning: "border-amber-400/30",
  success: "border-emerald-400/30",
};

const glass =
  "bg-zinc-800/90 backdrop-blur-2xl shadow-[0_16px_48px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.1)]";

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
        <div className="relative z-20 px-3 pt-3 mt-2 space-y-2">
          {top.map((a) => (
            <div
              key={a.id}
              className={
                "relative rounded-full px-5 py-3 pr-12 text-sm text-white border " +
                glass +
                " " +
                (levelBorder[a.level] || levelBorder.info)
              }
            >
              <div className="flex gap-2 items-center">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 border border-white/15">
                  <Megaphone className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-tight">{a.title}</p>
                  <p className="opacity-90 text-xs mt-0.5 whitespace-pre-wrap line-clamp-3">{a.body}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(a.id)}
                className="absolute top-1/2 -translate-y-1/2 right-2 p-2 rounded-full bg-zinc-900/80 border border-white/15"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {center.map((a) => (
        <div key={a.id} className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Dismiss"
            onClick={() => dismiss(a.id)}
          />
          <div
            className={
              "relative z-10 w-full max-w-sm rounded-3xl px-5 py-6 text-white border " +
              glass +
              " " +
              (levelBorder[a.level] || levelBorder.info)
            }
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => dismiss(a.id)}
              className="absolute top-3 right-3 p-2 rounded-full bg-zinc-900/90 border border-white/15"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center text-center gap-3 pt-1">
              <div className="w-14 h-14 rounded-full bg-violet-600/30 border border-white/15 flex items-center justify-center">
                <Megaphone className="w-7 h-7" />
              </div>
              <p className="font-bold text-lg">{a.title}</p>
              <p className="text-sm text-zinc-200 whitespace-pre-wrap opacity-95">{a.body}</p>
              <button
                type="button"
                onClick={() => dismiss(a.id)}
                className="mt-1 rounded-full bg-violet-600 hover:bg-violet-500 px-8 py-2.5 text-sm font-semibold shadow-lg"
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
