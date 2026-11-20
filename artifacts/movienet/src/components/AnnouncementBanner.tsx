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

const levelAccent: Record<string, string> = {
  info: "#a78bfa",
  warning: "#fbbf24",
  success: "#34d399",
};

export function AnnouncementBanner() {
  const [loc] = useLocation();
  const [items, setItems] = useState<Item[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("mn_ann_dismissed");
      if (raw) setDismissed(new Set(JSON.parse(raw).map(Number)));
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/announcements", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.announcements)
            ? data.announcements
            : [];
        setItems(list.filter((a: Item) => a && a.id != null && a.active !== false));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loc]);

  function dismiss(id: number) {
    setDismissed((prev) => {
      const next = new Set(prev).add(id);
      try {
        sessionStorage.setItem("mn_ann_dismissed", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  const visible = items.filter((i) => !dismissed.has(i.id));
  if (!visible.length) return null;

  const top = visible.filter((i) => i.placement === "top");
  const center = visible.filter((i) => (i.placement || "center") !== "top");

  return (
    <>
      {/* TOP — fully opaque ash bar, clears the fixed header */}
      {top.length > 0 && (
        <div className="relative z-40 px-3 pt-3 mt-16 space-y-2">
          {top.map((a) => (
            <div
              key={a.id}
              className="relative rounded-2xl px-5 py-3.5 pr-12 text-sm"
              style={{
                backgroundColor: "#18181b",
                border: `1px solid ${levelAccent[a.level] || levelAccent.info}55`,
                boxShadow: "0 12px 40px rgba(0,0,0,0.85)",
                color: "#fafafa",
              }}
            >
              <div className="flex gap-3 items-center">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "#27272a", border: "1px solid #3f3f46" }}
                >
                  <Megaphone className="w-4 h-4" style={{ color: levelAccent[a.level] || levelAccent.info }} />
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-tight" style={{ color: "#ffffff" }}>
                    {a.title}
                  </p>
                  <p className="text-xs mt-0.5 whitespace-pre-wrap line-clamp-3" style={{ color: "#d4d4d8" }}>
                    {a.body}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(a.id)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full"
                style={{ backgroundColor: "#27272a", color: "#a1a1aa", border: "1px solid #3f3f46" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* CENTER — solid black scrim + solid ash card (zero transparency) */}
      {center.map((a) => (
        <div
          key={a.id}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: "#000000" }}
        >
          <div
            className="relative w-full max-w-md rounded-3xl px-6 py-6"
            style={{
              backgroundColor: "#18181b",
              border: `1px solid ${levelAccent[a.level] || levelAccent.info}66`,
              boxShadow: "0 24px 64px rgba(0,0,0,0.9)",
              color: "#fafafa",
            }}
          >
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(a.id)}
              className="absolute right-3 top-3 p-2 rounded-full"
              style={{ backgroundColor: "#27272a", color: "#a1a1aa", border: "1px solid #3f3f46" }}
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center text-center gap-3 pt-2">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: "#27272a", border: "1px solid #3f3f46" }}
              >
                <Megaphone className="w-6 h-6" style={{ color: levelAccent[a.level] || levelAccent.info }} />
              </span>
              <h2 className="text-xl font-bold" style={{ color: "#ffffff" }}>
                {a.title}
              </h2>
              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "#d4d4d8" }}>
                {a.body}
              </p>
              <button
                type="button"
                onClick={() => dismiss(a.id)}
                className="mt-2 w-full rounded-2xl font-semibold py-3 transition-colors"
                style={{ backgroundColor: "#f4f4f5", color: "#18181b" }}
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
