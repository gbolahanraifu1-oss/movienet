/**
 * Vercel catch-all serverless function — forwards all /api/* requests
 * to the Express app.  Vercel preserves the original URL so Express
 * routing (app.use("/api", router) and the Clerk proxy at /api/__clerk)
 * works without any path rewriting.
 */
import app from "../artifacts/api-server/src/app.ts";

export default app;
