/**
 * Curious Tech APIs — direct MP4 streams (not torrents)
 *
 * GET /movies/stream/movie?id={imdb_id}
 * GET /movies/stream/tv?id={imdb_id}&season=&episode=
 * GET /full_movie/search?q={query}
 *
 * Auth: X-API-Key  (CURIOUS_API_KEY / CURIOS_API_KEY on Vercel)
 *
 * CDN requires Referer: https://vidlink.pro/ — proxy downloads through
 * your own /api/proxy-download endpoint for browser compatibility.
 */

const CURIOUS_BASE = "https://curiousapis.name.ng";
const STREAM_REFERER = "https://vidlink.pro/";

function apiKey(): string {
  return (
    process.env.CURIOUS_API_KEY ||
    process.env.CURIOS_API_KEY ||
    process.env.VITE_CURIOUS_API_KEY ||
    ""
  );
}

export interface DirectDownload {
  quality: string;
  size: string;
  format: string;
  url: string; // direct CDN mp4 (needs referer) OR your proxy URL
  magnet: string; // always empty for direct downloads
  seeds: number;
  peers: number;
  referer?: string;
}

async function curiousFetch(path: string): Promise<any | null> {
  const key = apiKey();
  if (!key) return null;
  try {
    const res = (await fetch(`${CURIOUS_BASE}${path}`, {
      headers: {
        "X-API-Key": key,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(25000),
    })) as unknown as { ok: boolean; json: () => Promise<any> };
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Prefer lower/medium qualities first for smaller files. */
const QUALITY_ORDER: Record<string, number> = {
  "360p": 0,
  "480p": 1,
  "720p": 2,
  "1080p": 3,
  "4K": 4,
  "4K UHD": 4,
  "2160p": 4,
};

function mapStreams(streams: any[] | undefined): DirectDownload[] {
  if (!Array.isArray(streams) || !streams.length) return [];
  const mapped = streams.map((s) => {
    const quality = String(s.quality || "HD");
    const rawUrl = String(s.url || "");
    return {
      quality,
      size: estimateSize(quality),
      format: "MP4",
      url: rawUrl,
      magnet: "",
      seeds: 0,
      peers: 0,
      referer: s.referer_required || STREAM_REFERER,
    };
  });
  mapped.sort(
    (a, b) =>
      (QUALITY_ORDER[a.quality] ?? 50) - (QUALITY_ORDER[b.quality] ?? 50)
  );
  return mapped;
}

function estimateSize(quality: string): string {
  switch (quality) {
    case "360p":
      return "~200–400 MB";
    case "480p":
      return "~350–700 MB";
    case "720p":
      return "~700 MB–1.5 GB";
    case "1080p":
      return "~1.5–3 GB";
    default:
      return "Varies";
  }
}

export async function searchImdbId(
  title: string,
  year?: number | null,
  preferType: "movie" | "tvSeries" | "any" = "any"
): Promise<string | null> {
  const data = await curiousFetch(
    `/full_movie/search?q=${encodeURIComponent(title)}`
  );
  const results: any[] = data?.results ?? [];
  if (!results.length) return null;

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = norm(title);

  const scored = results.map((r) => {
    let score = 0;
    if (norm(r.title || "") === target) score += 10;
    if (year && Number(r.year) === year) score += 5;
    if (preferType === "movie" && r.type === "movie") score += 3;
    if (
      preferType === "tvSeries" &&
      (r.type === "tvSeries" || r.type === "tv")
    )
      score += 3;
    return { id: r.imdb_id as string, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.id || results[0]?.imdb_id || null;
}

export async function getMovieStreams(
  imdbId: string
): Promise<DirectDownload[]> {
  const id = imdbId.startsWith("tt") ? imdbId : `tt${imdbId}`;
  const data = await curiousFetch(
    `/movies/stream/movie?id=${encodeURIComponent(id)}`
  );
  return mapStreams(data?.streams);
}

export async function getTvStreams(
  imdbId: string,
  season: number,
  episode: number
): Promise<DirectDownload[]> {
  const id = imdbId.startsWith("tt") ? imdbId : `tt${imdbId}`;
  const data = await curiousFetch(
    `/movies/stream/tv?id=${encodeURIComponent(id)}&season=${season}&episode=${episode}`
  );
  return mapStreams(data?.streams);
}

export async function getCuriousMovieLinks(
  title: string,
  year?: number | null,
  imdbId?: string | null
): Promise<DirectDownload[]> {
  if (!apiKey()) return [];
  let id = imdbId || null;
  if (!id) id = await searchImdbId(title, year, "movie");
  if (!id) return [];
  return getMovieStreams(id);
}

export async function getCuriousTvLinks(
  title: string,
  season: number,
  episode: number,
  year?: number | null,
  imdbId?: string | null
): Promise<DirectDownload[]> {
  if (!apiKey()) return [];
  let id = imdbId || null;
  if (!id) id = await searchImdbId(title, year, "tvSeries");
  if (!id) return [];
  return getTvStreams(id, season, episode);
}

export { STREAM_REFERER };
