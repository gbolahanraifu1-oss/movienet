import { useEffect, useState } from "react";
import { X, Megaphone } from "lucide-react";

type Item = { id: number; title: string; body: string; level: string };

const levelCls: Record<string, string> = {
  info: "from-violet-600/90 to-violet-800/90 border-violet-400/30",
  warning: "from-amber-600/90 to-amber-800/90 border-amber-400/30",
  success: "from-emerald-600/90 to-emerald-800/90 border-emerald-400/30",
};

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
        if (Array.isArray(data)) setItems(data);
      })
      .catch(() => {});
  }, []);

  function dismiss(id: number) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        sessionStorage.setItem(
          "mn_ann_dismiss",
          JSON.stringify([...next])
        );
      } catch {
        /* */
      }
      return next;
    });
  }

  const visible = items.filter((i) => !dismissed.has(i.id));
  if (!visible.length) return null;

  return (
    <div className="space-y-2 px-3 pt-2">
      {visible.map((a) => (
        <div
          key={a.id}
          className={
            "relative rounded-xl border bg-gradient-to-r text-white px-4 py-3 pr-10 text-sm shadow-lg " +
            (levelCls[a.level] || levelCls.info)
          }
        >
          <div className="flex gap-2 items-start">
            <Megaphone className="w-4 h-4 shrink-0 mt-0.5 opacity-90" />
            <div>
              <p className="font-bold">{a.title}</p>
              <p className="opacity-90 text-xs sm:text-sm mt-0.5 whitespace-pre-wrap">
                {a.body}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismiss(a.id)}
            className="absolute top-2 right-2 p-1 rounded-lg hover:bg-black/20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
