/**
 * Admin API — announcements via DATABASE_URL (pg) or in-memory fallback.
 * Crawler controls proxy to VPS (MOVIE_API_BASE + API_SECRET).
 * Env: ADMIN_USER_IDS, CLERK_SECRET_KEY, DATABASE_URL, MOVIE_API_BASE / VPS_BASE, API_SECRET / VPS_SECRET
 */
import { Router } from "express";
import { getAuth } from "@clerk/express";

const router = Router();

function adminIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS || "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function requireAdmin(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  if (!adminIds().has(userId)) {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  req.userId = userId;
  next();
}

async function clerkFetch(
  path: string,
  init?: { method?: string; body?: string }
): Promise<any> {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) throw new Error("CLERK_SECRET_KEY missing");
  const fetchFn = (globalThis as any).fetch as (input: string, init?: any) => Promise<any>;
  const r = await fetchFn(`https://api.clerk.com/v1${path}`, {
    method: init?.method || "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: init?.body,
  });
  const text: string = await r.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!r.ok) {
    throw new Error(data?.errors?.[0]?.message || data?.message || `Clerk ${r.status}`);
  }
  return data;
}

/* ---------- Announcements store (pg or memory) ---------- */
type Ann = {
  id: number;
  title: string;
  body: string;
  level: string;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const memAnns: Ann[] = [];
let memId = 1;
let pool: any = null;
let tableReady = false;

async function getPool() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Pool } = require("pg");
    pool = new Pool({ connectionString: url, ssl: url.includes("localhost") ? false : { rejectUnauthorized: false } });
    return pool;
  } catch (e: any) {
    console.warn("[admin] pg unavailable:", e?.message);
    return null;
  }
}

async function ensureTable() {
  if (tableReady) return;
  const p = await getPool();
  if (!p) return;
  await p.query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'info',
      active BOOLEAN NOT NULL DEFAULT true,
      created_by TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  tableReady = true;
}

async function listAnnouncements(all: boolean) {
  await ensureTable();
  const p = await getPool();
  if (!p) {
    return all ? [...memAnns] : memAnns.filter((a) => a.active);
  }
  const q = all
    ? `SELECT * FROM announcements ORDER BY id DESC`
    : `SELECT * FROM announcements WHERE active = true ORDER BY id DESC`;
  const { rows } = await p.query(q);
  return rows;
}

