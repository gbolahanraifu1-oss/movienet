import { Router } from "express";
import { getAuth } from "@clerk/express";

const router = Router();

let dbModulePromise: Promise<typeof import("@workspace/db")> | undefined;

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

function normalizeBody(body: any) {
  const contentId = body?.contentId ?? body?.content_id ?? body?.id;
  let contentType = body?.contentType ?? body?.content_type ?? body?.type ?? "movie";
  if (contentType === "series" || contentType === "tv") contentType = "anime";
  if (contentType !== "anime") contentType = "movie";
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
  return { contentId, contentType, contentTitle, posterUrl, releaseDate };
}

router.get("/reminders", requireAuth, async (req: any, res: any): Promise<void> => {
  try {
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
    const { contentId, contentType, contentTitle, posterUrl, releaseDate } = normalizeBody(
      req.body || {}
    );

    if (!contentId || !contentTitle) {
      res.status(400).json({
        error: "Missing required fields",
        need: ["contentId", "contentTitle", "contentType", "releaseDate"],
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
    // Common: relation "reminders" does not exist
    if (/relation .* does not exist|reminders/i.test(msg)) {
      res.status(500).json({
        error:
          "Reminders table missing. Run DB migrations (drizzle) so the `reminders` table exists.",
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
    res.sendStatus(204);
  } catch (err: any) {
    req.log?.error?.({ err }, "Failed to delete reminder");
    res.status(500).json({ error: "Failed to delete reminder" });
  }
});

export default router;
