/**
 * YTS API — fetches real .torrent + magnet links for movies.
 * YTS requires a browser-like User-Agent; without it the API returns empty.
 */

const YTS_API = "https://yts.mx/api/v2/list_movies.json";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const TRACKERS = [
  "udp://open.demonii.com:1337/announce",
  "udp://tracker.openbittorrent.com:80",
  "udp://tracker.coppersurfer.tk:6969",
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://exodus.desync.com:6969",
  "udp://p4p.arenabg.com:1337",
  "udp://tracker.leechers-paradise.org:6969",
];

function buildMagnet(hash: string, title: string): string {
  const dn = encodeURIComponent(title);
  const tr = TRACKERS.map((t) => `tr=${encodeURIComponent(t)}`).join("&");
  return `magnet:?xt=urn:btih:${hash}&dn=${dn}&${tr}`;
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export interface YtsLink {
  quality: string;
  size: string;
  format: string;
  url: string;   // direct .torrent file
  magnet: string;
  seeds: number;
  peers: number;
}

async function fetchYtsMovies(query: string): Promise<any[]> {
  const url = `${YTS_API}?query_term=${encodeURIComponent(query)}&limit=8&sort_by=seeds`;
  const res = (await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8000),
  })) as unknown as {
    ok: boolean;
    json: () => Promise<any>;
  };
  if (!res.ok) return [];
  const data: any = await res.json();
  return data?.data?.movies ?? [];
}

export async function getYtsLinks(
  title: string,
  year?: number | null
): Promise<YtsLink[]> {
  try {
    // Prefer title+year, then fall back to title-only if empty
    let movies = await fetchYtsMovies(year ? `${title} ${year}` : title);
    if (!movies.length && year) {
      movies = await fetchYtsMovies(title);
    }
    if (!movies.length) return [];

    // Prefer exact title match, then same-year, else first result
    const target = normalise(title);
    const match =
      movies.find((m) => normalise(m.title ?? "") === target && (!year || m.year === year)) ??
      movies.find((m) => normalise(m.title ?? "") === target) ??
      movies.find((m) => year && m.year === year) ??
      movies[0];

    const torrents: any[] = match?.torrents ?? [];
    if (!torrents.length) return [];

    const order: Record<string, number> = {
      "2160p": 0,
      "1080p": 1,
      "720p": 2,
      "480p": 3,
    };

    const pageUrl: string = match.url || `https://yts.mx/browse-movies/${encodeURIComponent(title)}`;

    return torrents
      .sort(
        (a, b) =>
          (order[a.quality] ?? 99) - (order[b.quality] ?? 99)
      )
      .map((t) => ({
        quality: t.quality === "2160p" ? "4K UHD" : t.quality,
        size: t.size ?? "Unknown",
        format: [t.video_codec ?? "x264", t.audio_channels ?? ""].filter(Boolean).join(" ") || "MKV",
        // Prefer direct .torrent; if missing, fall back to the YTS movie page
        url: t.url || pageUrl,
        magnet: t.hash ? buildMagnet(t.hash, match.title_long ?? title) : "",
        seeds: t.seeds ?? 0,
        peers: t.peers ?? 0,
      }));
  } catch {
    return [];
  }
}
