import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AdSlot } from "../components/AdSlot";

type Ctx = { type: "movie" | "tv"; id: string; season: number; episode: number };
type Source = { id: string; label: string; build: (ctx: Ctx) => string };

const EMBED_SOURCES: Source[] = [
  {
    id: "vidlink",
    label: "VidLink",
    build: ({ type, id, season, episode }) =>
      type === "movie"
        ? `https://vidlink.pro/movie/${id}`
        : `https://vidlink.pro/tv/${id}/${season}/${episode}`,
  },
  {
    id: "vidsrc",
    label: "VidSrc",
    build: ({ type, id, season, episode }) =>
      type === "movie"
        ? `https://vidsrc.xyz/embed/movie/${id}`
        : `https://vidsrc.xyz/embed/tv/${id}/${season}/${episode}`,
  },
  {
    id: "vidsrc2",
    label: "VidSrc.to",
    build: ({ type, id, season, episode }) =>
      type === "movie"
        ? `https://vidsrc.to/embed/movie/${id}`
        : `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`,
  },
];

export function WatchPage() {
  const params = useMemo(
    () => new URLSearchParams(window.location.search),
    []
  );

  const type = (
    params.get("type") === "tv" || params.get("type") === "anime"
      ? "tv"
      : "movie"
  ) as "movie" | "tv";
  const id = params.get("id") || "";
  const title = params.get("title") || "Now Playing";
  const season = Math.max(1, Number(params.get("season") || 1));
  const episode = Math.max(1, Number(params.get("episode") || 1));
  const back =
    params.get("back") ||
    (id ? `/title/${type === "tv" ? "anime" : "movie"}/${id}` : "/");

  const [sourceId, setSourceId] = useState(EMBED_SOURCES[0].id);
  const source = EMBED_SOURCES.find((s) => s.id === sourceId) || EMBED_SOURCES[0];
  const embedUrl = id ? source.build({ type, id, season, episode }) : "";

  if (!id) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center p-6">
        <p className="text-zinc-400">Missing title id.</p>
        <Link href="/" className="text-primary ml-3 text-sm">
          Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col">
      <div className="flex items-center gap-3 px-3 py-2 border-b border-white/10 bg-zinc-950/90">
        <Link
          href={back}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm shrink-0"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-white text-sm font-semibold truncate">{title}</p>
          {type === "tv" && (
            <p className="text-zinc-500 text-xs">
              S{season} · E{episode}
            </p>
          )}
        </div>
        {embedUrl && (
          <a
            href={embedUrl}
            target="_blank"
            rel="noreferrer"
            className="text-zinc-500 hover:text-white p-2"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      <div className="relative w-full bg-black aspect-video max-h-[70vh] md:max-h-[80vh]">
        {embedUrl ? (
          <iframe
            key={embedUrl}
            src={embedUrl}
            title={title}
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            referrerPolicy="origin"
          />
        ) : null}
      </div>

      <div className="px-4 py-4 space-y-4 bg-zinc-950 border-t border-white/10">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">
            Server
          </p>
          <div className="flex flex-wrap gap-2">
            {EMBED_SOURCES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSourceId(s.id)}
                className={
                  "px-3 py-1.5 rounded-full text-xs font-bold border " +
                  (s.id === sourceId
                    ? "bg-primary text-white border-primary"
                    : "bg-zinc-900 text-zinc-300 border-white/10")
                }
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-zinc-600 text-xs mt-3">
            If one server fails, try another. Embeds may show their own ads.
          </p>
        </div>
        <AdSlot label="Advertisement" />
      </div>
    </div>
  );
}
