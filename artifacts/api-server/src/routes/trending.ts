import { Router } from "express";
import { getTrendingAll } from "../lib/tmdb";

const router = Router();

router.get("/trending", async (req, res): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 40;
    const result = await getTrendingAll(limit);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get trending");
    res.status(500).json({ error: "Failed to fetch trending" });
  }
});

export default router;
