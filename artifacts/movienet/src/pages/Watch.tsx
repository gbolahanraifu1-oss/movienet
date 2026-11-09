import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ExternalLink, Play, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdSlot } from "../components/AdSlot";

type Source = { id: string; label: string; build: (ctx: Ctx) => string };
type Ctx = { type: "movie" | "tv"; id: string; season: number; episode: number };
type Quality = { quality: string; url: string; size?: string };

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
  {
    id: "2embed",
    label: "2Embed",
    build: ({ type, id, season, episode }) =>
      type === "movie"
        ? `https://www.2embed.cc/embed/${id}`
        : `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`,
  },
];

// ── VPS API CONFIGURATION ──
const VPS_URL = "http://pat.hidencloud.com:24622";
const VPS_SECRET = "eYW2lW1n9HGgVGdB6LApVfaosFB9mxHm";

async function resolveStreamUrl(cdnUrl: string): Promise<string | null> {
  // If it's already a direct .mp4, return it directly.
  if (cdnUrl.includes(".mp4") || cdnUrl.includes(".mkv")) {
    return cdnUrl;
  }
  
  // Otherwise, fallback to the proxy (if you need one)
  if (!cdnUrl) return null;
  try {
    const res = await fetch(
      `/api/stream-proxy?url=${encodeURIComponent(cdnUrl)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.streamUrl || null;
  } catch {
    return null;
  }
}

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

  const [mode, setMode] = useState<"native" | "embed">("native");
  const [qualities, setQualities] = useState<Quality[]>([]);
  const [qualityIdx, setQualityIdx] = useState(0);
  const [sourceId, setSourceId] = useState(EMBED_SOURCES[0].id);
  const [nativeError, setNativeError] = useState("");
  const [loadingMeta, setLoadingMeta] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<any>(null);

  const embedSource =
    EMBED_SOURCES.find((s) => s.id === sourceId) || EMBED_SOURCES[0];
  const embedUrl = id
    ? embedSource.build({ type, id, season, episode })
    : "";

  // Load stream qualities from VPS API
  useEffect(() => {
    if (!id) {
      setLoadingMeta(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Only movies supported by the new VPS right now
        if (type === "tv") {
           throw new Error("Series not supported by native scraper yet.");
        }

        const res = await fetch(`${VPS_URL}/movie/${id}?secret=${VPS_SECRET}`);
        const data = await res.json();
        
        if (cancelled) return;

        if (data.ok && data.sources && data.sources.length > 0) {
          const links = data.sources.map((s: any) => ({
            quality: s.quality || "1080p",
            url: s.url,
          }));
          setQualities(links);
        } else {
          setMode("embed");
          setNativeError(data.error || "No direct stream URL — using embed servers.");
        }
      } catch (err: any) {
        if (!cancelled) {
          setMode("embed");
          setNativeError("Could not load streams — using embed servers.");
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, type]);

  // Init / update Video.js
  useEffect(() => {
    if (mode !== "native" || !qualities.length) return;

    const q = qualities[qualityIdx] || qualities[0];
    let destroyed = false;

    async function setup() {
      const src = await resolveStreamUrl(q.url);
      if (destroyed) return;
      if (!src) {
        setNativeError("Stream proxy not configured. Using embed servers.");
        setMode("embed");
        return;
      }

      if (!(window as any).videojs) {
        await new Promise<void>((resolve, reject) => {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://vjs.zencdn.net/8.16.1/video-js.css";
          document.head.appendChild(link);
          const script = document.createElement("script");
          script.src = "https://vjs.zencdn.net/8.16.1/video.min.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("video.js load failed"));
          document.body.appendChild(script);
        });
      }
      if (destroyed || !videoRef.current) return;

      const videojs = (window as any).videojs;
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }

      const player = videojs(videoRef.current, {
        controls: true,
        autoplay: true,
        preload: "auto",
        fluid: true,
        sources: [{ src, type: "video/mp4" }],
      });
      playerRef.current = player;

      player.on("error", () => {
        setNativeError("Direct stream failed. Switch to an embed server.");
        setMode("embed");
      });
    }

    setup().catch(() => {
      setNativeError("Player failed to load. Using embed servers.");
      setMode("embed");
    });

    return () => {
      destroyed = true;
      if (playerRef.current) {
        try { playerRef.current.dispose(); } catch {}
        playerRef.current = null;
      }
    };
  }, [mode, qualities, qualityIdx]);

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
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      <div className="relative w-full bg-black aspect-video max-h-[70vh] md:max-h-[80vh]">
        {loadingMeta && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">
            Loading player…
          </div>
        )}

        {mode === "native" && !loadingMeta && (
          <div data-vjs-player className="absolute inset-0">
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
        {nativeError && (
          <div className="flex items-start gap-2 text-amber-200/90 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{nativeError}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setNativeError("");
              setMode("native");
            }}
            className={
              "px-3 py-1.5 rounded-full text-xs font-bold border " +
              (mode === "native"
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

        {mode === "native" && qualities.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">
              Quality
            </p>
            <div className="flex flex-wrap gap-2">
              {qualities.map((q, i) => (
                <button
                  key={q.quality + i}
                  type="button"
                  onClick={() => setQualityIdx(i)}
                  className={
                    "px-3 py-1.5 rounded-full text-xs font-bold border " +
                    (i === qualityIdx
                      ? "bg-primary text-white border-primary"
                      : "bg-zinc-900 text-zinc-300 border-white/10")
                  }
                >
                  {q.quality}
                  {q.size ? ` · ${q.size}` : ""}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}