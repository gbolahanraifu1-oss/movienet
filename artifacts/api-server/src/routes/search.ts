import { Router, type IRouter } from "express";
import { searchAll, getGenreList } from "../lib/tmdb";

const router: IRouter = Router();

router.get("/search", async (req, res): Promise<void> => {
  try {
    const { q, type, page } = req.query as Record<string, string>;
    if (!q) {
      res.status(400).json({ error: "Missing search query" });
      return;
    }
    const result = await searchAll(q, type || "all", page ? parseInt(page, 10) : 1);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to search");
    res.status(500).json({ error: "Search failed" });
  }
});

router.get("/genres", async (req, res): Promise<void> => {
  try {
    const genres = await getGenreList();
    res.json(genres);
  } catch (err) {
    req.log.error({ err }, "Failed to get genres");
    res.status(500).json({ error: "Failed to fetch genres" });
  }
});

export default router;
