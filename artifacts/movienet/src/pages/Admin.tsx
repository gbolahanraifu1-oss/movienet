import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@clerk/react";
import {
  Shield,
  Users,
  Megaphone,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Trash2,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  createdAt: number;
  lastSignInAt: number | null;
  banned: boolean;
};

type Announcement = {
  id: number;
  title: string;
  body: string;
  level: string;
  active: boolean;
  createdAt?: string;
};

export function Admin() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [tab, setTab] = useState<"users" | "announcements">("announcements");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState("info");
  const [saving, setSaving] = useState(false);

  async function authHeaders(): Promise<HeadersInit> {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const h = await authHeaders();
        const me = await fetch("/api/admin/me", { headers: h }).then((r) =>
          r.json()
        );
        setIsAdmin(!!me.isAdmin);
        if (me.isAdmin) {
          const [u, a] = await Promise.all([
            fetch("/api/admin/users", { headers: h }).then((r) => r.json()),
            fetch("/api/admin/announcements", { headers: h }).then((r) =>
              r.json()
            ),
          ]);
          if (u.users) setUsers(u.users);
          if (Array.isArray(a)) setAnns(a);
          else if (a.error) setError(a.error);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load admin");
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoaded, isSignedIn]);

  async function refreshAnns() {
    const h = await authHeaders();
    const a = await fetch("/api/admin/announcements", { headers: h }).then(
      (r) => r.json()
    );
    if (Array.isArray(a)) setAnns(a);
  }

  async function createAnn() {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      const h = await authHeaders();
      const r = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { ...h, "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, level, active: true }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed");
      setTitle("");
      setBody("");
      await refreshAnns();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleAnn(id: number, active: boolean) {
    const h = await authHeaders();
    await fetch(`/api/admin/announcements/${id}`, {
      method: "PATCH",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    await refreshAnns();
  }

  async function deleteAnn(id: number) {
    if (!confirm("Delete this announcement?")) return;
    const h = await authHeaders();
    await fetch(`/api/admin/announcements/${id}`, {
      method: "DELETE",
      headers: h,
    });
    await refreshAnns();
  }

  async function banUser(id: string, ban: boolean) {
    const h = await authHeaders();
    await fetch(`/api/admin/users/${id}/ban`, {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify({ ban }),
    });
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, banned: ban } : u))
    );
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-zinc-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (!isSignedIn || !isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <Shield className="w-12 h-12 text-zinc-600" />
        <p className="text-white font-semibold text-lg">Admin only</p>
        <p className="text-zinc-500 text-sm text-center max-w-md">
          Sign in with an account listed in <code className="text-primary">ADMIN_USER_IDS</code>.
        </p>
        <Button asChild variant="outline">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="border-b border-white/5 bg-zinc-950/80">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-zinc-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-display font-bold text-white">
            MovieNet Admin
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {error && (
          <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("announcements")}
            className={
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border " +
              (tab === "announcements"
                ? "bg-primary text-white border-primary"
                : "border-white/10 text-zinc-300")
            }
          >
            <Megaphone className="w-4 h-4" /> Announcements
          </button>
          <button
            type="button"
            onClick={() => setTab("users")}
            className={
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border " +
              (tab === "users"
                ? "bg-primary text-white border-primary"
                : "border-white/10 text-zinc-300")
            }
          >
            <Users className="w-4 h-4" /> Users
          </button>
        </div>

        {tab === "announcements" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5 space-y-3">
              <h2 className="text-white font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" /> New site announcement
              </h2>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="w-full rounded-xl bg-zinc-950 border border-white/10 px-4 py-2.5 text-white text-sm"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Message shown to everyone on the site…"
                rows={3}
                className="w-full rounded-xl bg-zinc-950 border border-white/10 px-4 py-2.5 text-white text-sm resize-y"
              />
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="rounded-lg bg-zinc-950 border border-white/10 px-3 py-2 text-sm text-white"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                </select>
                <Button
                  onClick={createAnn}
                  disabled={saving}
                  className="rounded-full font-bold"
                >
                  {saving ? "Posting…" : "Post announcement"}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {anns.length === 0 && (
                <p className="text-zinc-500 text-sm">No announcements yet.</p>
              )}
              {anns.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-white/10 bg-zinc-900/40 p-4 flex gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold text-sm">
                        {a.title}
                      </span>
                      <span
                        className={
                          "text-[10px] uppercase font-bold px-2 py-0.5 rounded " +
                          (a.active
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-zinc-700 text-zinc-400")
                        }
                      >
                        {a.active ? "Live" : "Off"}
                      </span>
                      <span className="text-[10px] text-zinc-500 uppercase">
                        {a.level}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-sm whitespace-pre-wrap">
                      {a.body}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleAnn(a.id, !a.active)}
                      className="text-xs text-zinc-300 hover:text-white"
                    >
                      {a.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAnn(a.id)}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
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
                  <p className="text-white text-sm font-semibold truncate">
                    {[u.firstName, u.lastName].filter(Boolean).join(" ") ||
                      "User"}
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
