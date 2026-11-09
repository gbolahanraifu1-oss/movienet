import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { AdSlot } from "../components/AdSlot";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

const COUNTDOWN = 5;
const VPS_URL = "http://pat.hidencloud.com:24622";
const VPS_SECRET = "eYW2lW1n9HGgVGdB6LApVfaosFB9mxHm";

export function DownloadPage() {
  const params = new URLSearchParams(window.location.search);

  const title = params.get("title") ?? "Unknown Title";
  const qualityParam = params.get("quality") ?? "1080p";
  const sizeParam = params.get("size") ?? "";
  const format = params.get("format") ?? "MP4";
  const fileUrlParam = params.get("url") ?? ""; // If passed directly
  const poster = params.get("poster") ?? "";
  const backHref = params.get("back") ?? "/";
  const tmdbId = params.get("id") ?? "";

  const [displayQuality, setDisplayQuality] = useState(qualityParam);
  const [displaySize, setDisplaySize] = useState(sizeParam);

  const safeName = `${title.replace(/[^\w\s.-]+/g, "").trim() || "video"}-${displayQuality || "hd"}.mp4`;

  const [seconds, setSeconds] = useState(COUNTDOWN);
  const [status, setStatus] = useState<"countdown" | "preparing" | "done" | "error">(
    "countdown"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [finalUrl, setFinalUrl] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (seconds <= 0 || status !== "countdown") return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [seconds, status]);

  useEffect(() => {
    if (seconds > 0 || startedRef.current) return;
    startedRef.current = true;
    void startDownload();
  }, [seconds]);

  async function resolveSourceUrl(): Promise<string | null> {
    // If the frontend passed the URL directly (from the detail page)
    if (fileUrlParam && fileUrlParam.startsWith("http")) {
      return fileUrlParam;
    }

    // Otherwise, fetch from VPS using TMDB ID
    if (tmdbId) {
      try {
        const res = await fetch(`${VPS_URL}/movie/${tmdbId}?secret=${VPS_SECRET}`);
        const data = await res.json();
        
        if (data.ok && data.sources && data.sources.length > 0) {
          const bestQuality = data.sources[0];
          setDisplayQuality(bestQuality.quality || "1080p");
          return bestQuality.url;
        } else {
          setErrorMsg(data.error || "No download source found.");
          return null;
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to reach VPS.");
        return null;
      }
    }

    setErrorMsg("No download URL was provided. Go back and pick a quality again.");
    return null;
  }

  async function startDownload() {
    setStatus("preparing");
    setErrorMsg("");

    try {
      const fileUrl = await resolveSourceUrl();
      if (!fileUrl) {
        setStatus("error");
        return;
      }

      // Since it's a direct MP4, we don't need the Vercel proxy.
      // We just trigger the browser download directly.
      setFinalUrl(fileUrl);
      setStatus("done");
      
      // Trigger download
      const a = document.createElement("a");
      a.href = fileUrl;
      a.rel = "noopener";
      a.target = "_blank";
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.message || "Download failed");
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to title
        </Link>

        <div className="space-y-6">
          <div className="flex gap-4 items-start">
            {poster ? (
              <img
                src={poster}
                alt=""
                className="w-20 h-28 object-cover rounded-lg border border-white/10"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                Preparing download
              </p>
              <h1 className="text-xl font-display font-bold text-white leading-snug">
                {title}
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                {displayQuality && (
                  <span className="inline-block mr-2 px-2 py-0.5 rounded bg-primary/20 text-primary text-xs font-bold">
                    {displayQuality}
                  </span>
                )}
                {format}
                {displaySize ? ` · ${displaySize}` : ""}
              </p>
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-white/5 rounded-2xl p-8">
            <div className="flex flex-col items-center gap-4">
              {status === "countdown" && (
                <>
                  <div className="w-20 h-20 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-3xl font-bold text-white">
                    {seconds}
                  </div>
                  <p className="text-white font-semibold text-lg">Starting soon</p>
                  <p className="text-zinc-400 text-sm text-center max-w-xs">
                    Download will begin automatically. You can close ads after.
                  </p>
                </>
              )}

              {status === "preparing" && (
                <>
                  <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-white font-semibold text-lg">Preparing file…</p>
                  <p className="text-zinc-400 text-sm text-center max-w-xs">
                    Fetching a stable link. This can take a minute.
                  </p>
                </>
              )}

              {status === "done" && (
                <>
                  <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                  </div>
                  <p className="text-white font-semibold text-lg">Download ready</p>
                  <p className="text-zinc-400 text-sm text-center max-w-xs">
                    If nothing started, tap the button below.
                  </p>
                  {finalUrl && (
                    <a
                      href={finalUrl}
                      className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 rounded-full px-8 py-3 text-sm font-bold text-white"
                    >
                      <Download className="w-4 h-4" /> Open download link
                    </a>
                  )}
                </>
              )}

              {status === "error" && (
                <>
                  <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-red-400" />
                  </div>
                  <p className="text-white font-semibold text-lg">Download failed</p>
                  <p className="text-zinc-400 text-sm text-center max-w-sm">{errorMsg}</p>
                  <div className="flex flex-col sm:flex-row gap-3 mt-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        startedRef.current = false;
                        setSeconds(COUNTDOWN);
                        setStatus("countdown");
                      }}
                    >
                      Try again
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={backHref}>Back to title</Link>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          <AdSlot label="Advertisement" />
        </div>
      </div>
    </div>
  );
}