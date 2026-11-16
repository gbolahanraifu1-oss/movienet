import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk, useAuth } from "@clerk/react";
import {
  Bookmark,
  History,
  Bell,
  Settings,
  Crown,
  User,
  X,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  Camera,
} from "lucide-react";

type Tab = "menu" | "watchlist" | "recent" | "notifications" | "settings" | null;

type ListItem = {
  id: string;
  title: string;
  poster?: string;
  type?: string;
  href?: string;
  at?: number;
};

const WL_KEY = "mn_watchlist";
const RECENT_KEY = "mn_recent_streams";
const THEME_KEY = "mn_theme";

function loadList(key: string): ListItem[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

export function trackRecentStream(item: ListItem) {
  try {
    const prev = loadList(RECENT_KEY).filter((x) => x.id !== item.id);
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify([{ ...item, at: Date.now() }, ...prev].slice(0, 40))
    );
  } catch {
    /* */
  }
}

export function toggleWatchlist(item: ListItem): boolean {
  const prev = loadList(WL_KEY);
  const exists = prev.some((x) => x.id === item.id);
  const next = exists
    ? prev.filter((x) => x.id !== item.id)
    : [{ ...item, at: Date.now() }, ...prev];
  localStorage.setItem(WL_KEY, JSON.stringify(next.slice(0, 100)));
  return !exists;
}

/** Shared liquid-glass surface */
const glass =
  "bg-zinc-800/80 backdrop-blur-2xl border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]";
const glassPill =
  "rounded-2xl bg-zinc-700/50 backdrop-blur-md border border-white/10 shadow-inner hover:bg-zinc-600/50 hover:border-white/20 transition-colors";

