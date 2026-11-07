import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdSlot } from "../components/AdSlot";

type Source = { id: string; label: string; build: (ctx: Ctx) => string };

type Ctx = {
  type: "movie" | "tv";
  id: string;
  season: number;
  episode: number;
};

const SOURCES: Source[] = [
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
  {
    id: "2embed",
    label: "2Embed",
    build: ({ type, id, season, episode }) =>
      type === "movie"
        ? `https://www.2embed.cc/embed/${id}`
        : `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`,
  },
];

export function WatchPage() {
  // /watch?type=movie&id=155&title=...&season=1&episode=1
  // Use window.location so we don't depend on wouter's useSearch export
  const params = useMemo(
    () => new URLSearchParams(window.location.search),
    // re-read when path changes is enough for SPA query on this page
    [typeof window !== "undefined" ? window.location.search : ""]
  );

  const type = (params.get("type") === "tv" || params.get("type") === "anime"
    ? "tv"
    : "movie") as "movie" | "tv";
  const id = params.get("id") || "";
  const title = params.get("title") || "Now Playing";
  const season = Math.max(1, Number(params.get("season") || 1));
  const episode = Math.max(1, Number(params.get("episode") || 1));
  const back =
    params.get("back") ||
    (id ? `/title/${type === "tv" ? "anime" : "movie"}/${id}` : "/");

  const [sourceId, setSourceId] = useState(SOURCES[0].id);
  const source = SOURCES.find((s) => s.id === sourceId) || SOURCES[0];

  const embedUrl = id
    ? source.build({ type, id, season, episode })
    : "";

  if (!id) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-zinc-400">Missing title id.</p>
          <Button asChild variant="secondary">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col">
      {/* Top bar */}
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
        <a
          href={embedUrl}
          target="_blank"
          rel="noreferrer"
          className="text-zinc-500 hover:text-white p-2"
          title="Open player in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Player */}
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
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
            <Play className="w-10 h-10 opacity-40" />
          </div>
        )}
      </div>

      {/* Source switcher */}
      <div className="px-4 py-4 space-y-4 bg-zinc-950 border-t border-white/10">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">
            Server / source
          </p>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSourceId(s.id)}
                className={
                  "px-3 py-1.5 rounded-full text-xs font-bold border transition-colors " +
                  (s.id === sourceId
                    ? "bg-primary text-white border-primary"
                    : "bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/25")
                }
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-zinc-600 text-xs mt-3 leading-relaxed">
            If one server is slow or blocked, switch source. Ads on the player
            come from the embed provider, not MovieNet.
          </p>
        </div>

        <AdSlot label="Advertisement" />
      </div>
    </div>
  );
}
