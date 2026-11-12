import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ExternalLink, AlertCircle, Radio } from "lucide-react";
import { AdSlot } from "../components/AdSlot";

type Ctx = { type: "movie" | "tv"; id: string; season: number; episode: number };
type EmbedSource = { id: string; label: string; build: (ctx: Ctx) => string };

const EMBED_SOURCES: EmbedSource[] = [
  {
    id: "s1",
    label: "Server 1",
    build: ({ type, id, season, episode }) =>
      type === "movie"
        ? `https://vidlink.pro/movie/${id}`
        : `https://vidlink.pro/tv/${id}/${season}/${episode}`,
  },
  {
    id: "s2",
    label: "Server 2",
    build: ({ type, id, season, episode }) =>
      type === "movie"
        ? `https://vidsrc.xyz/embed/movie/${id}`
        : `https://vidsrc.xyz/embed/tv/${id}/${season}/${episode}`,
  },
  {
    id: "s3",
    label: "Server 3",
    build: ({ type, id, season, episode }) =>
      type === "movie"
        ? `https://vidsrc.to/embed/movie/${id}`
        : `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`,
  },
];

/** Seconds to wait for scraper HLS before auto-switching to embeds */
const PLAYER_TIMEOUT_SEC = 25;

function loadVideoJs(): Promise<any> {
  if ((window as any).videojs) return Promise.resolve((window as any).videojs);
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://vjs.zencdn.net/8.16.1/video-js.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://vjs.zencdn.net/8.16.1/video.min.js";
    script.onload = () => resolve((window as any).videojs);
    script.onerror = () => reject(new Error("Video.js failed to load"));
    document.body.appendChild(script);
  });
}

