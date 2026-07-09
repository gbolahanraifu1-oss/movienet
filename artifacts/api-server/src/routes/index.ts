import { Router } from "express";
import healthRouter from "./health";
import moviesRouter from "./movies";
import animeRouter from "./anime";
import trendingRouter from "./trending";
import sportsRouter from "./sports";
import calendarRouter from "./calendar";
import searchRouter from "./search";
import remindersRouter from "./reminders";
import contactRouter from "./contact";

const router = Router();

router.use(healthRouter);
router.use(moviesRouter);
router.use(animeRouter);
router.use(trendingRouter);
router.use(sportsRouter);
router.use(calendarRouter);
router.use(searchRouter);
router.use(remindersRouter);
router.use(contactRouter);

export default router;
