/**
 * Proxy to VPS scraper — matches clusters: movie | anime | series | sports
 * Env: NKIRI_API_URL / SCRAPER_API_URL = https://movienetapi.hidenplay.net
 *      STREAM_API_SECRET / SCRAPER_API_SECRET
 */
const DEFAULT_API = "https://movienetapi.hidenplay.net";

function normalizeApiBase(raw: string): string {
  let u = String(raw || DEFAULT_API).trim().replace(/\/$/, "");
  u = u.replace(/^http:\/\//i, "https://");
  if (!/^https:\/\//i.test(u)) u = "https://" + u.replace(/^\/+/, "");
  u = u
    .replace(/https:\/\/pat\.hidencloud\.com:?\d*/gi, DEFAULT_API)
    .replace(/https:\/\/[^/]*hidencloud\.com:?\d*/gi, DEFAULT_API);
  return u.replace(/\/$/, "") || DEFAULT_API;
}

const SCRAPER = normalizeApiBase(
  process.env.SCRAPER_API_URL || process.env.NKIRI_API_URL || DEFAULT_API
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

/** Map any frontend label → VPS cluster name */
function normalizeSource(raw: string | null | undefined): string {
  const s = String(raw || "movie").toLowerCase().trim();
  if (s === "anime" || s === "animepahe") return "anime";
  if (s === "sports" || s === "sport") return "sports";
  if (s === "series" || s === "tv" || s === "o2" || s === "o2tvseries") return "series";
  if (s === "nkiri" || s === "netnaija" || s === "movie") return "movie";
  return "movie";
}

function normalizePayload(data: any, fallbackTitle = ""): Record<string, any> {
  const download =
    data?.downloadInfo?.url ||
    data?.download ||
    data?.sources?.[0]?.url ||
    null;
  let stream = data?.stream || null;
  if (stream && typeof stream === "object" && !stream.url && download) {
    stream = { ...stream, url: download };
  }
  if (
    !stream &&
    download &&
    (data?.mode === "hls" || data?.type === "hls" || /\.m3u8(\?|$)/i.test(String(download)))
  ) {
    stream = {
      mode: "hls",
      url: download,
      referer: data?.referer || "https://iptv-org.github.io/",
      source: data?.source,
    };
  }
  if (!stream && download && /\.(mp4|mkv|webm)(\?|$)/i.test(String(download))) {
    stream = {
      mode: "direct",
      url: download,
      referer: data?.stream?.referer || "https://thenkiri.com/",
      source: data?.source,
    };
  }
  return {
    success: true,
    ok: true,
    title: data?.title || fallbackTitle,
    source: data?.source || null,
    type: data?.type || null,
    mode: data?.mode || (stream?.mode === "hls" ? "hls" : "direct"),
    download,
    downloadInfo: data?.downloadInfo || (download ? { mode: "direct", url: download } : null),
    stream,
    image: data?.image || null,
    season: data?.season,
    episode: data?.episode,
  };
}

export function registerMedia(app: any): void {
  app.get("/api/media", async (req: any, res: any): Promise<void> => {
    const q = String(req.query?.q || "").trim();
    const source = normalizeSource(
      req.query?.source || req.query?.category || "movie"
    );
    const episode = String(req.query?.episode || req.query?.ep || "1");
    const season = String(req.query?.season || "1");
    const tmdb = String(req.query?.tmdb || req.query?.id || "").trim();

    if (!q && !tmdb) {
      res.status(400).json({ success: false, error: "Missing q or tmdb" });
      return;
    }

    try {
      let url: string;

      // Prefer /api/download — same path as local cache keys (source:query:ep:s)
      // TMDB routes only when we have id and no title (rare)
      if (q) {
        const params = new URLSearchParams();
        params.set("q", q);
        params.set("source", source);
        if (source === "anime" || source === "series" || source === "sports") {
          params.set("episode", episode);
          params.set("season", season);
        }
        url = `${SCRAPER}/api/download?${params.toString()}`;
      } else if (tmdb && source !== "sports") {
        if (source === "anime" || source === "series") {
          const qs = new URLSearchParams();
          if (SECRET) qs.set("secret", SECRET);
          qs.set("source", source);
          url = `${SCRAPER}/tv/${encodeURIComponent(tmdb)}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}?${qs.toString()}`;
        } else {
          url = `${SCRAPER}/movie/${encodeURIComponent(tmdb)}`;
          if (SECRET) url += `?secret=${encodeURIComponent(SECRET)}`;
        }
      } else {
        res.status(400).json({ success: false, error: "Missing q" });
        return;
      }

      const r = (await fetch(url, {
        signal: AbortSignal.timeout(55000),
      })) as unknown as FetchRes;
      const data = await r.json().catch(() => ({}));

      if (!r.ok && !data?.success && !data?.ok) {
        res.status(r.status || 404).json({
          success: false,
          error: data?.error || "Unavailable",
        });
        return;
      }

      if (!data?.success && !data?.ok && !data?.download && !data?.stream) {
        res.status(404).json({
          success: false,
          error: data?.error || "Not found",
        });
        return;
      }

      res.json(normalizePayload(data, q));
    } catch (e: any) {
      res.status(502).json({
        success: false,
        error: e?.message || "Unavailable",
      });
    }
  });

  /** Direct VPS HLS URL for the player (no Vercel body proxy) */
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
    res.json({ success: true, playUrl: playUrl.replace(/^http:\/\//i, "https://"), referer });
  });

  app.get("/api/nkiri", async (req: any, res: any): Promise<void> => {
    const q = String(req.query?.q || "").trim();
    if (!q) {
      res.status(400).json({ success: false, error: "Missing q" });
      return;
    }
    try {
      const params = new URLSearchParams();
      params.set("q", q);
      params.set("source", "movie");
      const r = (await fetch(`${SCRAPER}/api/download?${params.toString()}`, {
        signal: AbortSignal.timeout(55000),
      })) as unknown as FetchRes;
      const data = await r.json().catch(() => ({}));
      if (data?.success || data?.download) {
        res.json(normalizePayload(data, q));
        return;
      }
      res.status(404).json({ success: false, error: data?.error || "No download link" });
    } catch (e: any) {
      res.status(502).json({ success: false, error: e?.message || "Unavailable" });
    }
  });
}
