import { Router, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { eq, and } from "drizzle-orm";
import { db, remindersTable } from "@workspace/db";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}

router.get("/reminders", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const reminders = await db
      .select()
      .from(remindersTable)
      .where(eq(remindersTable.userId, req.userId));
    res.json(reminders.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get reminders");
    res.status(500).json({ error: "Failed to fetch reminders" });
  }
});

router.post("/reminders", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { contentId, contentType, contentTitle, posterUrl, releaseDate } = req.body;
    if (!contentId || !contentType || !contentTitle || !releaseDate) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    const [reminder] = await db
      .insert(remindersTable)
      .values({
        userId: req.userId,
        contentId,
        contentType,
        contentTitle,
        posterUrl: posterUrl || null,
        releaseDate,
      })
      .returning();
    res.status(201).json({ ...reminder, createdAt: reminder.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create reminder");
    res.status(500).json({ error: "Failed to create reminder" });
  }
});

router.delete("/reminders/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    const [deleted] = await db
      .delete(remindersTable)
      .where(and(eq(remindersTable.id, id), eq(remindersTable.userId, req.userId)))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Reminder not found" });
      return;
    }
    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "Failed to delete reminder");
    res.status(500).json({ error: "Failed to delete reminder" });
  }
});

export default router;
