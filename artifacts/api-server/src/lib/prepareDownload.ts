import { remoteUploadToPixeldrain, hasPixeldrainKey } from "./pixeldrain.js";

async function handlePrepare(req: any, res: any): Promise<void> {
  const url = String(req.body?.url || req.query?.url || "");
  const filename = String(req.body?.filename || req.query?.filename || "video.mp4");

  if (!url.startsWith("https://")) {
    res.status(400).json({ error: "Invalid url" });
    return;
  }

  if (hasPixeldrainKey()) {
    const pd = await remoteUploadToPixeldrain(url, filename);
    if (pd) {
      res.json({
        mode: "pixeldrain",
        downloadUrl: pd.downloadUrl,
        pageUrl: pd.pageUrl,
        id: pd.id,
      });
      return;
    }
  }

  const params = new URLSearchParams({ url, filename });
  res.json({
    mode: "proxy",
    downloadUrl: `/api/proxy-download?${params.toString()}`,
    warning: hasPixeldrainKey()
      ? "PixelDrain upload failed; using proxy (may rate-limit)."
      : "Set PIXELDRAIN_API_KEY for stable downloads.",
  });
}

/**
 * POST or GET /api/prepare-download
 * Body/query: url, filename
 */
export function registerPrepareDownload(app: any): void {
  app.post("/api/prepare-download", handlePrepare);
  app.get("/api/prepare-download", handlePrepare);
}
