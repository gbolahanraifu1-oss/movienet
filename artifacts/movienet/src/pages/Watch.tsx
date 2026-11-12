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

const VPS_HTTPS = "https://movienetapi.hidenplay.net";

const VPS_SECRET = String(
  import.meta.env.VITE_STREAM_API_SECRET ||
    import.meta.env.VITE_SCRAPER_API_SECRET ||
    "eYW2lW1n9HGgVGdB6LApVfaosFB9mxHm" // Fallback if env fails
).trim();

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
    script.onerror = () => reject(new Error("Player failed to load"));
    document.body.appendChild(script);
  });
}

function isDirectFile(url: string): boolean {
  return /\.(mp4|webm|mkv|mov)(\?|$)/i.test(url);
}

function buildPlayUrl(streamUrl: string, referer: string): { playUrl: string; type: string } {
  if (isDirectFile(streamUrl)) {
    return { playUrl: streamUrl, type: "video/mp4" };
  }
  const params = new URLSearchParams();
  params.set("url", streamUrl);
  params.set("referer", referer || "https://iptv-org.github.io/");
  if (VPS_SECRET) params.set("secret", VPS_SECRET);
  
  let playUrl = `${VPS_HTTPS}/stream?${params.toString()}`;
  playUrl = playUrl.replace(/^http:\/\//i, "https://");
  
  return { playUrl, type: "application/x-mpegURL" };
}

export function WatchPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  const rawType = (params.get("type") || "movie").toLowerCase();
  const type = (rawType === "tv" || rawType === "anime" ? "tv" : "movie") as "movie" | "tv";
  const isAnime = rawType === "anime" || params.get("source") === "anime";
  const isSports = rawType === "sports" || params.get("source") === "sports";
  const isSerial = isAnime || rawType === "tv";
  const id = params.get("id") || "";
  const title = params.get("title") || "Now Playing";
  const season = Math.max(1, Number(params.get("season") || 1));
  const episode = Math.max(1, Number(params.get("episode") || 1));
  const back = params.get("back") || (id ? `/title/${isAnime ? "anime" : type === "tv" ? "anime" : "movie"}/${id}` : isSports ? "/sports" : "/");

  const [mode, setMode] = useState<"player" | "embed">("player");
  const [sourceId, setSourceId] = useState(EMBED_SOURCES[0].id);
  const [playerError, setPlayerError] = useState("");
  const [playerLoading, setPlayerLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<any>(null);

  const embed = EMBED_SOURCES.find((s) => s.id === sourceId) || EMBED_SOURCES[0];
  const embedUrl = id && !isSports ? embed.build({ type, id, season, episode }) : "";

  useEffect(() => {
    if (mode !== "player" || !playerLoading) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [mode, playerLoading, title, episode]);

  useEffect(() => {
    if (mode !== "player") return;
    let destroyed = false;

    async function run() {
      setPlayerLoading(true);
      setPlayerError("");
      setElapsed(0);

      try {
        const q = new URLSearchParams();
        const searchTitle = title.replace(/\s*[—–-]\s*S\d+E\d+/i, "").trim() || title;
        q.set("q", searchTitle);
        if (isSports) q.set("source", "sports");
        else if (isAnime || isSerial) {
          q.set("source", "anime");
          q.set("episode", String(episode));
          q.set("season", String(season));
        }
        if (id && !isSports) q.set("tmdb", id);
        if (VPS_SECRET) q.set("secret", VPS_SECRET);

        // BYPASS VERCEL: Hit VPS directly
        const vpsUrl = `${VPS_HTTPS}/api/download?${q.toString()}`;
        const mediaRes = await fetch(vpsUrl);
        const media = await mediaRes.json().catch(() => ({}));
        
        if (destroyed) return;

        if (!mediaRes.ok || !media?.success) {
          setPlayerError(isSports ? "This channel is unavailable right now." : "Stream unavailable.");
          setPlayerLoading(false);
          return;
        }

        const streamUrl: string | undefined =
          media?.stream?.url ||
          (media?.mode === "hls" || media?.type === "hls" ? media?.download : undefined) ||
          (typeof media?.download === "string" ? media.download : undefined);

        const referer: string = media?.stream?.referer || (isSports ? "https://iptv-org.github.io/" : "https://megaplay.buzz/");

        if (!streamUrl) {
          setPlayerError("Stream unavailable.");
          setPlayerLoading(false);
          return;
        }

        if (!isDirectFile(streamUrl) && !VPS_SECRET) {
          setPlayerError("Player is not configured. Add VITE_STREAM_API_SECRET.");
          setPlayerLoading(false);
          return;
        }

        const { playUrl, type: mime } = buildPlayUrl(streamUrl, referer);
        const videojs = await loadVideoJs();
        
        if (destroyed || !videoRef.current) return;

        if (playerRef.current) {
          try { playerRef.current.dispose(); } catch {}
          playerRef.current = null;
        }

        const player = videojs(videoRef.current, {
          controls: true,
          autoplay: true,
          preload: "auto",
          fluid: true,
          liveui: isSports,
          html5: { vhs: { overrideNative: true } },
          sources: [{ src: playUrl, type: mime }],
        });
        
        playerRef.current = player;
        
        player.on("error", () => {
          setPlayerError("Playback failed. Try another server below.");
        });
        player.on("playing", () => {
          setPlayerLoading(false);
          setPlayerError("");
        });
      } catch {
        if (!destroyed) setPlayerError("Something went wrong.");
      } finally {
        if (!destroyed) setPlayerLoading(false);
      }
    }

    run();
    return () => {
      destroyed = true;
      if (playerRef.current) {
        try { playerRef.current.dispose(); } catch {}
        playerRef.current = null;
      }
    };
  }, [mode, id, title, episode, season, isAnime, isSports, isSerial]);

  if (!id && !isSports) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center p-6 text-zinc-400">
        Missing title. <Link href="/" className="text-primary ml-2">Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col">
      <div className="flex items-center gap-3 px-3 py-2 border-b border-white/10 bg-zinc-950/90">
        <Link href={back} className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm shrink-0">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-white text-sm font-semibold truncate">{title}</p>
          {type === "tv" && !isSports && <p className="text-zinc-500 text-xs">S{season} · E{episode}</p>}
          {isSports && <p className="text-zinc-500 text-xs flex items-center gap-1"><Radio className="w-3 h-3" /> Live</p>}
        </div>
        {mode === "embed" && embedUrl && (
          <a href={embedUrl} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white p-2">
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      <div className="relative w-full bg-black aspect-video max-h-[70vh] md:max-h-[80vh]">
        {mode === "player" && (
          <div data-vjs-player className="absolute inset-0">
            {playerLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-zinc-300 text-sm bg-black/80 px-4">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="font-medium text-white">Loading…</span>
                <span className="text-zinc-500 text-xs tabular-nums">{elapsed}s</span>
              </div>
            )}
            <video ref={videoRef} className="video-js vjs-big-play-centered vjs-fluid" playsInline />
          </div>
        )}
        {mode === "embed" && embedUrl && (
          <iframe key={embedUrl} src={embedUrl} title={title} className="absolute inset-0 w-full h-full border-0" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="origin" />
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
          <button type="button" onClick={() => { setMode("player"); setPlayerError(""); }} className={"px-3 py-1.5 rounded-full text-xs font-bold border " + (mode === "player" ? "bg-primary text-white border-primary" : "bg-zinc-900 text-zinc-300 border-white/10")}>
            MovieNet
          </button>
          {!isSports && embedUrl && (
            <button type="button" onClick={() => setMode("embed")} className={"px-3 py-1.5 rounded-full text-xs font-bold border " + (mode === "embed" ? "bg-primary text-white border-primary" : "bg-zinc-900 text-zinc-300 border-white/10")}>
              Other servers
            </button>
          )}
        </div>
        <AdSlot label="Advertisement" />
      </div>
    </div>
  );
}