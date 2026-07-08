import { Router, type IRouter } from "express";
import { getUpcomingMovies } from "../lib/tmdb";

const router: IRouter = Router();

router.get("/calendar", async (req, res): Promise<void> => {
  try {
    const { type } = req.query as Record<string, string>;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 30;
    // For now return upcoming movies (anime upcoming requires separate endpoint)
    const movies = await getUpcomingMovies(limit);
    const items = type === "anime" ? [] : movies;
    res.json(items);
  } catch (err) {
    req.log.error({ err }, "Failed to get calendar");
    res.status(500).json({ error: "Failed to fetch calendar" });
  }
});

export default router;
