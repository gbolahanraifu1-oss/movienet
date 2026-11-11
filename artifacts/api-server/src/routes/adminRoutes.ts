/**
 * Admin API routes
 * Protect with ADMIN_USER_IDS=user_xxx,user_yyy (Clerk user ids)
 * Optional: CLERK_SECRET_KEY for user list/ban
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

async function clerkClient() {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) return null;
  try {
    const { createClerkClient } = await import("@clerk/backend");
    return createClerkClient({ secretKey: key });
  } catch {
    return null;
  }
}

/** Who am I / is admin */
router.get("/admin/me", (req: any, res: any) => {
  const auth = getAuth(req);
  const userId = auth?.userId || null;
  res.json({
    userId,
    isAdmin: !!(userId && adminIds().has(userId)),
  });
});

/** List users (Clerk) */
router.get("/admin/users", requireAdmin, async (req: any, res: any) => {
  try {
    const client = await clerkClient();
    if (!client) {
      res.status(503).json({
        error: "CLERK_SECRET_KEY not configured — cannot list users",
      });
      return;
    }
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const offset = Number(req.query.offset) || 0;
    const list = await client.users.getUserList({ limit, offset });
    res.json({
      users: list.data.map((u) => ({
        id: u.id,
        email: u.emailAddresses?.[0]?.emailAddress || null,
        firstName: u.firstName,
        lastName: u.lastName,
        imageUrl: u.imageUrl,
        createdAt: u.createdAt,
        lastSignInAt: u.lastSignInAt,
        banned: u.banned,
        publicMetadata: u.publicMetadata,
      })),
      total: list.totalCount,
    });
  } catch (e: any) {
    req.log?.error?.({ err: e }, "admin users");
    res.status(500).json({ error: e?.message || "Failed to list users" });
  }
});

/** Ban / unban */
router.post("/admin/users/:id/ban", requireAdmin, async (req: any, res: any) => {
  try {
    const client = await clerkClient();
    if (!client) {
      res.status(503).json({ error: "CLERK_SECRET_KEY missing" });
      return;
    }
    const ban = req.body?.ban !== false;
    if (ban) await client.users.banUser(req.params.id);
    else await client.users.unbanUser(req.params.id);
    res.json({ ok: true, banned: ban });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Ban failed" });
  }
});

/** Public: active announcements for banner */
router.get("/announcements", async (req: any, res: any) => {
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
  } catch (e: any) {
    // Graceful if table not migrated yet
    res.json([]);
  }
});

/** Admin: all announcements */
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
      error:
        e?.message ||
        "DB error — run migration for announcements table",
    });
  }
});

/** Create announcement */
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

/** Toggle / update */
router.patch("/admin/announcements/:id", requireAdmin, async (req: any, res: any) => {
  try {
    const id = Number(req.params.id);
    const { db, eq, announcementsTable } = await getDb();
    const patch: any = { updatedAt: new Date() };
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
