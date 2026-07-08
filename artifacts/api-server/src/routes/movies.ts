import { Router, type IRouter } from "express";
import {
  getMovies, getTrendingMoviesList, getMovieDetail,
} from "../lib/tmdb";

const router: IRouter = Router();

router.get("/movies", async (req, res): Promise<void> => {
  try {
    const { genre, search, page, sort } = req.query as Record<string, string>;
    const result = await getMovies({
      genre,
      search,
      page: page ? parseInt(page, 10) : 1,
      sort,
    });
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list movies");
    res.status(500).json({ error: "Failed to fetch movies" });
  }
});

router.get("/movies/trending", async (req, res): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
    const result = await getTrendingMoviesList(limit);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get trending movies");
    res.status(500).json({ error: "Failed to fetch trending movies" });
  }
});

router.get("/movies/:id", async (req, res): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await getMovieDetail(raw);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get movie");
    res.status(404).json({ error: "Movie not found" });
  }
});

export default router;
