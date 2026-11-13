import {
  getCuriousMovieLinks,
  getCuriousTvLinks,
  type DirectDownload,
} from "./curious.js";

/** Unified download row for title detail (streams or empty). */
type DownloadLink = DirectDownload;

/** Episode download/stream links via Curious TV endpoint */
export async function resolveEpisodeDownloads(
  title: string,
  season: number,
  episode: number,
  year?: number | null,
  imdbId?: string | null
) {
  return getCuriousTvLinks(title, season, episode, year, imdbId);
}

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const API_KEY = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY || "";


async function resolveMovieDownloads(
  title: string,
  year?: number | null,
  imdbId?: string | null
): Promise<DownloadLink[]> {
  // Direct MP4 streams via Curious (not torrents)
  return getCuriousMovieLinks(title, year, imdbId);
}

export function posterUrl(path: string | null | undefined, size = "w500"): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function backdropUrl(path: string | null | undefined, size = "w1280"): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

async function tmdbFetch(endpoint: string, params: Record<string, string | number> = {}): Promise<any> {
  if (!API_KEY) throw new Error("TMDB_API_KEY not configured");
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set("api_key", API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = (await fetch(url.toString())) as unknown as {
    ok: boolean;
    status: number;
    json: () => Promise<any>;
  };
  if (!res.ok) throw new Error(`TMDB error ${res.status}: ${endpoint}`);
  return res.json();
}

export interface TmdbMovie {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  genres?: Array<{ id: number; name: string }>;
  overview?: string;
  runtime?: number;
  status?: string;
  tagline?: string;
  videos?: { results: TmdbVideo[] };
  credits?: { cast: TmdbCastMember[] };
  similar?: { results: TmdbMovie[] };
  recommendations?: { results: TmdbMovie[] };
  media_type?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  seasons?: Array<{
    id: number;
    name: string;
    season_number: number;
    episode_count: number;
    air_date?: string | null;
    poster_path?: string | null;
    overview?: string;
  }>;
}

export interface TmdbVideo {
  type: string;
  site: string;
  key: string;
}

export interface TmdbCastMember {
  name: string;
  character?: string;
  profile_path?: string | null;
}

export const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Sci-Fi", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News",
  10764: "Reality", 10765: "Sci-Fi & Fantasy", 10766: "Soap",
  10767: "Talk", 10768: "War & Politics",
};

function mapGenreIds(ids: number[] = []): string[] {
  return ids.map(id => GENRE_MAP[id] || "Other").filter(Boolean);
}

