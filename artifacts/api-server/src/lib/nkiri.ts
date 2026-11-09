/**
 * Proxy to Nkiri VPS scraper.
 * Env: NKIRI_API_URL=http://pat.hidencloud.com:24622
 */
const NKIRI_API = (
  process.env.NKIRI_API_URL || "http://pat.hidencloud.com:24622"
).replace(/\/$/, "");

type FetchRes = { ok: boolean; status: number; json: () => Promise<any> };

export function registerNkiri(app: any): void {
  app.get("/api/nkiri", async (req: any, res: any): Promise<void> => {
    const q = String(req.query?.q || "").trim();
    const tmdb = String(req.query?.tmdb || "").trim();

    if (!q && !tmdb) {
      res.status(400).json({ success: false, error: "Missing q or tmdb" });
      return;
    }

    try {
      let url: string;
      if (tmdb) {
        // Prefer TMDB-id route on VPS if available
        url = `${NKIRI_API}/movie/${encodeURIComponent(tmdb)}`;
        const secret = process.env.NKIRI_API_SECRET || process.env.STREAM_API_SECRET || "";
        if (secret) url += `?secret=${encodeURIComponent(secret)}`;
      } else {
        url = `${NKIRI_API}/api/download?q=${encodeURIComponent(q)}`;
      }

      const r = (await fetch(url, {
        signal: AbortSignal.timeout(90000),
      })) as unknown as FetchRes;

      const data = await r.json().catch(() => ({}));

      // Normalize both VPS shapes
      if (data?.download) {
        res.json({
          success: true,
          title: data.title || q,
          image: data.image || null,
          download: data.download,
        });
        return;
      }
      if (data?.ok && Array.isArray(data.sources) && data.sources[0]?.url) {
        res.json({
          success: true,
          title: data.title || q,
          image: data.image || null,
          download: data.sources[0].url,
        });
        return;
      }

      res.status(502).json({
        success: false,
        error: data?.error || "No download link from Nkiri API",
      });
    } catch (e: any) {
      res.status(502).json({
        success: false,
        error: e?.message || "Nkiri API unreachable",
      });
    }
  });
}
