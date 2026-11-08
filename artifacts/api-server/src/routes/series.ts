
import { Router } from "express";
import { getSeriesList } from "../lib/tmdb.js";

const router = Router();

/**
 * GET /api/series?region=all|kdrama|cdrama|jdrama|western&search=&page=&sort=
 * TV series excluding Animation (anime/cartoons).
 * Cards use type "anime" so existing /title/anime/:id works for seasons/episodes.
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

export default router;
