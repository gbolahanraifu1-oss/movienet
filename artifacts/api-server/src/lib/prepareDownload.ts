import { remoteUploadToPixeldrain, hasPixeldrainKey } from "./pixeldrain.js";

async function handlePrepare(req: any, res: any): Promise<void> {
  const url = String(req.body?.url || req.query?.url || "");
  const filename = String(req.body?.filename || req.query?.filename || "video.mp4");

  if (!url.startsWith("https://")) {
    res.status(400).json({ error: "Invalid url" });
    return;
  }

  if (!hasPixeldrainKey()) {
    res.status(503).json({
      error:
        "PIXELDRAIN_API_KEY not configured. Downloads need PixelDrain until a VPS source is available.",
      mode: "none",
    });
    return;
  }

  const pd = await remoteUploadToPixeldrain(url, filename);

  if (pd.ok) {
    res.json({
      mode: "pixeldrain",
      downloadUrl: pd.downloadUrl,
      pageUrl: pd.pageUrl,
      id: pd.id,
    });
    return;
  }

  // Do NOT fall back to proxy-download — that hits the same CDN and always 429s.
  // Surface the real error so the Download page can show it.
  const isRateLimit =
    pd.status === 429 ||
    /rate-?limit|429/i.test(pd.error || "");

  res.status(isRateLimit ? 429 : 502).json({
    mode: "failed",
    error: pd.error,
    pixeldrainStatus: pd.status ?? null,
    hint: isRateLimit
      ? "The movie CDN is rate-limiting server IPs. Wait 10–30 minutes, try 360p, or use Watch instead of Download."
      : "Rehost failed. Try again later or use an in-page stream if available.",
  });
}

/** POST or GET /api/prepare-download */
export function registerPrepareDownload(app: any): void {
  app.post("/api/prepare-download", handlePrepare);
  app.get("/api/prepare-download", handlePrepare);
}