export function UserDock() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const [loc] = useLocation();
  const [tab, setTab] = useState<Tab>(null);
  const [watchlist, setWatchlist] = useState<ListItem[]>([]);
  const [recent, setRecent] = useState<ListItem[]>([]);
  const [announcements, setAnnouncements] = useState<{ id: number; title: string; body: string }[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      return (localStorage.getItem(THEME_KEY) as "dark" | "light") || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* */
    }
  }, [theme]);

  useEffect(() => {
    if (!tab) return;
    setWatchlist(loadList(WL_KEY));
    setRecent(loadList(RECENT_KEY));
    if (tab === "notifications") {
      fetch("/api/announcements")
        .then((r) => r.json())
        .then((data) => {
          const list = Array.isArray(data)
            ? data
            : Array.isArray(data?.announcements)
              ? data.announcements
              : [];
          setAnnouncements(list.filter((a: any) => a?.active !== false));
        })
        .catch(() => setAnnouncements([]));
    }
  }, [tab, loc]);

  if (!isLoaded || !isSignedIn) return null;

  const nav = [
    { id: "watchlist" as const, Icon: Bookmark, label: "List" },
    { id: "recent" as const, Icon: History, label: "Recent" },
    { id: "notifications" as const, Icon: Bell, label: "Alerts" },
    { id: "settings" as const, Icon: Settings, label: "Settings" },
    { id: "menu" as const, Icon: User, label: "You" },
  ];

  return (
    <>
      {/* Floating ash glass pill — clear of content */}
      <div className="fixed bottom-4 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
        <nav
          className={
            "pointer-events-auto flex items-center gap-1 rounded-full px-2 py-1.5 max-w-sm w-full " +
            glass
          }
          style={{ background: "rgba(39, 39, 42, 0.92)" }}
        >
          {nav.map(({ id, Icon, label }) => {
            const on = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(on ? null : id)}
                className={
                  "flex-1 flex flex-col items-center gap-0.5 rounded-full py-2.5 text-[10px] font-medium transition-all " +
                  (on
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40"
                    : "text-zinc-300 hover:text-white hover:bg-white/10")
                }
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={on ? 2.5 : 2} />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      {tab && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close"
            onClick={() => setTab(null)}
          />
          <div
            className={
              "relative mx-3 mb-24 sm:mb-0 sm:mx-auto sm:max-w-md w-auto rounded-3xl max-h-[70vh] overflow-y-auto p-5 " +
              glass
            }
            style={{ background: "rgba(24, 24, 27, 0.94)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white tracking-wide">
                {tab === "menu"
                  ? "Profile"
                  : tab === "watchlist"
                    ? "Watchlist"
                    : tab === "recent"
                      ? "Recent"
                      : tab === "notifications"
                        ? "Alerts"
                        : "Settings"}
              </h2>
              <button
                type="button"
                onClick={() => setTab(null)}
                className="rounded-full p-2 bg-zinc-700/80 border border-white/10 text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {tab === "menu" && (
              <div className="space-y-3">
                <div className={`flex items-center gap-3 p-3 ${glassPill}`}>
                  <img
                    src={user?.imageUrl}
                    alt=""
                    className="w-14 h-14 rounded-full border-2 border-white/20 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">
                      {user?.fullName || user?.username || "User"}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                      {user?.primaryEmailAddress?.emailAddress}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openUserProfile()}
                  className={`w-full flex items-center justify-between px-4 py-3.5 text-sm text-white ${glassPill}`}
                >
                  <span className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-zinc-400" />
                    Update profile & photo
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </button>
                <Link
                  href="/subscription"
                  onClick={() => setTab(null)}
                  className={`w-full flex items-center gap-2 px-4 py-3.5 text-sm text-amber-100 ${glassPill}`}
                >
                  <Crown className="w-4 h-4 text-amber-400" /> Subscription
                </Link>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className={`w-full flex items-center gap-2 px-4 py-3.5 text-sm text-red-300 ${glassPill}`}
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            )}

            {(tab === "watchlist" || tab === "recent") && (
              <div className="space-y-2">
                {(tab === "watchlist" ? watchlist : recent).length === 0 && (
                  <p className={`text-zinc-400 text-sm text-center py-8 ${glassPill}`}>
                    Nothing here yet.
                  </p>
                )}
                {(tab === "watchlist" ? watchlist : recent).map((item) => (
                  <Link
                    key={item.id + String(item.at || "")}
                    href={item.href || "/"}
                    onClick={() => setTab(null)}
                    className={`flex gap-3 p-2 ${glassPill}`}
                  >
                    {item.poster ? (
                      <img
                        src={item.poster}
                        alt=""
                        className="w-12 h-16 object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-12 h-16 rounded-xl bg-zinc-900" />
                    )}
                    <div className="min-w-0 self-center">
                      <p className="text-sm font-medium text-white truncate">{item.title}</p>
                      <p className="text-[10px] text-zinc-500 uppercase">{item.type || ""}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {tab === "notifications" && (
              <div className="space-y-2">
                {announcements.length === 0 && (
                  <p className={`text-zinc-400 text-sm text-center py-6 ${glassPill}`}>
                    No announcements right now.
                  </p>
                )}
                {announcements.map((a) => (
                  <div key={a.id} className={`p-4 text-left ${glassPill}`}>
                    <p className="text-sm font-semibold text-white">{a.title}</p>
                    <p className="text-xs text-zinc-400 mt-1 whitespace-pre-wrap">{a.body}</p>
                  </div>
                ))}
              </div>
            )}

            {tab === "settings" && (
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 px-1">Theme</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={
                      "flex-1 flex items-center justify-center gap-2 py-3.5 text-sm rounded-2xl border transition-all " +
                      (theme === "dark"
                        ? "bg-violet-600 border-violet-400/50 text-white shadow-lg"
                        : glassPill + " text-zinc-300")
                    }
                  >
                    <Moon className="w-4 h-4" /> Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={
                      "flex-1 flex items-center justify-center gap-2 py-3.5 text-sm rounded-2xl border transition-all " +
                      (theme === "light"
                        ? "bg-violet-600 border-violet-400/50 text-white shadow-lg"
                        : glassPill + " text-zinc-300")
                    }
                  >
                    <Sun className="w-4 h-4" /> Light
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => openUserProfile()}
                  className={`w-full px-4 py-3.5 text-sm text-left text-white ${glassPill}`}
                >
                  Manage account (email, password, photo)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
