
import { Router } from "express";
import { getAuth } from "@clerk/express";

const router = Router();

let dbModulePromise: Promise<typeof import("@workspace/db")> | undefined;
let tableReady = false;

function getDb() {
  return (dbModulePromise ??= import("@workspace/db"));
}

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized — sign in to sync reminders across devices" });
    return;
  }
  req.userId = userId;
  next();
}

/** Ensure reminders table exists (idempotent) */
async function ensureRemindersTable() {
  if (tableReady) return;
  try {
    const mod = await getDb();
    // Prefer pool if exported
    const pool = (mod as any).pool || (mod as any).db?.$client;
    if (pool?.query) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS reminders (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          content_id TEXT NOT NULL,
          content_type TEXT NOT NULL DEFAULT 'movie',
          content_title TEXT NOT NULL,
          poster_url TEXT,
          release_date TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS reminders_user_id_idx ON reminders (user_id);
      `);
    }
    tableReady = true;
  } catch (e) {
    // drizzle path may still work if table exists from migration
    console.warn("[reminders] ensure table:", (e as Error)?.message);
  }
}

function normalizeBody(body: any) {
  const contentId = body?.contentId ?? body?.content_id ?? body?.id;
  let contentType = body?.contentType ?? body?.content_type ?? body?.type ?? "movie";
  // Keep series distinct if schema allows; else map to movie for storage
  if (contentType === "tv") contentType = "series";
  if (contentType !== "anime" && contentType !== "series") contentType = "movie";
  // DB check constraint may only allow movie|anime — fold series → movie for profile sync
  const dbType = contentType === "anime" ? "anime" : "movie";
  const contentTitle = body?.contentTitle ?? body?.content_title ?? body?.title;
  const posterUrl = body?.posterUrl ?? body?.poster_url ?? body?.poster ?? null;
  let releaseDate = body?.releaseDate ?? body?.release_date ?? body?.date;
  if (releaseDate && typeof releaseDate !== "string") {
    try {
      releaseDate = new Date(releaseDate).toISOString();
    } catch {
      releaseDate = null;
    }
  }
  if (!releaseDate) releaseDate = new Date().toISOString();
  return { contentId, contentType: dbType, contentTitle, posterUrl, releaseDate };
}

router.get("/reminders", requireAuth, async (req: any, res: any): Promise<void> => {
  try {
    await ensureRemindersTable();
    const { db, eq, remindersTable } = await getDb();
    const reminders = await db
      .select()
      .from(remindersTable)
      .where(eq(remindersTable.userId, req.userId));
    res.json(
      reminders.map((r: any) => ({
        ...r,
        createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
      }))
    );
  } catch (err: any) {
    req.log?.error?.({ err }, "Failed to get reminders");
    res.status(500).json({
      error: "Failed to fetch reminders",
      detail: process.env.NODE_ENV === "development" ? String(err?.message || err) : undefined,
    });
  }
});

router.post("/reminders", requireAuth, async (req: any, res: any): Promise<void> => {
  try {
    await ensureRemindersTable();
    const { contentId, contentType, contentTitle, posterUrl, releaseDate } = normalizeBody(
      req.body || {}
    );

    if (!contentId || !contentTitle) {
      res.status(400).json({
        error: "Missing required fields",
        need: ["contentId", "contentTitle"],
        got: Object.keys(req.body || {}),
      });
      return;
    }

    const { db, remindersTable } = await getDb();
    const [reminder] = await db
      .insert(remindersTable)
      .values({
        userId: req.userId,
        contentId: String(contentId),
        contentType,
        contentTitle: String(contentTitle),
        posterUrl: posterUrl || null,
        releaseDate: String(releaseDate),
      })
      .returning();

    res.status(201).json({
      ...reminder,
      createdAt: reminder.createdAt?.toISOString?.() ?? reminder.createdAt,
    });
  } catch (err: any) {
    req.log?.error?.({ err }, "Failed to create reminder");
    const msg = String(err?.message || err || "");
    if (/relation .* does not exist|reminders/i.test(msg)) {
      res.status(500).json({
        error:
          "Reminders table missing. Set DATABASE_URL and restart, or run: CREATE TABLE reminders (...).",
        detail: msg.slice(0, 200),
      });
      return;
    }
    res.status(500).json({
      error: "Failed to create reminder",
      detail: process.env.NODE_ENV === "development" ? msg.slice(0, 200) : undefined,
    });
  }
});

router.delete("/reminders/:id", requireAuth, async (req: any, res: any): Promise<void> => {
  try {
    await ensureRemindersTable();
    const { db, and, eq, remindersTable } = await getDb();
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid reminder id" });
      return;
    }
    const [deleted] = await db
      .delete(remindersTable)
      .where(and(eq(remindersTable.id, id), eq(remindersTable.userId, req.userId)))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Reminder not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete reminder" });
  }
});

export default router;
