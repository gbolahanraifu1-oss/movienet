import { Router } from "express";
import animeRouter from "./anime.js";
import seriesRouter from "./series.js";
import calendarRouter from "./calendar.js";
import contactRouter from "./contact.js";
import healthRouter from "./health.js";
import moviesRouter from "./movies.js";
import remindersRouter from "./reminders.js";
import searchRouter from "./search.js";
import sportsRouter from "./sports.js";
import trendingRouter from "./trending.js";

const router = Router();

router.use(healthRouter);
router.use(animeRouter);
router.use(seriesRouter);
router.use(calendarRouter);
router.use(contactRouter);
router.use(moviesRouter);
router.use(remindersRouter);
router.use(searchRouter);
router.use(sportsRouter);
router.use(trendingRouter);

export default router;
