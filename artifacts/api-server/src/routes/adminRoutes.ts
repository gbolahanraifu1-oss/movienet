/**
 * Admin API — no @clerk/backend package required (uses Clerk REST + fetch).
 * Env: ADMIN_USER_IDS, CLERK_SECRET_KEY, DATABASE_URL
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

let dbPromise: Promise<typeof import("@workspace/db")> | undefined;
function getDb() {
  return (dbPromise ??= import("@workspace/db"));
}

async function clerkFetch(path: string, init?: RequestInit) {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) throw new Error("CLERK_SECRET_KEY missing");
  const r = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await r.text();
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

router.get("/admin/me", (req: any, res: any) => {
  const auth = getAuth(req);
  const userId = auth?.userId || null;
  res.json({
    userId,
    isAdmin: !!(userId && adminIds().has(userId)),
  });
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
        publicMetadata: u.public_metadata,
      })),
      total: data?.total_count ?? list.length,
    });
  } catch (e: any) {
    req.log?.error?.({ err: e }, "admin users");
    res.status(500).json({ error: e?.message || "Failed to list users" });
  }
});

router.post("/admin/users/:id/ban", requireAdmin, async (req: any, res: any) => {
  try {
    const ban = req.body?.ban !== false;
    if (ban) {
      await clerkFetch(`/users/${encodeURIComponent(req.params.id)}/ban`, {
        method: "POST",
        body: "{}",
      });
    } else {
      await clerkFetch(`/users/${encodeURIComponent(req.params.id)}/unban`, {
        method: "POST",
        body: "{}",
      });
    }
    res.json({ ok: true, banned: ban });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Ban failed" });
  }
});

router.get("/announcements", async (_req: any, res: any) => {
  try {
    const { db, eq, announcementsTable } = await getDb();
    const rows = await db
      .select()
      .from(announcementsTable)
      .where(eq(announcementsTable.active, true));
    res.json(
      rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        level: r.level,
        createdAt: r.createdAt?.toISOString?.() || r.createdAt,
      }))
    );
  } catch {
    res.json([]);
  }
});

router.get("/admin/announcements", requireAdmin, async (req: any, res: any) => {
  try {
    const { db, announcementsTable } = await getDb();
    const rows = await db.select().from(announcementsTable);
    res.json(
      rows.map((r: any) => ({
        ...r,
        createdAt: r.createdAt?.toISOString?.() || r.createdAt,
        updatedAt: r.updatedAt?.toISOString?.() || r.updatedAt,
      }))
    );
  } catch (e: any) {
    res.status(500).json({
      error: e?.message || "DB error — run announcements SQL migration",
    });
  }
});

router.post("/admin/announcements", requireAdmin, async (req: any, res: any) => {
  try {
    const { title, body, level = "info", active = true } = req.body || {};
    if (!title || !body) {
      res.status(400).json({ error: "title and body required" });
      return;
    }
    const { db, announcementsTable } = await getDb();
    const [row] = await db
      .insert(announcementsTable)
      .values({
        title: String(title).slice(0, 200),
        body: String(body).slice(0, 5000),
        level: ["info", "warning", "success"].includes(level) ? level : "info",
        active: Boolean(active),
        createdBy: req.userId,
      })
      .returning();
    res.json({
      ...row,
      createdAt: row.createdAt?.toISOString?.() || row.createdAt,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Create failed" });
  }
});

router.patch("/admin/announcements/:id", requireAdmin, async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const { db, eq, announcementsTable } = await getDb();
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (req.body?.title != null) patch.title = String(req.body.title).slice(0, 200);
    if (req.body?.body != null) patch.body = String(req.body.body).slice(0, 5000);
    if (req.body?.level != null) patch.level = req.body.level;
    if (req.body?.active != null) patch.active = Boolean(req.body.active);
    const [row] = await db
      .update(announcementsTable)
      .set(patch)
      .where(eq(announcementsTable.id, id))
      .returning();
    res.json(row || { ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Update failed" });
  }
});

router.delete("/admin/announcements/:id", requireAdmin, async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const { db, eq, announcementsTable } = await getDb();
    await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Delete failed" });
  }
});

export default router;
