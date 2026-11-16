import { useEffect, useState } from "react";
import { X, Megaphone } from "lucide-react";

type Item = {
  id: number;
  title: string;
  body: string;
  level: string;
  placement?: "top" | "center";
  active?: boolean;
};

const levelCls: Record<string, string> = {
  info: "border-violet-400/25 from-violet-900/90 to-zinc-900/95",
  warning: "border-amber-400/25 from-amber-900/90 to-zinc-900/95",
  success: "border-emerald-400/25 from-emerald-900/90 to-zinc-900/95",
};

const glass =
  "backdrop-blur-2xl bg-gradient-to-br shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] border";

export function AnnouncementBanner() {
  const [items, setItems] = useState<Item[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(() => {
    try {
      const raw = sessionStorage.getItem("mn_ann_dismiss");
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });

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
  }, []);

  function dismiss(id: number) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        sessionStorage.setItem("mn_ann_dismiss", JSON.stringify([...next]));
      } catch {
        /* */
      }
      return next;
    });
  }

  const visible = items.filter((i) => !dismissed.has(i.id));
  if (!visible.length) return null;

  const top = visible.filter((i) => (i.placement || "center") === "top");
  const center = visible.filter((i) => (i.placement || "center") === "center");

  return (
    <>
      {/* Top strip — below header, not over hamburger */}
      {top.length > 0 && (
        <div className="relative z-20 px-3 pt-2 space-y-2">
          {top.map((a) => (
            <div
              key={a.id}
              className={
                "relative rounded-2xl px-4 py-3 pr-12 text-sm text-white " +
                glass +
                " " +
                (levelCls[a.level] || levelCls.info)
              }
            >
              <div className="flex gap-2 items-start">
                <Megaphone className="w-4 h-4 shrink-0 mt-0.5 opacity-90" />
                <div className="min-w-0">
                  <p className="font-bold">{a.title}</p>
                  <p className="opacity-90 text-xs sm:text-sm mt-0.5 whitespace-pre-wrap">{a.body}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(a.id)}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/30 border border-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Center screen modal banners */}
      {center.map((a) => (
        <div
          key={a.id}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            aria-label="Dismiss"
            onClick={() => dismiss(a.id)}
          />
          <div
            className={
              "relative z-10 w-full max-w-sm rounded-3xl px-5 py-6 text-white " +
              glass +
              " " +
              (levelCls[a.level] || levelCls.info)
            }
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => dismiss(a.id)}
              className="absolute top-3 right-3 p-2 rounded-full bg-zinc-800/90 border border-white/15"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center text-center gap-3 pt-2">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
                <Megaphone className="w-6 h-6" />
              </div>
              <p className="font-bold text-lg">{a.title}</p>
              <p className="text-sm text-zinc-200 whitespace-pre-wrap opacity-95">{a.body}</p>
              <button
                type="button"
                onClick={() => dismiss(a.id)}
                className="mt-2 rounded-full bg-violet-600 hover:bg-violet-500 px-6 py-2.5 text-sm font-semibold"
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
