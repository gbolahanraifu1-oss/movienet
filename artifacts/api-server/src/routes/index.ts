import { Router } from "express";
import animeRouter from "./anime";
import calendarRouter from "./calendar";
import contactRouter from "./contact";
import healthRouter from "./health";
import moviesRouter from "./movies";
import remindersRouter from "./reminders";
import searchRouter from "./search";
import sportsRouter from "./sports";
import trendingRouter from "./trending";

const router = Router();

router.use(healthRouter);
router.use(animeRouter);
router.use(calendarRouter);
router.use(contactRouter);
router.use(moviesRouter);
router.use(remindersRouter);
router.use(searchRouter);
router.use(sportsRouter);
router.use(trendingRouter);

export default router;
