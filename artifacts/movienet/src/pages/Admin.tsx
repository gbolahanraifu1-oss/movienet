import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import {
  Megaphone,
  Users,
  Trash2,
  Ban,
  CheckCircle2,
  Bot,
  Play,
  Square,
  RefreshCw,
} from "lucide-react";

type Ann = {
  id: number;
  title: string;
  body: string;
  level: string;
  active: boolean;
  created_at?: string;
};

type UserRow = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  banned?: boolean;
};

type CrawlerStatus = {
  success?: boolean;
  entries?: number;
  sample?: string[];
  crawler?: {
    running?: boolean;
    isCrawling?: boolean;
    type?: string | null;
    page?: number;
    maxPages?: number;
    endpoint?: string | null;
    saved?: number;
    skipped?: number;
    failed?: number;
    lastTitle?: string | null;
    startedAt?: string | null;
    finishedAt?: string | null;
    cacheEntries?: number;
    cacheByType?: Record<string, number>;
    logs?: string[];
    stopRequested?: boolean;
  };
};

export function Admin() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const [tab, setTab] = useState<"announcements" | "users" | "crawler">("crawler");
  const [me, setMe] = useState<{ userId: string | null; isAdmin: boolean } | null>(null);

  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...((init?.headers as Record<string, string>) || {}),
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      const r = await fetch(path, {
        ...init,
        headers,
        credentials: "include",
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
      return data;
    },
    [getToken]
  );

  const [anns, setAnns] = useState<Ann[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState("info");
  const [err, setErr] = useState<string | null>(null);
  const [crawl, setCrawl] = useState<CrawlerStatus | null>(null);
  const [pages, setPages] = useState(3);
  const [busy, setBusy] = useState(false);

  const loadMe = useCallback(async () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setMe({ userId: null, isAdmin: false });
      return;
    }
    try {
      const d = await api("/api/admin/me");
      setMe(d);
    } catch (e: any) {
      setErr(e.message);
      setMe({ userId: userId || null, isAdmin: false });
    }
  }, [api, isLoaded, isSignedIn, userId]);

  const loadAnns = useCallback(async () => {
    try {
      const d = await api("/api/admin/announcements");
      setAnns(d.announcements || []);
    } catch (e: any) {
      setErr(e.message);
    }
  }, [api]);

  const loadUsers = useCallback(async () => {
    try {
      const d = await api("/api/admin/users");
      setUsers(d.users || []);
    } catch (e: any) {
      setErr(e.message);
    }
  }, [api]);

  const loadCrawl = useCallback(async () => {
    try {
      const d = await api("/api/admin/crawler/status");
      setCrawl(d);
    } catch (e: any) {
      setErr(e.message);
    }
  }, [api]);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (!me?.isAdmin) return;
    if (tab === "announcements") loadAnns();
    if (tab === "users") loadUsers();
    if (tab === "crawler") loadCrawl();
  }, [me, tab, loadAnns, loadUsers, loadCrawl]);

  useEffect(() => {
    if (tab !== "crawler" || !me?.isAdmin) return;
    const t = setInterval(loadCrawl, 4000);
    return () => clearInterval(t);
  }, [tab, me, loadCrawl]);

  async function postAnn() {
    setErr(null);
    try {
      await api("/api/admin/announcements", {
        method: "POST",
        body: JSON.stringify({ title, body, level }),
      });
      setTitle("");
      setBody("");
      loadAnns();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function toggleAnn(id: number, active: boolean) {
    await api(`/api/admin/announcements/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ active }),
    });
    loadAnns();
  }

  async function deleteAnn(id: number) {
    await api(`/api/admin/announcements/${id}`, { method: "DELETE" });
    loadAnns();
  }

  async function banUser(id: string, ban: boolean) {
    await api(`/api/admin/users/${id}/ban`, {
      method: "POST",
      body: JSON.stringify({ ban }),
    });
    loadUsers();
  }

  async function startCrawl(type: string) {
    setBusy(true);
    setErr(null);
    try {
      await api("/api/admin/crawler/start", {
        method: "POST",
        body: JSON.stringify({ type, pages: pages || 0 }),
      });
      await loadCrawl();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function stopCrawl() {
    setBusy(true);
    try {
      await api("/api/admin/crawler/stop", { method: "POST", body: "{}" });
      await loadCrawl();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <p className="text-zinc-400 text-sm">Loading session…</p>
      </div>
    );
  }

  if (!isSignedIn) {
    const next = encodeURIComponent("/admin");
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 gap-3 text-center">
        <p className="text-zinc-300 font-semibold">Sign in required</p>
        <a
          href={`/sign-in?redirect_url=${next}`}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold"
        >
          Sign in
        </a>
      </div>
    );
  }

  if (me && !me.isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 gap-2 text-center">
        <p className="text-zinc-300 font-semibold">Admin only</p>
        <p className="text-zinc-500 text-xs font-mono max-w-sm break-all">
          Your Clerk user id: {userId || me.userId || "—"}
        </p>
        <p className="text-zinc-600 text-xs max-w-sm">
          Add this id to server env ADMIN_USER_IDS (comma-separated), then redeploy api-server.
        </p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <p className="text-zinc-400 text-sm">Checking admin access…</p>
      </div>
    );
  }

  const c = crawl?.crawler;
  const running = !!(c?.running || c?.isCrawling);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-8 space-y-6">
        <h1 className="text-2xl font-bold">Admin</h1>

        {err && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 text-red-200 text-sm p-3">
            {err}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["crawler", "Crawler", Bot],
              ["announcements", "Announcements", Megaphone],
              ["users", "Users", Users],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                tab === id
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-900 text-zinc-300 border border-white/10"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "crawler" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">Cache crawler</p>
                  <p className="text-xs text-zinc-500">
                    Start one category at a time. Status refreshes every 4s.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadCrawl}
                  className="text-zinc-400 hover:text-white p-2"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-zinc-400">Pages</label>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={pages}
                  onChange={(e) => setPages(Number(e.target.value))}
                  className="w-20 rounded-lg bg-zinc-950 border border-white/10 px-2 py-1.5 text-sm"
                  title="0 or 500 = deep crawl"
                />
                <span className="text-[10px] text-zinc-500">0 = max depth</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(["movie", "tv", "anime"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={busy || running}
                    onClick={() => startCrawl(type)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 disabled:opacity-40 hover:bg-violet-500 py-3 text-sm font-semibold"
                  >
                    <Play className="w-4 h-4" />
                    Start {type === "tv" ? "Series/TV" : type}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={busy || !running}
                onClick={stopCrawl}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/40 text-red-300 disabled:opacity-40 py-2.5 text-sm"
              >
                <Square className="w-4 h-4" /> Stop crawler
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <Stat label="Status" value={running ? "RUNNING" : "Idle"} hot={running} />
              <Stat label="Type" value={c?.type || "—"} />
              <Stat
                label="Page"
                value={c?.page != null ? `\( {c.page}/ \){c.maxPages || "?"}` : "—"}
              />
              <Stat label="Endpoint" value={c?.endpoint || "—"} />
              <Stat label="Saved" value={String(c?.saved ?? 0)} />
              <Stat label="Skipped" value={String(c?.skipped ?? 0)} />
              <Stat label="Failed" value={String(c?.failed ?? 0)} />
              <Stat label="Last title" value={c?.lastTitle || "—"} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4">
              <p className="text-sm font-semibold mb-2">Cache totals</p>
              <p className="text-xs text-zinc-500 mb-2">
                Entries: {crawl?.entries ?? c?.cacheEntries ?? "—"}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                {Object.entries(c?.cacheByType || {}).map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-lg bg-zinc-950/80 border border-white/5 px-3 py-2"
                  >
                    <p className="text-zinc-500 text-[10px] uppercase">{k}</p>
                    <p className="font-mono font-semibold">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/60 p-3">
              <p className="text-xs text-zinc-500 mb-2">Live logs</p>
              <pre className="text-[11px] leading-relaxed text-emerald-400/90 max-h-64 overflow-auto font-mono whitespace-pre-wrap">
                {(c?.logs && c.logs.length
                  ? c.logs
                  : ["No logs yet — start a crawler"]
                ).join("\n")}
              </pre>
            </div>
          </div>
        )}

        {tab === "announcements" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 space-y-3">
              <p className="font-semibold flex items-center gap-2">
                <Megaphone className="w-4 h-4" /> New site announcement
              </p>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-sm"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Message"
                rows={3}
                className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-sm"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                </select>
                <button
                  type="button"
                  onClick={postAnn}
                  className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold"
                >
                  Post announcement
                </button>
              </div>
            </div>

            {anns.length === 0 && (
              <p className="text-zinc-500 text-sm">No announcements yet.</p>
            )}
            <div className="space-y-2">
              {anns.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-white/10 bg-zinc-900/40 p-4 flex gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm">{a.title}</p>
                    <p className="text-zinc-400 text-sm whitespace-pre-wrap">{a.body}</p>
                    <p className="text-[10px] text-zinc-600 mt-1">
                      {a.level} · {a.active ? "active" : "off"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleAnn(a.id, !a.active)}
                      className="text-xs text-zinc-300"
                    >
                      {a.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAnn(a.id)}
                      className="text-xs text-red-400 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-3">
            <p className="text-zinc-500 text-sm">{users.length} users loaded</p>
            {users.map((u) => (
              <div
                key={u.id}
                className="rounded-xl border border-white/10 bg-zinc-900/40 p-4 flex items-center gap-3"
              >
                <img
                  src={u.imageUrl}
                  alt=""
                  className="w-10 h-10 rounded-full bg-zinc-800"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {[u.firstName, u.lastName].filter(Boolean).join(" ") || "User"}
                  </p>
                  <p className="text-zinc-500 text-xs truncate">{u.email}</p>
                  <p className="text-zinc-600 text-[10px] font-mono">{u.id}</p>
                </div>
                {u.banned ? (
                  <button
                    type="button"
                    onClick={() => banUser(u.id, false)}
                    className="flex items-center gap-1 text-xs text-emerald-400"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Unban
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => banUser(u.id, true)}
                    className="flex items-center gap-1 text-xs text-red-400"
                  >
                    <Ban className="w-3.5 h-3.5" /> Ban
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hot,
}: {
  label: string;
  value: string;
  hot?: boolean;
}) {
  return (
    <div className="rounded-xl bg-zinc-950/80 border border-white/5 px-2 py-3">
      <p className="text-[10px] uppercase text-zinc-500">{label}</p>
      <p
        className={`text-sm font-semibold truncate ${hot ? "text-emerald-400" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}