async function createAnnouncement(title: string, body: string, level: string, userId: string) {
  await ensureTable();
  const p = await getPool();
  if (!p) {
    const row: Ann = {
      id: memId++,
      title,
      body,
      level: level || "info",
      active: true,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memAnns.unshift(row);
    return row;
  }
  const { rows } = await p.query(
    `INSERT INTO announcements (title, body, level, created_by) VALUES ($1,$2,$3,$4) RETURNING *`,
    [title, body, level || "info", userId]
  );
  return rows[0];
}

async function setAnnouncementActive(id: number, active: boolean) {
  await ensureTable();
  const p = await getPool();
  if (!p) {
    const a = memAnns.find((x) => x.id === id);
    if (a) {
      a.active = active;
      a.updated_at = new Date().toISOString();
    }
    return a;
  }
  const { rows } = await p.query(
    `UPDATE announcements SET active=$2, updated_at=NOW() WHERE id=$1 RETURNING *`,
    [id, active]
  );
  return rows[0];
}

async function deleteAnnouncement(id: number) {
  await ensureTable();
  const p = await getPool();
  if (!p) {
    const i = memAnns.findIndex((x) => x.id === id);
    if (i >= 0) memAnns.splice(i, 1);
    return;
  }
  await p.query(`DELETE FROM announcements WHERE id=$1`, [id]);
}

/* ---------- VPS crawler proxy ---------- */
function vpsBase() {
  return (
    process.env.MOVIE_API_BASE ||
    process.env.VPS_BASE ||
    process.env.VITE_MOVIE_API_BASE ||
    "https://movienetapi.hidenplay.net"
  ).replace(/\/$/, "");
}
function vpsSecret() {
  return process.env.API_SECRET || process.env.VPS_SECRET || process.env.MOVIE_API_SECRET || "";
}

async function vpsFetch(pathAndQuery: string) {
  const fetchFn = (globalThis as any).fetch as (input: string, init?: any) => Promise<any>;
  const url = `${vpsBase()}${pathAndQuery}`;
  const r = await fetchFn(url, { headers: { Accept: "application/json" } });
  const text = await r.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { ok: r.ok, status: r.status, data };
}

/* ---------- Routes ---------- */
router.get("/admin/me", (req: any, res: any) => {
  const auth = getAuth(req);
  const userId = auth?.userId || null;
  res.json({ userId, isAdmin: !!(userId && adminIds().has(userId)) });
});

router.get("/admin/users", requireAdmin, async (req: any, res: any) => {
  try {
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const offset = Number(req.query.offset) || 0;
    const data = await clerkFetch(`/users?limit=${limit}&offset=${offset}`);
    const list = Array.isArray(data) ? data : data?.data || [];
    res.json({
      users: list.map((u: any) => ({
        id: u.id,
        email: u.email_addresses?.[0]?.email_address || null,
        firstName: u.first_name,
        lastName: u.last_name,
        imageUrl: u.image_url,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
        banned: !!u.banned,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to list users" });
  }
});

router.post("/admin/users/:id/ban", requireAdmin, async (req: any, res: any) => {
  try {
    const ban = req.body?.ban !== false;
    await clerkFetch(`/users/${req.params.id}/ban`, {
      method: ban ? "POST" : "DELETE",
    });
    res.json({ ok: true, banned: ban });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/admin/announcements", requireAdmin, async (_req: any, res: any) => {
  try {
    const rows = await listAnnouncements(true);
    res.json({ announcements: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/announcements", async (_req: any, res: any) => {
  try {
    const rows = await listAnnouncements(false);
    res.json({ announcements: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/admin/announcements", requireAdmin, async (req: any, res: any) => {
  try {
    const title = String(req.body?.title || "").trim();
    const body = String(req.body?.body || "").trim();
    const level = String(req.body?.level || "info");
    if (!title || !body) {
      res.status(400).json({ error: "title and body required" });
      return;
    }
    const row = await createAnnouncement(title, body, level, req.userId);
    res.json({ announcement: row });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/admin/announcements/:id", requireAdmin, async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const active = !!req.body?.active;
    const row = await setAnnouncementActive(id, active);
    res.json({ announcement: row });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/admin/announcements/:id", requireAdmin, async (req: any, res: any) => {
  try {
    await deleteAnnouncement(Number(req.params.id));
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** Crawler: start by category */
router.post("/admin/crawler/start", requireAdmin, async (req: any, res: any) => {
  try {
    const type = String(req.body?.type || "movie").toLowerCase(); // movie | tv | anime
    const pages = Number(req.body?.pages ?? 3);
    const secret = vpsSecret();
    if (!secret) {
      res.status(500).json({ error: "API_SECRET / VPS_SECRET not configured on api-server" });
      return;
    }
    const q = `/admin/crawl?secret=${encodeURIComponent(secret)}&type=${encodeURIComponent(type)}&pages=${pages || 0}`;
    const { ok, status, data } = await vpsFetch(q);
    res.status(ok ? 200 : status || 502).json(data || { error: "VPS error" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/admin/crawler/stop", requireAdmin, async (_req: any, res: any) => {
  try {
    const secret = vpsSecret();
    const { ok, status, data } = await vpsFetch(
      `/admin/crawl-stop?secret=${encodeURIComponent(secret)}`
    );
    res.status(ok ? 200 : status || 502).json(data || { error: "VPS error" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/admin/crawler/status", requireAdmin, async (_req: any, res: any) => {
  try {
    const secret = vpsSecret();
    const { ok, status, data } = await vpsFetch(
      `/admin/crawl-status?secret=${encodeURIComponent(secret)}`
    );
    res.status(ok ? 200 : status || 502).json(data || { error: "VPS error" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
