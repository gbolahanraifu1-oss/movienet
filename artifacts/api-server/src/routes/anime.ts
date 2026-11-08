
import { Router } from "express";
import {
  getAnimeList, getTrendingAnimeList, getAnimeDetail, resolveEpisodeDownloads,
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

/** Episode quality links for download/stream (season + episode required) */
router.get("/anime/:id/episode-links", async (req: any, res: any): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const season = parseInt(String(req.query.season || "1"), 10);
    const episode = parseInt(String(req.query.episode || "1"), 10);
    const detail = await getAnimeDetail(String(raw));
    const links = await resolveEpisodeDownloads(
      detail.title,
      season,
      episode,
      detail.year,
      (detail as any).imdbId
    );
    res.json({
      id: detail.id,
      title: detail.title,
      season,
      episode,
      downloadLinks: links,
    });
  } catch (err) {
    req.log?.error?.({ err }, "Failed episode links");
    res.status(404).json({ error: "Episode links not found", downloadLinks: [] });
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
