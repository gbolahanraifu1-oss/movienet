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

export async function getYtsLinks(
  title: string,
  year?: number | null
): Promise<YtsLink[]> {
  try {
    const query = year ? `${title} ${year}` : title;
    const url = `${YTS_API}?query_term=${encodeURIComponent(query)}&limit=5&sort_by=seeds`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const movies: any[] = data?.data?.movies ?? [];
    if (!movies.length) return [];

    // Pick the closest title match
    const target = normalise(title);
    const match =
      movies.find((m) => normalise(m.title ?? "") === target) ?? movies[0];

    const torrents: any[] = match?.torrents ?? [];
    if (!torrents.length) return [];

    // Sort by preferred quality order
    const order: Record<string, number> = {
      "2160p": 0,
      "1080p": 1,
      "720p": 2,
      "480p": 3,
    };

    return torrents
      .sort(
        (a, b) =>
          (order[a.quality] ?? 99) - (order[b.quality] ?? 99)
      )
      .map((t) => ({
        quality: t.quality === "2160p" ? "4K UHD" : t.quality,
        size: t.size ?? "Unknown",
        format: [t.video_codec ?? "x264", t.audio_channels ?? ""].filter(Boolean).join(" "),
        url: t.url ?? "",
        magnet: buildMagnet(t.hash, match.title_long ?? title),
        seeds: t.seeds ?? 0,
        peers: t.peers ?? 0,
      }));
  } catch {
    return [];
  }
}
