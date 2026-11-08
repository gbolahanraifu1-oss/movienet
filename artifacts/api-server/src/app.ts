import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import pinoHttp from "pino-http";
import type { IncomingMessage, ServerResponse } from "node:http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware.js";
import { registerProxyDownload } from "./lib/proxyDownload.js";
import { registerPrepareDownload } from "./lib/prepareDownload.js";
import { registerStreamProxy } from "./lib/streamProxy.js";


const app = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: IncomingMessage) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: ServerResponse) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Clerk Frontend API proxy must run before body parsers so authentication
// requests and callbacks are forwarded untouched in production.
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Populate Clerk auth context before protected API routes run.
const clerkPublishableKey =
  process.env.CLERK_PUBLISHABLE_KEY ?? process.env.VITE_CLERK_PUBLISHABLE_KEY;
app.use(clerkMiddleware({ publishableKey: clerkPublishableKey }));

// Direct-file download helpers (must be registered once only)
registerProxyDownload(app);
registerPrepareDownload(app);
registerStreamProxy(app);

app.use("/api", router);

export default app;
