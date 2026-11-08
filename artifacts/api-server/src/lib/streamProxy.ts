/**
 * GET /api/stream-proxy?url=<cdn>
 * Returns { streamUrl } for the VPS /stream endpoint (secret from server env).
 */
export function registerStreamProxy(app: any): void {
  app.get("/api/stream-proxy", (req: any, res: any): void => {
    const url = String(req.query?.url || "");
    if (!url.startsWith("https://")) {
      res.status(400).json({ error: "Invalid url" });
      return;
    }
    const base = (process.env.DOWNLOAD_VPS_URL || "").replace(/\/$/, "");
    if (!base) {
      res.status(503).json({ error: "DOWNLOAD_VPS_URL not configured" });
      return;
    }
    const secret = process.env.DOWNLOAD_VPS_SECRET || "";
    const q = new URLSearchParams({
      url,
      referer: "https://vidlink.pro/",
    });
    if (secret) q.set("secret", secret);
    res.json({ streamUrl: `${base}/stream?${q.toString()}` });
  });
}
