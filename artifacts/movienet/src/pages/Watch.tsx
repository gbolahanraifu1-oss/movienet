import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ExternalLink, AlertCircle } from "lucide-react";
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

  const [mode, setMode] = useState<"player" | "embed">("embed");
  const [sourceId, setSourceId] = useState(EMBED_SOURCES[0].id);
  const [playerError, setPlayerError] = useState("");
  const [playerLoading, setPlayerLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<any>(null);

  const source = EMBED_SOURCES.find((s) => s.id === sourceId) || EMBED_SOURCES[0];
  const embedUrl = id ? source.build({ type, id, season, episode }) : "";

  // MovieNet player: try Nkiri direct file (often .mkv — may fail in browser)
  useEffect(() => {
    if (mode !== "player" || !id) return;
    let destroyed = false;

    async function run() {
      setPlayerLoading(true);
      setPlayerError("");
      try {
        const q = new URLSearchParams({ tmdb: id, q: title });
        const res = await fetch(`/api/nkiri?${q.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (destroyed) return;
        if (!res.ok || !data?.download) {
          setPlayerError(
            data?.error ||
              "No direct file from Nkiri. Switch to an embed server."
          );
          setMode("embed");
          setPlayerLoading(false);
          return;
        }
        const src = String(data.download);
        if (!(window as any).videojs) {
          await new Promise<void>((resolve, reject) => {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = "https://vjs.zencdn.net/8.16.1/video-js.css";
            document.head.appendChild(link);
            const script = document.createElement("script");
            script.src = "https://vjs.zencdn.net/8.16.1/video.min.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("video.js failed"));
            document.body.appendChild(script);
          });
        }
        if (destroyed || !videoRef.current) return;
        const videojs = (window as any).videojs;
        if (playerRef.current) {
          playerRef.current.dispose();
          playerRef.current = null;
        }
        const isMkv = /\.mkv(\?|$)/i.test(src);
        const player = videojs(videoRef.current, {
          controls: true,
          autoplay: true,
          preload: "auto",
          fluid: true,
          sources: [
            {
              src,
              type: isMkv ? "video/webm" : "video/mp4",
            },
          ],
        });
        playerRef.current = player;
        player.on("error", () => {
          setPlayerError(
            "Browser couldn’t play this file (often .mkv). Use Download or an embed server."
          );
          setMode("embed");
        });
      } catch (e: any) {
        if (!destroyed) {
          setPlayerError(e?.message || "Player failed");
          setMode("embed");
        }
      } finally {
        if (!destroyed) setPlayerLoading(false);
      }
    }

    run();
    return () => {
      destroyed = true;
      if (playerRef.current) {
        try {
          playerRef.current.dispose();
        } catch {
          /* */
        }
        playerRef.current = null;
      }
    };
  }, [mode, id, title]);

  if (!id) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center p-6 text-zinc-400">
        Missing title id.{" "}
        <Link href="/" className="text-primary ml-2">
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
        {mode === "embed" && embedUrl && (
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
        {mode === "player" && (
          <div data-vjs-player className="absolute inset-0">
            {playerLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center text-zinc-400 text-sm bg-black/60">
                Loading MovieNet player…
              </div>
            )}
            <video
              ref={videoRef}
              className="video-js vjs-big-play-centered vjs-fluid"
              playsInline
            />
          </div>
        )}
        {mode === "embed" && embedUrl && (
          <iframe
            key={embedUrl}
            src={embedUrl}
            title={title}
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            referrerPolicy="origin"
          />
        )}
      </div>

      <div className="px-4 py-4 space-y-4 bg-zinc-950 border-t border-white/10">
        {playerError && (
          <div className="flex items-start gap-2 text-amber-200/90 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{playerError}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("player")}
            className={
              "px-3 py-1.5 rounded-full text-xs font-bold border " +
              (mode === "player"
                ? "bg-primary text-white border-primary"
                : "bg-zinc-900 text-zinc-300 border-white/10")
            }
          >
            MovieNet player
          </button>
          <button
            type="button"
            onClick={() => setMode("embed")}
            className={
              "px-3 py-1.5 rounded-full text-xs font-bold border " +
              (mode === "embed"
                ? "bg-primary text-white border-primary"
                : "bg-zinc-900 text-zinc-300 border-white/10")
            }
          >
            Embed servers
          </button>
        </div>

        {mode === "embed" && (
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
          </div>
        )}

        {mode === "player" && (
          <p className="text-zinc-600 text-xs">
            Uses your Nkiri VPS file. Many hosts serve .mkv — phones/Chrome often
            can’t play that in-page; use <strong>Download</strong> or{" "}
            <strong>Embed servers</strong> if it fails.
          </p>
        )}

        <AdSlot label="Advertisement" />
      </div>
    </div>
  );
}
