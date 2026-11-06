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

type FetchResponse = {
  ok: boolean;
  status: number;
  body: import("node:stream/web").ReadableStream<Uint8Array> | null;
  headers: {
    get(name: string): string | null;
  };
};

/**
 * Mount on the root Express app.
 * MUST use /api/proxy-download — other routes live under app.use("/api", router).
 *
 * GET /api/proxy-download?url=<cdn>&filename=video.mp4
 */
export function registerProxyDownload(app: any): void {
  const handler = async (req: any, res: any): Promise<void> => {
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
      const upstream = (await fetch(url, {
        headers: {
          Referer: "https://vidlink.pro/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(120000),
      })) as unknown as FetchResponse;

      if (!upstream.ok || !upstream.body) {
        const status = upstream.status || 502;
        const error =
          status === 429
            ? "Source rate-limited. Try again in a minute or pick another quality."
            : status === 403 || status === 401
              ? "Link expired or blocked. Open the title again for a fresh link."
              : `Upstream failed (${status})`;
        res.status(status).json({ error });
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

      const nodeStream = Readable.fromWeb(upstream.body);
      nodeStream.pipe(res);
    } catch {
      if (!res.headersSent) {
        res.status(502).json({ error: "Proxy download failed" });
      }
    }
  };

  // Register both paths so either mount style works
  app.get("/api/proxy-download", handler);
  app.get("/proxy-download", handler);
}
