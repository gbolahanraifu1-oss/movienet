import { Readable } from "node:stream";

const ALLOWED_HOST_SUFFIXES = [
  "hakunaymatata.com",
  "vidlink.pro",
  "aoneroom.com",
];

function hostAllowed(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== "https:") return false;
    return ALLOWED_HOST_SUFFIXES.some(
      (s) => u.hostname === s || u.hostname.endsWith("." + s)
    );
  } catch {
    return false;
  }
}

/**
 * Mount on the Express app.
 * Path becomes: GET /api/proxy-download?url=&filename=
 *
 * Uses `any` for app/req/res to match the rest of api-server routes and avoid
 * Express vs DOM Request/Response type clashes under tsconfig "types": ["node"].
 */
export function registerProxyDownload(app: any): void {
  app.get("/proxy-download", async (req: any, res: any): Promise<void> => {
    const url = String(req.query?.url || "");
    const filename = String(req.query?.filename || "video.mp4").replace(
      /[^\w.\- ()[\]]+/g,
      "_"
    );

    if (!url || !hostAllowed(url)) {
      res.status(400).json({ error: "Invalid or disallowed url" });
      return;
    }

    try {
      const upstream = await fetch(url, {
        headers: {
          Referer: "https://vidlink.pro/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(120000),
      });

      if (!upstream.ok || !upstream.body) {
        res.status(upstream.status || 502).json({ error: "Upstream failed" });
        return;
      }

      const contentType = upstream.headers.get("content-type") || "video/mp4";
      const contentLength = upstream.headers.get("content-length");
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      if (contentLength) res.setHeader("Content-Length", contentLength);
      res.setHeader("Cache-Control", "private, no-store");

      const nodeStream = Readable.fromWeb(
        upstream.body as import("node:stream/web").ReadableStream
      );
      nodeStream.pipe(res);
    } catch {
      if (!res.headersSent) {
        res.status(502).json({ error: "Proxy download failed" });
      }
    }
  });
}
