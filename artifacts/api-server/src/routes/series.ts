import { Router } from "express";
import { getSeriesList, getAnimeDetail } from "../lib/tmdb.js";

const router = Router();

/**
 * GET /api/series?region=all|kdrama|cdrama|jdrama|western&search=&page=&sort=
 * TV series excluding Animation (anime/cartoons).
 */
router.get("/series", async (req: any, res: any): Promise<void> => {
  try {
    const { region, search, page, sort } = req.query as Record<string, string>;
    const result = await getSeriesList({
      region: region || "all",
      search,
      page: page ? parseInt(page, 10) : 1,
      sort,
    });
    res.json(result);
  } catch (err) {
    req.log?.error?.({ err }, "Failed to list series");
    res.status(500).json({ error: "Failed to fetch series" });
  }
});

/**
 * GET /api/series/:id — TMDB TV detail forced as type "series"
 * (not /api/anime/:id — keeps scraper source=series)
 */
router.get("/series/:id", async (req: any, res: any): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const detail = await getAnimeDetail(String(raw));
    // Force series cluster so frontend never treats SVU etc. as anime
    res.json({
      ...detail,
      type: "series",
    });
  } catch (err) {
    req.log?.error?.({ err }, "Failed to get series");
    res.status(404).json({ error: "Series not found" });
  }
});

export default router;
