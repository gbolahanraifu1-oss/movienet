/**
 * Proxy to scraper API (movies, anime, sports) + HLS play URL builder.
 * Env (preferred):
 *   NKIRI_API_URL=https://movienetapi.hidenplay.net
 *   SCRAPER_API_URL=https://movienetapi.hidenplay.net  (alias)
 *   SCRAPER_API_SECRET / NKIRI_API_SECRET / STREAM_API_SECRET
 */
const DEFAULT_API = "https://movienetapi.hidenplay.net";

function normalizeApiBase(raw: string): string {
  let u = (raw || DEFAULT_API).trim().replace(/\/$/, "");
  // Never serve mixed content: upgrade old plain-http VPS hosts
  if (u.startsWith("http://")) {
    u = "https://" + u.slice("http://".length);
  }
  // Map legacy host → new HTTPS API
  u = u
    .replace(/https?:\/\/pat\.hidencloud\.com:?\d*/gi, DEFAULT_API)
    .replace(/https?:\/\/[^/]*hidencloud\.com:?\d*/gi, DEFAULT_API);
  return u.replace(/\/$/, "") || DEFAULT_API;
}

const SCRAPER = normalizeApiBase(
  process.env.SCRAPER_API_URL ||
    process.env.NKIRI_API_URL ||
    DEFAULT_API
);

const SECRET =
  process.env.SCRAPER_API_SECRET ||
  process.env.NKIRI_API_SECRET ||
  process.env.STREAM_API_SECRET ||
  "";

type FetchRes = {
  ok: boolean;
  status: number;
  json: () => Promise<any>;
};

export function registerMedia(app: any): void {
  app.get("/api/media", async (req: any, res: any): Promise<void> => {
    const q = String(req.query?.q || "").trim();
    const source = String(req.query?.source || "").trim().toLowerCase() || null;
    const episode = req.query?.episode || req.query?.ep || undefined;
    const tmdb = String(req.query?.tmdb || "").trim();

    if (!q && !tmdb) {
      res.status(400).json({ success: false, error: "Missing q or tmdb" });
      return;
    }

    try {
      let url: string;
      if (tmdb && source !== "sports") {
        const path =
          source === "anime" || req.query?.season
            ? `/tv/${encodeURIComponent(tmdb)}/${encodeURIComponent(String(req.query.season || 1))}/${encodeURIComponent(String(episode || 1))}`
            : `/movie/${encodeURIComponent(tmdb)}`;
        url = `${SCRAPER}${path}`;
        if (SECRET) url += `?secret=${encodeURIComponent(SECRET)}`;
      } else {
        const params = new URLSearchParams();
        params.set("q", q);
        if (source) params.set("source", source);
        if (episode != null) params.set("episode", String(episode));
        url = `${SCRAPER}/api/download?${params.toString()}`;
      }

      const r = (await fetch(url, {
        signal: AbortSignal.timeout(120000),
      })) as unknown as FetchRes;
      const data = await r.json().catch(() => ({}));

      if (!r.ok && !data?.success) {
        res.status(r.status || 502).json({
          success: false,
          error: data?.error || "Unavailable",
        });
        return;
      }

      res.json({
        success: true,
        title: data.title,
        source: data.source,
        type: data.type,
        mode: data.mode,
        download: data.download || data.downloadInfo?.url || null,
        downloadInfo: data.downloadInfo || null,
        stream: data.stream || null,
        image: data.image || null,
      });
    } catch (e: any) {
      res.status(502).json({
        success: false,
        error: e?.message || "Unavailable",
      });
    }
  });

  /**
   * Build browser-safe HLS URL (HTTPS only). Secret stays server-side.
   */
  app.get("/api/play-hls", (req: any, res: any): void => {
    const raw = String(req.query?.url || "").trim();
    const referer = String(
      req.query?.referer || "https://megaplay.buzz/"
    ).trim();
    if (!raw || !/^https?:\/\//i.test(raw)) {
      res.status(400).json({ success: false, error: "Missing or invalid url" });
      return;
    }
    const playUrl =
      `${SCRAPER}/stream?url=${encodeURIComponent(raw)}` +
      (SECRET ? `&secret=${encodeURIComponent(SECRET)}` : "") +
      `&referer=${encodeURIComponent(referer)}`;
    res.json({ success: true, playUrl, referer });
  });

  app.get("/api/nkiri", async (req: any, res: any): Promise<void> => {
    const q = String(req.query?.q || "").trim();
    const tmdb = String(req.query?.tmdb || "").trim();
    if (!q && !tmdb) {
      res.status(400).json({ success: false, error: "Missing q or tmdb" });
      return;
    }
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (tmdb && !q) params.set("q", tmdb);
      const year = String(req.query?.year || "").trim();
      if (year) params.set("year", year);

      const r = (await fetch(`${SCRAPER}/api/download?${params.toString()}`, {
        signal: AbortSignal.timeout(90000),
      })) as unknown as FetchRes;
      const data = await r.json().catch(() => ({}));

      if (data?.download) {
        res.json({
          success: true,
          title: data.title || q,
          image: data.image || null,
          download: data.download,
        });
        return;
      }
      if (data?.ok && data?.sources?.[0]?.url) {
        res.json({
          success: true,
          title: data.title || q,
          download: data.sources[0].url,
        });
        return;
      }
      res.status(502).json({
        success: false,
        error: data?.error || "No download link",
      });
    } catch (e: any) {
      res.status(502).json({
        success: false,
        error: e?.message || "Unavailable",
      });
    }
  });
}