export function WatchPage() {
  const params = useMemo(
    () => new URLSearchParams(window.location.search),
    []
  );

  const rawType = (params.get("type") || "movie").toLowerCase();
  const type = (
    rawType === "tv" || rawType === "anime" ? "tv" : "movie"
  ) as "movie" | "tv";
  const isAnime =
    rawType === "anime" ||
    params.get("source") === "anime" ||
    (rawType === "tv" && params.get("source") === "anime");
  const isSports = rawType === "sports" || params.get("source") === "sports";
  const isSerial = isAnime || rawType === "tv";
  const id = params.get("id") || "";
  const title = params.get("title") || "Now Playing";
  const season = Math.max(1, Number(params.get("season") || 1));
  const episode = Math.max(1, Number(params.get("episode") || 1));
  const back =
    params.get("back") ||
    (id
      ? `/title/${isAnime ? "anime" : type === "tv" ? "anime" : "movie"}/${id}`
      : isSports
        ? "/sports"
        : "/");

  // MovieNet player is always the default
  const [mode, setMode] = useState<"player" | "embed">("player");
  const [sourceId, setSourceId] = useState(EMBED_SOURCES[0].id);
  const [playerError, setPlayerError] = useState("");
  const [playerLoading, setPlayerLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [countdown, setCountdown] = useState(PLAYER_TIMEOUT_SEC);
  const [autoSwitchNote, setAutoSwitchNote] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<any>(null);
  const switchedRef = useRef(false);
  const userPickedEmbedRef = useRef(false);

  const embed = EMBED_SOURCES.find((s) => s.id === sourceId) || EMBED_SOURCES[0];
  const embedUrl =
    id && !isSports ? embed.build({ type, id, season, episode }) : "";

  function goEmbed(reason: string) {
    if (isSports || !embedUrl || userPickedEmbedRef.current) return;
    if (switchedRef.current) return;
    switchedRef.current = true;
    setAutoSwitchNote(reason);
    setMode("embed");
    setPlayerLoading(false);
  }

  // Countdown while on player mode — auto-switch to embed when it hits 0
  useEffect(() => {
    if (mode !== "player" || isSports) return;
    if (!embedUrl) return;
    setCountdown(PLAYER_TIMEOUT_SEC);
    switchedRef.current = false;
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(tick);
          goEmbed("Stream took too long — switched to embed server.");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [mode, id, title, episode, season, isSports, embedUrl]);

  // Resolve + start MovieNet HLS player
  useEffect(() => {
    if (mode !== "player") return;
    let destroyed = false;

    async function run() {
      setPlayerLoading(true);
      setPlayerError("");
      setStatusText("Resolving stream…");
      setAutoSwitchNote("");

      try {
        const q = new URLSearchParams();
        const searchTitle =
          title.replace(/\s*[—–-]\s*S\d+E\d+/i, "").trim() || title;
        q.set("q", searchTitle);
        if (isSports) q.set("source", "sports");
        else if (isAnime || isSerial) {
          q.set("source", "anime");
          q.set("episode", String(episode));
          q.set("season", String(season));
        }
        if (id && !isSports) q.set("tmdb", id);

        const mediaRes = await fetch(`/api/media?${q.toString()}`);
        const media = await mediaRes.json().catch(() => ({}));
        if (destroyed) return;

        const streamUrl: string | undefined =
          media?.stream?.url ||
          (media?.mode === "hls" || media?.type === "hls"
            ? media?.download
            : undefined);
        const referer: string =
          media?.stream?.referer || "https://megaplay.buzz/";

        if (!streamUrl) {
          setPlayerError(
            media?.error || "No HLS stream from scraper."
          );
          setPlayerLoading(false);
          if (!isSports && embedUrl) {
            goEmbed("No stream found — switched to embed server.");
          }
          return;
        }

        setStatusText("Building play URL…");
        const playRes = await fetch(
          `/api/play-hls?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent(referer)}`
        );
        const play = await playRes.json().catch(() => ({}));
        if (destroyed) return;
        if (!play?.playUrl) {
          setPlayerError("Could not build HLS proxy URL");
          setPlayerLoading(false);
          if (!isSports && embedUrl) {
            goEmbed("Proxy failed — switched to embed server.");
          }
          return;
        }

        setStatusText("Starting player…");
        const videojs = await loadVideoJs();
        if (destroyed || !videoRef.current) return;

        if (playerRef.current) {
          try {
            playerRef.current.dispose();
          } catch {
            /* */
          }
          playerRef.current = null;
        }

        const player = videojs(videoRef.current, {
          controls: true,
          autoplay: true,
          preload: "auto",
          fluid: true,
          liveui: isSports,
          sources: [
            {
              src: play.playUrl,
              type: "application/x-mpegURL",
            },
          ],
        });
        playerRef.current = player;
        player.on("error", () => {
          setPlayerError("Playback failed (CDN or network).");
          if (!isSports && embedUrl) {
            goEmbed("Player error — switched to embed server.");
          }
        });
        player.on("playing", () => {
          // Stream works — stop auto-switch pressure by freezing countdown high
          setCountdown((c) => (c > 0 ? c + 999 : c));
          setStatusText("");
        });
        setStatusText("");
      } catch (e: any) {
        if (!destroyed) {
          setPlayerError(e?.message || "Player failed");
          if (!isSports && embedUrl) {
            goEmbed("Error — switched to embed server.");
          }
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
  }, [mode, id, title, episode, season, isAnime, isSports, isSerial]);

  if (!id && !isSports) {
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
          {type === "tv" && !isSports && (
            <p className="text-zinc-500 text-xs">
              S{season} · E{episode}
            </p>
          )}
          {isSports && (
            <p className="text-zinc-500 text-xs flex items-center gap-1">
              <Radio className="w-3 h-3" /> Live / sports
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
            {(playerLoading || countdown > 0) && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-zinc-300 text-sm bg-black/75 px-4">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>{statusText || "Loading MovieNet player…"}</span>
                {!isSports && embedUrl && countdown <= PLAYER_TIMEOUT_SEC && (
                  <p className="text-zinc-500 text-xs text-center max-w-xs">
                    Auto-switch to embed in{" "}
                    <span className="text-primary font-bold tabular-nums">
                      {Math.min(countdown, PLAYER_TIMEOUT_SEC)}s
                    </span>
                    {" · "}
                    <button
                      type="button"
                      className="text-primary underline underline-offset-2"
                      onClick={() => {
                        userPickedEmbedRef.current = true;
                        setMode("embed");
                      }}
                    >
                      Use embed now
                    </button>
                  </p>
                )}
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
        {mode === "embed" && isSports && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-sm">
            Sports uses MovieNet player only
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-4 bg-zinc-950 border-t border-white/10">
        {(playerError || autoSwitchNote) && (
          <div className="flex items-start gap-2 text-amber-200/90 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{autoSwitchNote || playerError}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              userPickedEmbedRef.current = false;
              switchedRef.current = false;
              setMode("player");
              setAutoSwitchNote("");
              setPlayerError("");
            }}
            className={
              "px-3 py-1.5 rounded-full text-xs font-bold border " +
              (mode === "player"
                ? "bg-primary text-white border-primary"
                : "bg-zinc-900 text-zinc-300 border-white/10")
            }
          >
            MovieNet player
          </button>
          {!isSports && embedUrl && (
            <button
              type="button"
              onClick={() => {
                userPickedEmbedRef.current = true;
                setMode("embed");
              }}
              className={
                "px-3 py-1.5 rounded-full text-xs font-bold border " +
                (mode === "embed"
                  ? "bg-primary text-white border-primary"
                  : "bg-zinc-900 text-zinc-300 border-white/10")
              }
            >
              Embed servers
            </button>
          )}
        </div>

        {mode === "embed" && !isSports && (
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
            MovieNet player is default. If the stream is slow or fails, we
            auto-switch to embeds (or pick Embed servers anytime).
          </p>
        )}

        <AdSlot label="Advertisement" />
      </div>
    </div>
  );
}
