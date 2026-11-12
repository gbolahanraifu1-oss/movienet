/**
 * Scraper + stream proxy.
 * Browser only talks to https://movienet.dpdns.org (same origin).
 * Server talks to SCRAPER over HTTPS.
 *
 * Env:
 *   NKIRI_API_URL=https://movienetapi.hidenplay.net
 *   SCRAPER_API_SECRET / NKIRI_API_SECRET / STREAM_API_SECRET
 */
const DEFAULT_API = "https://movienetapi.hidenplay.net";

function normalizeApiBase(raw: string): string {
  let u = String(raw || DEFAULT_API).trim().replace(/\/$/, "");
  // Always HTTPS — mixed content kills the player
  u = u.replace(/^http:\/\//i, "https://");
  if (!/^https:\/\//i.test(u)) {
    u = "https://" + u.replace(/^\/+/, "");
  }
  // Legacy hosts
  u = u
    .replace(/https:\/\/pat\.hidencloud\.com:?\d*/gi, DEFAULT_API)
    .replace(/https:\/\/[^/]*hidencloud\.com:?\d*/gi, DEFAULT_API);
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
  headers?: { get?: (k: string) => string | null };
  body?: any;
  text?: () => Promise<string>;
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

      // Prefer download file; expose stream for HLS
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
   * Returns a SAME-ORIGIN play URL so the browser never hits http:// VPS.
   * Video.js loads: /api/stream-proxy?url=...&referer=...
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
    // Same-origin path — always HTTPS on movienet.dpdns.org
    const playUrl =
      `/api/stream-proxy?url=${encodeURIComponent(raw)}` +
      `&referer=${encodeURIComponent(referer)}`;
    res.json({ success: true, playUrl, referer });
  });

  /**
   * Server-side HLS proxy → VPS /stream (HTTPS) → player.
   * Rewrites playlist segment lines back through this proxy.
   */
  app.get("/api/stream-proxy", async (req: any, res: any): Promise<void> => {
    const raw = String(req.query?.url || "").trim();
    const referer = String(
      req.query?.referer || "https://megaplay.buzz/"
    ).trim();
    if (!raw || !/^https?:\/\//i.test(raw)) {
      res.status(400).send("Missing url");
      return;
    }

    const vpsStream =
      `${SCRAPER}/stream?url=${encodeURIComponent(raw)}` +
      (SECRET ? `&secret=${encodeURIComponent(SECRET)}` : "") +
      `&referer=${encodeURIComponent(referer)}`;

    try {
      const fetchFn = (globalThis as any).fetch as (
        input: string,
        init?: any
      ) => Promise<any>;

      const upstream = await fetchFn(vpsStream, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        },
        signal: AbortSignal.timeout(60000),
      });

      if (!upstream.ok) {
        res.status(upstream.status || 502).send("Upstream stream failed");
        return;
      }

      const ct = String(
        upstream.headers?.get?.("content-type") ||
          upstream.headers?.["content-type"] ||
          ""
      ).toLowerCase();

      const isPlaylist =
        raw.includes(".m3u8") ||
        ct.includes("mpegurl") ||
        ct.includes("application/vnd.apple.mpegurl") ||
        ct.includes("application/x-mpegurl");

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "no-store");

      if (isPlaylist) {
        const text: string = await upstream.text();
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");

        const base = new URL(raw);
        const rewritten = text
          .split("\n")
          .map((line: string) => {
            const t = line.trim();
            if (!t || t.startsWith("#")) return line;
            let abs = t;
            if (!t.startsWith("http")) {
              try {
                abs = new URL(t, base).href;
              } catch {
                return line;
              }
            }
            return `/api/stream-proxy?url=${encodeURIComponent(abs)}&referer=${encodeURIComponent(referer)}`;
          })
          .join("\n");

        res.send(rewritten);
        return;
      }

      // Binary segment / key / mp4
      res.setHeader(
        "Content-Type",
        ct || "application/octet-stream"
      );
      if (upstream.body && typeof upstream.body.pipe === "function") {
        upstream.body.pipe(res);
      } else if (upstream.body && typeof upstream.body.getReader === "function") {
        const buf = Buffer.from(await upstream.arrayBuffer());
        res.send(buf);
      } else {
        const buf = Buffer.from(await upstream.arrayBuffer());
        res.send(buf);
      }
    } catch (e: any) {
      res.status(502).send(e?.message || "Stream proxy error");
    }
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
      else if (tmdb) params.set("q", tmdb);
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
