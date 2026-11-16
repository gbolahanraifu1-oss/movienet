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
    const next = [{ ...item, at: Date.now() }, ...prev].slice(0, 40);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* */
  }
}

export function toggleWatchlist(item: ListItem): boolean {
  const prev = loadList(WL_KEY);
  const exists = prev.some((x) => x.id === item.id);
  const next = exists ? prev.filter((x) => x.id !== item.id) : [{ ...item, at: Date.now() }, ...prev];
  localStorage.setItem(WL_KEY, JSON.stringify(next.slice(0, 100)));
  return !exists;
}

export function UserDock() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const [loc] = useLocation();
  const [tab, setTab] = useState<Tab>(null);
  const [watchlist, setWatchlist] = useState<ListItem[]>([]);
  const [recent, setRecent] = useState<ListItem[]>([]);
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
  }, [tab, loc]);

  if (!isLoaded || !isSignedIn) return null;

  const glass =
    "backdrop-blur-xl bg-white/10 dark:bg-zinc-900/70 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.35)]";

  return (
    <>
      {/* Bottom liquid-glass dock — logged in only */}
      <div className="fixed bottom-0 inset-x-0 z-50 flex justify-center pointer-events-none pb-3 px-3">
        <div
          className={
            "pointer-events-auto flex items-center gap-1 rounded-2xl px-2 py-1.5 max-w-md w-full " +
            glass
          }
        >
          {(
            [
              ["watchlist", Bookmark, "List"],
              ["recent", History, "Recent"],
              ["notifications", Bell, "Alerts"],
              ["settings", Settings, "Settings"],
              ["menu", User, "You"],
            ] as const
          ).map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(tab === id ? null : id)}
              className={`flex-1 flex flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] ${
                tab === id ? "text-violet-300 bg-white/10" : "text-zinc-300 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close"
            onClick={() => setTab(null)}
          />
          <div className={`relative rounded-t-3xl max-h-[75vh] overflow-y-auto p-5 pb-28 ${glass}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white capitalize">
                {tab === "menu" ? "Profile" : tab}
              </h2>
              <button type="button" onClick={() => setTab(null)} className="p-2 text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {tab === "menu" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img
                    src={user?.imageUrl}
                    alt=""
                    className="w-14 h-14 rounded-full border border-white/20"
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
                  className="w-full flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white"
                >
                  Update profile & photo <ChevronRight className="w-4 h-4 text-zinc-500" />
                </button>
                <Link
                  href="/subscription"
                  onClick={() => setTab(null)}
                  className="w-full flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-400/20 px-4 py-3 text-sm text-amber-100"
                >
                  <Crown className="w-4 h-4" /> Subscription
                </Link>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-2 rounded-xl border border-red-500/30 text-red-300 px-4 py-3 text-sm"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            )}

            {(tab === "watchlist" || tab === "recent") && (
              <div className="space-y-2">
                {(tab === "watchlist" ? watchlist : recent).length === 0 && (
                  <p className="text-zinc-400 text-sm">Nothing here yet.</p>
                )}
                {(tab === "watchlist" ? watchlist : recent).map((item) => (
                  <Link
                    key={item.id + (item.at || "")}
                    href={item.href || "/"}
                    onClick={() => setTab(null)}
                    className="flex gap-3 rounded-xl bg-white/5 border border-white/10 p-2 hover:bg-white/10"
                  >
                    {item.poster ? (
                      <img src={item.poster} alt="" className="w-12 h-16 object-cover rounded-lg" />
                    ) : (
                      <div className="w-12 h-16 rounded-lg bg-zinc-800" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.title}</p>
                      <p className="text-[10px] text-zinc-500 uppercase">{item.type || ""}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {tab === "notifications" && (
              <p className="text-zinc-400 text-sm">
                Site announcements appear at the top. Push notifications coming soon.
              </p>
            )}

            {tab === "settings" && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Theme</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm border ${
                      theme === "dark"
                        ? "bg-violet-600 border-violet-400 text-white"
                        : "bg-white/5 border-white/10 text-zinc-300"
                    }`}
                  >
                    <Moon className="w-4 h-4" /> Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm border ${
                      theme === "light"
                        ? "bg-violet-600 border-violet-400 text-white"
                        : "bg-white/5 border-white/10 text-zinc-300"
                    }`}
                  >
                    <Sun className="w-4 h-4" /> Light
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => openUserProfile()}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-left text-white"
                >
                  Manage account (email, password, profile picture)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
