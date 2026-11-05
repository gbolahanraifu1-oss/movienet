/**
 * Curious Tech APIs — Full Movie torrent magnets
 * Docs catalogue: https://curiousapis.name.ng
 *
 * Auth: X-API-Key header (set CURIOS_API_KEY or CURIOUS_API_KEY on Vercel)
 *
 * Endpoints used:
 *   GET /full_movie/search?q={query}
 *   GET /full_movie/download/movie?id={imdb_id}&limit=&quality=&sort=
 *   GET /full_movie/download/tv?id={imdb_id}&season=&episode=&limit=
 */

const CURIOUS_BASE = "https://curiousapis.name.ng";

function apiKey(): string {
  return (
    process.env.CURIOUS_API_KEY ||
    process.env.CURIOS_API_KEY ||
    process.env.VITE_CURIOUS_API_KEY ||
    ""
  );
}

export interface CuriousTorrent {
  quality: string;
  size: string;
  format: string;
  url: string; // magnet or http
  magnet: string;
  seeds: number;
  peers: number;
}

interface CuriousResult {
  name?: string;
  quality?: string;
  size?: string;
  size_bytes?: number;
  seeders?: number;
  leechers?: number;
  download_url?: string;
  source?: string;
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
      signal: AbortSignal.timeout(20000),
    })) as unknown as { ok: boolean; status: number; json: () => Promise<any> };
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function mapResults(results: CuriousResult[] | undefined): CuriousTorrent[] {
  if (!Array.isArray(results) || !results.length) return [];
  return results.map((r) => {
    const magnet = (r.download_url || "").startsWith("magnet:")
      ? r.download_url!
      : "";
    const url = r.download_url || "";
    const quality = (r.quality && r.quality !== "unknown" ? r.quality : "HD").replace(
      /^2160p$/i,
      "4K UHD"
    );
    return {
      quality,
      size: r.size || "Unknown",
      format: r.source ? `Torrent · ${r.source}` : "Torrent",
      url,
      magnet,
      seeds: r.seeders ?? 0,
      peers: r.leechers ?? 0,
    };
  });
}

/** Resolve an IMDb id via Curious search (title + optional year). */
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
    if (preferType !== "any" && r.type === preferType) score += 3;
    if (preferType === "movie" && r.type === "movie") score += 1;
    if (preferType === "tvSeries" && (r.type === "tvSeries" || r.type === "tv"))
      score += 1;
    return { id: r.imdb_id as string, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.id || results[0]?.imdb_id || null;
}

/** Movie torrent magnets by IMDb id. */
export async function getMovieTorrents(
  imdbId: string,
  opts: { limit?: number; quality?: string; sort?: string } = {}
): Promise<CuriousTorrent[]> {
  const limit = opts.limit ?? 8;
  const quality = opts.quality ?? "any";
  const sort = opts.sort ?? "seeders";
  const id = imdbId.startsWith("tt") ? imdbId : `tt${imdbId}`;
  const data = await curiousFetch(
    `/full_movie/download/movie?id=${encodeURIComponent(id)}&limit=${limit}&quality=${encodeURIComponent(quality)}&sort=${encodeURIComponent(sort)}`
  );
  return mapResults(data?.results);
}

/** TV episode torrent magnets. */
export async function getTvTorrents(
  imdbId: string,
  season: number,
  episode: number,
  limit = 8
): Promise<CuriousTorrent[]> {
  const id = imdbId.startsWith("tt") ? imdbId : `tt${imdbId}`;
  const data = await curiousFetch(
    `/full_movie/download/tv?id=${encodeURIComponent(id)}&season=${season}&episode=${episode}&limit=${limit}`
  );
  return mapResults(data?.results);
}

/**
 * Best-effort movie links: use IMDb id if known, otherwise search by title.
 */
export async function getCuriousMovieLinks(
  title: string,
  year?: number | null,
  imdbId?: string | null
): Promise<CuriousTorrent[]> {
  if (!apiKey()) return [];
  let id = imdbId || null;
  if (!id) id = await searchImdbId(title, year, "movie");
  if (!id) return [];
  return getMovieTorrents(id);
}

export async function getCuriousTvLinks(
  title: string,
  season: number,
  episode: number,
  year?: number | null,
  imdbId?: string | null
): Promise<CuriousTorrent[]> {
  if (!apiKey()) return [];
  let id = imdbId || null;
  if (!id) id = await searchImdbId(title, year, "tvSeries");
  if (!id) return [];
  return getTvTorrents(id, season, episode);
}