function trailerUrl(videos?: { results: TmdbVideo[] }): string | null {
  if (!videos) return null;
  const trailer = videos.results.find(v => v.type === "Trailer" && v.site === "YouTube");
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

export async function getMovies(params: {
  genre?: string; search?: string; page?: number; sort?: string;
}) {
  try {
    const page = params.page || 1;
    const genreId = params.genre ? getGenreIdByName(params.genre) : undefined;

    if (params.search) {
      const data = await tmdbFetch("/search/movie", { query: params.search, page });
      return formatMovieList(data, "movie");
    }

    const sortMap: Record<string, string> = {
      popular: "popularity.desc", latest: "release_date.desc",
      rating: "vote_average.desc", title: "original_title.asc",
    };
    const sortBy = sortMap[params.sort || "popular"] || "popularity.desc";
    const fetchParams: Record<string, string | number> = { page, sort_by: sortBy };
    if (genreId) fetchParams.with_genres = genreId;
    // Exclude TMDB "TV Movie"
    fetchParams.without_genres = 10770;
    if (params.sort === "rating") fetchParams["vote_count.gte"] = 100;

    const data = await tmdbFetch("/discover/movie", fetchParams);
    // /genre/Animation & Movies→Animation = cartoons / non-Japanese animated films
    if ((params.genre || "").toLowerCase() === "animation") {
      const filtered = {
        ...data,
        results: (data.results || []).filter(
          (m: TmdbMovie) => (m as any).original_language !== "ja"
        ),
      };
      return formatMovieList(filtered, "movie");
    }
    return formatMovieList(data, "movie");
  } catch {
    const movies = getMockMovies();
    const filtered = params.genre
      ? movies.filter(m => m.genres.some(g => g.toLowerCase() === params.genre!.toLowerCase()))
      : movies;
    const searched = params.search
      ? filtered.filter(m => m.title.toLowerCase().includes(params.search!.toLowerCase()))
      : filtered;
    const page = params.page || 1;
    const pageSize = 20;
    const start = (page - 1) * pageSize;
    return { items: searched.slice(start, start + pageSize), total: searched.length, page, totalPages: Math.max(1, Math.ceil(searched.length / pageSize)) };
  }
}

export async function getTrendingMoviesList(limit = 20) {
  try {
    const data = await tmdbFetch("/trending/movie/week");
    return (data.results || []).slice(0, limit).map((m: TmdbMovie) => formatMovie(m, "movie"));
  } catch {
    return getMockMovies().slice(0, limit);
  }
}

export async function getMovieDetail(id: string) {
  const normalizedId = decodeURIComponent(String(id)).trim();
  // Mock list items use stable non-TMDB ids. Resolve those locally instead of
  // sending an invalid id to TMDB and risking a failed detail request.
  const mock = getMockMovies().find((movie) => movie.id === normalizedId);
  if (mock) {
    const links = mock.isReleased ? await resolveMovieDownloads(mock.title, mock.year) : [];
    return {
      ...mock,
      trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      runtime: 148,
      status: "Released",
      tagline: "An epic adventure awaits.",
      cast: getMockCast(),
      similar: getMockMovies().slice(0, 6),
      downloadLinks: links.length ? links : generateDownloadLinks(mock.title, "movie"),
    };
  }

  try {
    const data = await tmdbFetch(`/movie/${id}`, {
      append_to_response: "videos,credits,similar,recommendations,external_ids",
    });
    const detail = formatMovieDetail(data, "movie");
    // Curious streams or mock sizes
    if (detail.isReleased) {
      const links = await resolveMovieDownloads(
        detail.title,
        detail.year,
        (detail as any).imdbId
      );
      if (links.length) detail.downloadLinks = links;
    }
    return detail;
  } catch {
    const mock = getMockMovies().find(m => m.id === id) || getMockMovies()[0];
    const links = mock.isReleased ? await resolveMovieDownloads(mock.title, mock.year) : [];
    return {
      ...mock,
      trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      runtime: 148,
      status: "Released",
      tagline: "An epic adventure awaits.",
      cast: getMockCast(),
      similar: getMockMovies().slice(0, 6),
      downloadLinks: links.length ? links : generateDownloadLinks(mock.title, "movie"),
    };
  }
}

export async function getAnimeList(params: {
  genre?: string; search?: string; page?: number; sort?: string;
}) {
  try {
    const page = params.page || 1;
    if (params.search) {
      const data = await tmdbFetch("/search/tv", { query: params.search, page });
      // Anime only: Animation + Japanese (not Western cartoons)
      const jaOnly = (data.results || []).filter((r: TmdbMovie) =>
        isJapaneseAnimeResult(r)
      );
      return formatMovieList({ ...data, results: jaOnly }, "anime");
    }
    const sortMap: Record<string, string> = {
      popular: "popularity.desc", latest: "first_air_date.desc",
      rating: "vote_average.desc", title: "original_name.asc",
    };
    const sortBy = sortMap[params.sort || "popular"] || "popularity.desc";
    // Anime = TV Animation + Japanese language (excludes Western cartoons / "manga" style dumps)
    const fetchParams: Record<string, string | number> = {
      page,
      sort_by: sortBy,
      with_genres: 16,
      with_original_language: "ja",
    };
    if (params.sort === "rating") fetchParams["vote_count.gte"] = 50;
    const data = await tmdbFetch("/discover/tv", fetchParams);
    return formatMovieList(data, "anime");
  } catch {
    const anime = getMockAnime();
    const filtered = params.genre
      ? anime.filter(a => a.genres.some(g => g.toLowerCase() === params.genre!.toLowerCase()))
      : anime;
    const searched = params.search
      ? filtered.filter(a => a.title.toLowerCase().includes(params.search!.toLowerCase()))
      : filtered;
    const page = params.page || 1;
    const pageSize = 20;
    const start = (page - 1) * pageSize;
    return { items: searched.slice(start, start + pageSize), total: searched.length, page, totalPages: Math.max(1, Math.ceil(searched.length / pageSize)) };
  }
}

export async function getTrendingAnimeList(limit = 20) {
  try {
    const data = await tmdbFetch("/discover/tv", {
      with_genres: 16,
      with_original_language: "ja",
      sort_by: "popularity.desc",
      page: 1,
    });
    return (data.results || []).slice(0, limit).map((m: TmdbMovie) => formatMovie(m, "anime"));
  } catch {
    return getMockAnime().slice(0, limit);
  }
}

export async function getAnimeDetail(id: string) {
  const normalizedId = decodeURIComponent(String(id)).trim();
  const localAnime = getMockAnime().find((anime) => anime.id === normalizedId);
  if (localAnime) {
    return {
      ...localAnime,
      trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      runtime: 24,
      status: "Returning Series",
      tagline: "The legend continues.",
      cast: getMockCast(),
      similar: getMockAnime().slice(0, 6),
      downloadLinks: [] as DownloadLink[],
      numberOfSeasons: 2,
      numberOfEpisodes: 24,
      seasons: [
        { id: "s1", name: "Season 1", seasonNumber: 1, episodeCount: 12, airDate: null, posterUrl: localAnime.posterUrl, overview: null },
        { id: "s2", name: "Season 2", seasonNumber: 2, episodeCount: 12, airDate: null, posterUrl: localAnime.posterUrl, overview: null },
      ],
    };
  }

  try {
    const data = await tmdbFetch(`/tv/${id}`, {
      append_to_response: "videos,credits,similar,recommendations,external_ids",
    });
    const detailType: "anime" | "series" = isJapaneseAnimeResult({
      ...data,
      genre_ids: (data.genres || []).map((g: any) => g.id),
      original_language: data.original_language,
      origin_country: data.origin_country,
    } as TmdbMovie)
      ? "anime"
      : "series";
    const detail = formatMovieDetail(data, detailType);
    // Series use seasons/episodes UI — skip movie packs for anime.
    detail.downloadLinks = [];
    return detail;
  } catch {
    const mock = getMockAnime().find(a => a.id === id) || getMockAnime()[0];
    return {
      ...mock,
      trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      runtime: 24,
      status: "Returning Series",
      tagline: "The legend continues.",
      cast: getMockCast(),
      similar: getMockAnime().slice(0, 6),
      downloadLinks: [] as DownloadLink[],
      numberOfSeasons: 2,
      numberOfEpisodes: 24,
      seasons: [
        { id: "s1", name: "Season 1", seasonNumber: 1, episodeCount: 12, airDate: null, posterUrl: mock.posterUrl, overview: null },
        { id: "s2", name: "Season 2", seasonNumber: 2, episodeCount: 12, airDate: null, posterUrl: mock.posterUrl, overview: null },
      ],
    };
  }
}


/** Non-anime TV series (excludes Animation genre 16). */
export async function getSeriesList(params: {
  region?: string; // "all" | "kdrama" | "cdrama" | "jdrama" | "western"
  search?: string;
  page?: number;
  sort?: string;
}) {
  const page = params.page || 1;
  const region = (params.region || "all").toLowerCase();

  try {
    if (params.search) {
      const data = await tmdbFetch("/search/tv", { query: params.search, page });
      let results = (data.results || []).filter(
        (r: TmdbMovie) => !r.genre_ids?.includes(16)
      );
      if (region === "kdrama") {
        results = results.filter((r: TmdbMovie) => (r as any).original_language === "ko");
      } else if (region === "cdrama") {
        results = results.filter((r: TmdbMovie) =>
          ["zh", "cn", "zh-CN", "zh-TW"].includes(String((r as any).original_language || ""))
        );
      } else if (region === "jdrama") {
        // Japanese live-action only (not anime): no Animation genre, lang ja
        results = results.filter(
          (r: TmdbMovie) =>
            (r as any).original_language === "ja" && !r.genre_ids?.includes(16)
        );
      } else if (region === "western") {
        results = results.filter((r: TmdbMovie) =>
          ["en", "es", "fr", "de", "pt", "it"].includes(String((r as any).original_language || ""))
        );
      }
      return formatMovieList({ ...data, results }, "series"); // /title/series/:id — not anime cluster
    }

    const sortMap: Record<string, string> = {
      popular: "popularity.desc",
      latest: "first_air_date.desc",
      rating: "vote_average.desc",
      title: "original_name.asc",
    };
    const sortBy = sortMap[params.sort || "popular"] || "popularity.desc";
    // Live-action TV only (K/C/J-drama, Western shows).
    // Western cartoon *movies* stay under Movies. Japanese Animation stays under Anime.
    // Do not dump Animation genre into Series.
    const fetchParams: Record<string, string | number> = {
      page,
      sort_by: sortBy,
      without_genres: 16,
    };
    if (params.sort === "rating") fetchParams["vote_count.gte"] = 50;

    if (region === "kdrama") fetchParams.with_original_language = "ko";
    else if (region === "cdrama") fetchParams.with_original_language = "zh";
    else if (region === "jdrama") fetchParams.with_original_language = "ja";
    else if (region === "western") fetchParams.with_original_language = "en";

    const data = await tmdbFetch("/discover/tv", fetchParams);
    const results = (data.results || []).filter(
      (r: TmdbMovie) => !r.genre_ids?.includes(16) && !isJapaneseAnimeResult(r)
    );
    return formatMovieList({ ...data, results }, "series");
  } catch {
    return { items: [], total: 0, page, totalPages: 1 };
  }
}

export async function getTrendingAll(limit = 40) {
  const [movies, anime, featured] = await Promise.all([
    getTrendingMoviesList(Math.floor(limit / 2)),
    getTrendingAnimeList(Math.floor(limit / 2)),
    getTrendingMoviesList(5),
  ]);
  return { movies, anime, featured };
}

export async function getUpcomingMovies(limit = 30) {
  try {
    const data = await tmdbFetch("/movie/upcoming", { page: 1 });
    return (data.results || []).slice(0, limit).map((m: TmdbMovie) => formatCalendarEntry(m, "movie"));
  } catch {
    return getMockCalendar().slice(0, limit);
  }
}

export async function searchAll(q: string, type: string, page = 1) {
  if (type === "anime") {
    return getAnimeList({ search: q, page });
  }
  if (type === "movie") {
    return getMovies({ search: q, page });
  }
  try {
    const data = await tmdbFetch("/search/multi", { query: q, page });
    return formatMultiSearchList(data);
  } catch {
    const movies = getMockMovies().filter(m => m.title.toLowerCase().includes(q.toLowerCase()));
    const anime = getMockAnime().filter(a => a.title.toLowerCase().includes(q.toLowerCase()));
    const items = [...movies, ...anime];
    return { items, total: items.length, page: 1, totalPages: 1 };
  }
}

export async function getGenreList() {
  try {
    const [movies, tv] = await Promise.all([
      tmdbFetch("/genre/movie/list"),
      tmdbFetch("/genre/tv/list"),
    ]);
    const all = new Map<number, string>();
    for (const g of [...(movies.genres || []), ...(tv.genres || [])]) {
      all.set(g.id, g.name);
    }
    return Array.from(all.entries()).map(([id, name]) => ({ id, name }));
  } catch {
    return [
      { id: 28, name: "Action" }, { id: 12, name: "Adventure" }, { id: 16, name: "Animation" },
      { id: 35, name: "Comedy" }, { id: 80, name: "Crime" }, { id: 18, name: "Drama" },
      { id: 14, name: "Fantasy" }, { id: 27, name: "Horror" }, { id: 9648, name: "Mystery" },
      { id: 10749, name: "Romance" }, { id: 878, name: "Sci-Fi" }, { id: 53, name: "Thriller" },
    ];
  }
}


/** Japanese Animation only (not Western cartoons / live-action). */
function isJapaneseAnimeResult(m: TmdbMovie): boolean {
  const lang = (m as any).original_language;
  const countries: string[] = (m as any).origin_country || [];
  const isJa = lang === "ja" || countries.includes("JP");
  const isAnim = Array.isArray(m.genre_ids)
    ? m.genre_ids.includes(16)
    : Array.isArray((m as any).genres) &&
      (m as any).genres.some((g: any) => g.id === 16 || g.name === "Animation");
  return isJa && isAnim;
}

function getGenreIdByName(name: string): number | undefined {
  const entry = Object.entries(GENRE_MAP).find(([, v]) => v.toLowerCase() === name.toLowerCase());
  return entry ? Number(entry[0]) : undefined;
}

function formatMovieList(data: any, type: "movie" | "anime" | "series") {
  return {
    items: (data.results || []).map((m: TmdbMovie) => formatMovie(m, type)),
    total: data.total_results || 0,
    page: data.page || 1,
    totalPages: data.total_pages || 1,
  };
}

function formatMultiSearchList(data: any) {
  const items = (data.results || [])
    .filter((m: TmdbMovie) => m.media_type === "movie" || m.media_type === "tv")
    .map((m: TmdbMovie) => {
      // Theatrical / feature films (incl. Western cartoons like Pixar) → movie
      if (m.media_type === "movie") return formatMovie(m, "movie");
      // TV: Japanese Animation only → anime; other TV (live-action + Western cartoon series) → series
      if (isJapaneseAnimeResult(m)) return formatMovie(m, "anime");
      return formatMovie(m, "series");
    });
  return {
    items,
    total: data.total_results || 0,
    page: data.page || 1,
    totalPages: data.total_pages || 1,
  };
}

function formatMovie(m: TmdbMovie, type: "movie" | "anime" | "series") {
  const releaseDate = m.release_date || m.first_air_date || null;
  const isReleased = releaseDate ? new Date(releaseDate) <= new Date() : true;
  const imdbId =
    (m as any).external_ids?.imdb_id ||
    (m as any).imdb_id ||
    null;

  return {
    id: String(m.id),
    imdbId,
    type,
    title: m.title || m.name || "Unknown",
    posterUrl: posterUrl(m.poster_path),
    backdropUrl: backdropUrl(m.backdrop_path),
    rating: m.vote_average || null,
    year: releaseDate ? new Date(releaseDate).getFullYear() : null,
    genres: mapGenreIds(m.genre_ids),
    overview: m.overview || null,
    isReleased,
    releaseDate,
  };
}

function formatMovieDetail(m: TmdbMovie, type: "movie" | "anime" | "series") {
  const releaseDate = m.release_date || m.first_air_date || null;
  const isReleased = releaseDate ? new Date(releaseDate) <= new Date() : true;
  const genres = (m.genres || []).map((g) => g.name);
  const episodeRuntime = m.episode_run_time?.[0] ?? null;
  const isTvShow = type === "anime" || type === "series";
  const runtime = isTvShow ? (episodeRuntime ?? m.runtime ?? null) : (m.runtime || null);

  // Season list for series/anime (skip season 0 specials when possible)
  const seasons =
    isTvShow && Array.isArray(m.seasons)
      ? m.seasons
          .filter((s) => s.season_number > 0 && (s.episode_count ?? 0) > 0)
          .map((s) => ({
            id: String(s.id),
            name: s.name || `Season ${s.season_number}`,
            seasonNumber: s.season_number,
            episodeCount: s.episode_count ?? 0,
            airDate: s.air_date || null,
            posterUrl: posterUrl(s.poster_path),
            overview: s.overview || null,
          }))
      : [];

  const imdbId =
    (m as any).external_ids?.imdb_id ||
    (m as any).imdb_id ||
    null;

  return {
    id: String(m.id),
    imdbId,
    type,
    title: m.title || m.name || "Unknown",
    posterUrl: posterUrl(m.poster_path),
    backdropUrl: backdropUrl(m.backdrop_path),
    rating: m.vote_average || null,
    year: releaseDate ? new Date(releaseDate).getFullYear() : null,
    genres,
    overview: m.overview || null,
    isReleased,
    releaseDate,
    trailerUrl: trailerUrl(m.videos),
    runtime,
    status: m.status || null,
    tagline: m.tagline || null,
    cast: (m.credits?.cast || []).slice(0, 15).map((c) => ({
      name: c.name,
      character: c.character || null,
      profileUrl: posterUrl(c.profile_path, "w185"),
    })),
    similar: [...(m.similar?.results || []), ...(m.recommendations?.results || [])]
      .slice(0, 12)
      .map((s) => formatMovie(s, type)),
    // Movies: quality packs. TV/anime: empty — UI uses seasons/episodes instead.
    downloadLinks: (
      type === "movie" && isReleased
        ? generateDownloadLinks(m.title || m.name || "", "movie")
        : []
    ) as DownloadLink[],
    numberOfSeasons: isTvShow ? (m.number_of_seasons ?? seasons.length ?? null) : null,
    numberOfEpisodes: isTvShow ? (m.number_of_episodes ?? null) : null,
    seasons,
  };
}

function formatCalendarEntry(m: TmdbMovie, type: "movie" | "anime") {
  const releaseDate = m.release_date || m.first_air_date || "";
  const daysUntil = Math.ceil((new Date(releaseDate).getTime() - Date.now()) / 86400000);
  return {
    id: String(m.id),
    type,
    title: m.title || m.name || "Unknown",
    posterUrl: posterUrl(m.poster_path),
    releaseDate,
    genres: mapGenreIds(m.genre_ids),
    overview: m.overview || null,
    isUrgent: daysUntil >= 0 && daysUntil <= 1,
  };
}

function generateDownloadLinks(title: string, type: "movie" | "anime"): DownloadLink[] {
  // No fake torrent links — return empty so the UI hides the section
  // when real streams are unavailable.
  void title;
  void type;
  return [] as DownloadLink[];
}

// ─────────────────────────────────────────────
// Mock data �� used when TMDB_API_KEY is not set
// ─────────────────────────────────────────────

function getMockMovies() {
  const tmdbPosters = [
    { id: "tt1", title: "Dune: Part Two", poster: "https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg", rating: 8.4, year: 2024, genres: ["Sci-Fi", "Adventure", "Drama"], overview: "Paul Atreides unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family." },
    { id: "tt2", title: "Oppenheimer", poster: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg", rating: 8.9, year: 2023, genres: ["Drama", "History", "Thriller"], overview: "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II." },
    { id: "tt3", title: "Interstellar", poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/xu9zaAevzQ5nnrsXN6JcahLnG4i.jpg", rating: 8.7, year: 2014, genres: ["Sci-Fi", "Drama", "Adventure"], overview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival." },
    { id: "tt4", title: "The Dark Knight", poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/hkBaDkMWbLaf8B1lsWsKX7Ew3Xq.jpg", rating: 9.0, year: 2008, genres: ["Action", "Crime", "Drama"], overview: "Batman faces the Joker, a criminal mastermind who seeks to plunge Gotham City into anarchy." },
    { id: "tt5", title: "Inception", poster: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/s2bT29y0ngXxxu2IA8AOzzXTRhd.jpg", rating: 8.8, year: 2010, genres: ["Sci-Fi", "Action", "Thriller"], overview: "A thief who steals corporate secrets through dream-sharing technology is tasked with the impossible: planting an idea." },
    { id: "tt6", title: "Poor Things", poster: "https://image.tmdb.org/t/p/w500/kCGlIMHnOm8JPXIwfnLsPFkOJBn.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/mQcOPsy7KdLdgb7KDKPULJJ5iuW.jpg", rating: 8.2, year: 2023, genres: ["Comedy", "Drama", "Fantasy"], overview: "The incredible tale and fantastical evolution of Bella Baxter, a young woman brought back to life by an eccentric scientist." },
    { id: "tt7", title: "Avengers: Endgame", poster: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg", rating: 8.4, year: 2019, genres: ["Action", "Adventure", "Sci-Fi"], overview: "After the devastating events of Infinity War, the Avengers assemble once more to reverse Thanos's actions." },
    { id: "tt8", title: "Gladiator II", poster: "https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/euYIwmwkmz95mnXvuf87toOU2O3.jpg", rating: 7.2, year: 2024, genres: ["Action", "Drama", "Adventure"], overview: "Years after witnessing the death of Maximus, Lucius is forced to enter the Colosseum after his home is conquered." },
    { id: "tt9", title: "Killers of the Flower Moon", poster: "https://image.tmdb.org/t/p/w500/dB6jkRCz0qFa4odF4nBmxGgUTrE.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/1X7vow16X7CnCoexXh4H4F2yDJv.jpg", rating: 7.8, year: 2023, genres: ["Drama", "Crime", "History"], overview: "Members of the Osage Nation are murdered under mysterious circumstances in 1920s Oklahoma." },
    { id: "tt10", title: "Everything Everywhere All at Once", poster: "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/sLxDjBCHBzWlyFJ7FWkfNPuuFbz.jpg", rating: 8.1, year: 2022, genres: ["Sci-Fi", "Comedy", "Action"], overview: "An aging Chinese immigrant is swept up in an insane adventure where she alone can save the world by exploring other universes." },
    { id: "tt11", title: "Top Gun: Maverick", poster: "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/AkszT1yM6mNaKfMRhVa5PGNG4C5.jpg", rating: 8.3, year: 2022, genres: ["Action", "Drama"], overview: "After more than thirty years of service, Pete Mitchell is pushing the envelope as a test pilot." },
    { id: "tt12", title: "The Batman", poster: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg", rating: 7.8, year: 2022, genres: ["Action", "Crime", "Drama"], overview: "In his second year of fighting crime, Batman uncovers corruption in Gotham City that connects to his own family." },
  ];
  return tmdbPosters.map(m => ({
    id: m.id, type: "movie" as const, title: m.title, posterUrl: m.poster,
    backdropUrl: m.backdrop, rating: m.rating, year: m.year, genres: m.genres,
    overview: m.overview, isReleased: true, releaseDate: `${m.year}-01-01`,
  }));
}

function getMockAnime() {
  const list = [
    { id: "a1", title: "Attack on Titan: Final Season", poster: "https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuScW3P5I.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/sHa9JcQpJHdTRhBFEXFhpBUa9Oi.jpg", rating: 9.2, year: 2023, genres: ["Animation", "Action", "Drama"], overview: "Eren Yeager's final campaign against the world reaches its climactic conclusion." },
    { id: "a2", title: "Demon Slayer", poster: "https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/mTvSxoNTmZpNXABx7EK9Nj3dEBp.jpg", rating: 8.8, year: 2022, genres: ["Animation", "Action", "Fantasy"], overview: "Tanjiro Kamado's journey as a demon slayer to save his demon-turned sister continues." },
    { id: "a3", title: "Jujutsu Kaisen", poster: "https://image.tmdb.org/t/p/w500/oGonyDGMgHpyhCBnzPqHKFQxrO2.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/bkjCHkwRSAU4hqQGqKjlqVnJkqo.jpg", rating: 8.7, year: 2023, genres: ["Animation", "Action", "Supernatural"], overview: "Yuji Itadori and the jujutsu sorcerers battle cursed spirits threatening humanity." },
    { id: "a4", title: "Chainsaw Man", poster: "https://image.tmdb.org/t/p/w500/npdB6eFzizki0WaZ1OvKcJrWe97.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/7H26gXNOGnUJMDCHf52RuE2MSqT.jpg", rating: 8.5, year: 2022, genres: ["Animation", "Action", "Horror"], overview: "Denji, a young man who merges with his pet devil Pochita, works for the Public Safety Devil Hunters." },
    { id: "a5", title: "Spy x Family", poster: "https://image.tmdb.org/t/p/w500/fSdZJFUHKZzj1RELiMjMRnEVbhL.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/5vKHGLoNhGBNnKENQBqnMXBnKQ4.jpg", rating: 8.6, year: 2022, genres: ["Animation", "Comedy", "Action"], overview: "A spy must build a fake family to complete his mission, not knowing his fake daughter is a telepath." },
    { id: "a6", title: "One Piece (2023)", poster: "https://image.tmdb.org/t/p/w500/fcFMRBqLCaLCicZVpFgDnirLcAf.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/wnpQ7PxJNGU7bnQlBRjJFlCjT8s.jpg", rating: 9.0, year: 2023, genres: ["Animation", "Adventure", "Fantasy"], overview: "The legendary pirate Monkey D. Luffy and his crew search for the ultimate treasure, the One Piece." },
    { id: "a7", title: "Fullmetal Alchemist: Brotherhood", poster: "https://image.tmdb.org/t/p/w500/5ZFUEOULaVml7GE7sAX6j5Z87m1.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/6mkSsRnUJMbv41TMoAJVVo9tNMb.jpg", rating: 9.1, year: 2009, genres: ["Animation", "Adventure", "Fantasy"], overview: "Two brothers use alchemy in their search for the Philosopher's Stone, after a failed attempt to resurrect their mother." },
    { id: "a8", title: "Hunter x Hunter", poster: "https://image.tmdb.org/t/p/w500/oHBtqpAqPuXCfb4IeZKDmNb4jGA.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/hJFCMkb4Sb9yKrJKFJXSgqHgYm6.jpg", rating: 9.0, year: 2011, genres: ["Animation", "Adventure", "Action"], overview: "A young boy discovers his father is a famous Hunter and sets out to follow in his footsteps." },
    { id: "a9", title: "Vinland Saga Season 2", poster: "https://image.tmdb.org/t/p/w500/eKEXoMXxJEjIakIeHx0fGAqMDJ4.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/4axzqKRZPuKdOqLHvKvJZV16rWl.jpg", rating: 9.0, year: 2023, genres: ["Animation", "Action", "Drama"], overview: "Thorfinn's journey of redemption as he seeks to find a land without war." },
    { id: "a10", title: "Frieren: Beyond Journey's End", poster: "https://image.tmdb.org/t/p/w500/oQMK36LMiPSGS44kkZDaLBGEXzB.jpg", backdrop: "https://image.tmdb.org/t/p/w1280/jGa7odCnFrYqH4j0pxmWnH8oJWg.jpg", rating: 9.1, year: 2023, genres: ["Animation", "Adventure", "Fantasy"], overview: "An elven mage continues her journey after defeating the Demon King, reflecting on the lives of those she traveled with." },
  ];
  return list.map(a => ({
    id: a.id, type: "anime" as const, title: a.title, posterUrl: a.poster,
    backdropUrl: a.backdrop, rating: a.rating, year: a.year, genres: a.genres,
    overview: a.overview, isReleased: true, releaseDate: `${a.year}-04-01`,
  }));
}

function getMockCast() {
  return [
    { name: "Timothée Chalamet", character: "Paul Atreides", profileUrl: "https://image.tmdb.org/t/p/w185/BE2sdjpgsa2rNTFa66f7upkaOP.jpg" },
    { name: "Zendaya", character: "Chani", profileUrl: "https://image.tmdb.org/t/p/w185/6TE2AlOUqcrs7CyJiWYgodmee1r.jpg" },
    { name: "Rebecca Ferguson", character: "Lady Jessica", profileUrl: "https://image.tmdb.org/t/p/w185/lJloTOheuQSirSLXNA3JHsrMNfH.jpg" },
    { name: "Austin Butler", character: "Feyd-Rautha", profileUrl: null },
    { name: "Florence Pugh", character: "Princess Irulan", profileUrl: null },
  ];
}

function getMockCalendar() {
  const now = new Date();
  const addDays = (d: number) => new Date(now.getTime() + d * 86400000).toISOString().split("T")[0];
  return [
    { id: "cal1", type: "movie" as const, title: "Mission: Impossible 8", posterUrl: "https://image.tmdb.org/t/p/w500/NNxYkU70HPurnNCSiCjwHD6Lm.jpg", releaseDate: addDays(0), genres: ["Action", "Thriller"], overview: "Ethan Hunt faces his most deadly mission yet.", isUrgent: true },
    { id: "cal2", type: "movie" as const, title: "Captain America: Brave New World", posterUrl: "https://image.tmdb.org/t/p/w500/pzIddUEMWhWzfvLI3TwxUG2wGoi.jpg", releaseDate: addDays(3), genres: ["Action", "Sci-Fi"], overview: "A new Captain America faces threats to global security.", isUrgent: false },
    { id: "cal3", type: "anime" as const, title: "Dragon Ball DAIMA", posterUrl: "https://image.tmdb.org/t/p/w500/7L9N3NI5SbqNH2tZSiPw9nJFKqF.jpg", releaseDate: addDays(7), genres: ["Animation", "Action", "Adventure"], overview: "Goku and his friends are transformed into children by a mysterious wish.", isUrgent: false },
    { id: "cal4", type: "movie" as const, title: "The Fantastic Four", posterUrl: "https://image.tmdb.org/t/p/w500/9l1eZiJHmhr5jIlthMdJN5WYoff.jpg", releaseDate: addDays(14), genres: ["Action", "Sci-Fi", "Adventure"], overview: "Marvel's first family arrives in the MCU.", isUrgent: false },
    { id: "cal5", type: "anime" as const, title: "Solo Leveling Season 2", posterUrl: "https://image.tmdb.org/t/p/w500/geCRueV3ElhRTr0xtJuEWJt6dJ1.jpg", releaseDate: addDays(21), genres: ["Animation", "Action", "Fantasy"], overview: "Sung Jin-Woo continues his rise as the world's strongest hunter.", isUrgent: false },
    { id: "cal6", type: "movie" as const, title: "Thunderbolts", posterUrl: "https://image.tmdb.org/t/p/w500/jBiTLPScGzLC0tMl4tOFAh4tYPO.jpg", releaseDate: addDays(30), genres: ["Action", "Sci-Fi"], overview: "A team of unlikely heroes and reformed villains band together.", isUrgent: false },
  ];
}
