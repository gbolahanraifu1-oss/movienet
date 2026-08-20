import { Router } from "express";
import {
  getAnimeList, getTrendingAnimeList, getAnimeDetail,
} from "../lib/tmdb.js";

const router = Router();

router.get("/anime", async (req: any, res: any): Promise<void> => {
  try {
    const { genre, search, page, sort } = req.query as Record<string, string>;
    const result = await getAnimeList({
      genre,
      search,
      page: page ? parseInt(page, 10) : 1,
      sort,
    });
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list anime");
    res.status(500).json({ error: "Failed to fetch anime" });
  }
});

router.get("/anime/trending", async (req: any, res: any): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
    const result = await getTrendingAnimeList(limit);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get trending anime");
    res.status(500).json({ error: "Failed to fetch trending anime" });
  }
});

router.get("/anime/:id", async (req: any, res: any): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await getAnimeDetail(raw);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get anime");
    res.status(404).json({ error: "Anime not found" });
  }
});

export default router;
