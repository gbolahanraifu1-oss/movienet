import { Router } from "express";
import { getSportsEventsList, getLiveScoresList, getSportsNewsList } from "../lib/sports";

const router = Router();

router.get("/sports/events", async (req: any, res: any): Promise<void> => {
  try {
    const { league } = req.query as Record<string, string>;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
    const result = await getSportsEventsList({ league, limit });
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get sports events");
    res.status(500).json({ error: "Failed to fetch sports events" });
  }
});

router.get("/sports/scores", async (req: any, res: any): Promise<void> => {
  try {
    const { league } = req.query as Record<string, string>;
    const result = await getLiveScoresList({ league });
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get scores");
    res.status(500).json({ error: "Failed to fetch scores" });
  }
});

router.get("/sports/news", async (req: any, res: any): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
    const result = await getSportsNewsList(limit);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get sports news");
    res.status(500).json({ error: "Failed to fetch sports news" });
  }
});

export default router;
