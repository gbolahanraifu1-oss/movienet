import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { AdSlot } from "../components/AdSlot";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

const COUNTDOWN = 5;
const VPS_HTTPS = "https://movienetapi.hidenplay.net";
const VPS_SECRET = String(
  import.meta.env.VITE_STREAM_API_SECRET ||
    import.meta.env.VITE_SCRAPER_API_SECRET ||
    "eYW2lW1n9HGgVGdB6LApVfaosFB9mxHm" // Fallback
).trim();

export function DownloadPage() {
  const params = new URLSearchParams(window.location.search);

  const rawTitle = params.get("title") ?? "Unknown Title";
  const poster = params.get("poster") ?? "";
  const backHref = params.get("back") ?? "/";
  const tmdbId = params.get("id") ?? "";
  const year = params.get("year") ?? "";
  const type = (params.get("type") || "movie").toLowerCase();
  const source = (params.get("source") || type || "movie").toLowerCase();
  // Clusters: anime | series | movie (never force anime for series)
  const scraperSource =
    source === "anime" || type === "anime"
      ? "anime"
      : source === "series" || source === "tv" || type === "series" || type === "tv"
        ? "series"
        : "movie";
  const season = params.get("season") || "1";
  const episode = params.get("episode") || params.get("ep") || "";

  const cleanTitle = rawTitle.replace(/\s*[—–-]\s*S\d+E\d+/i, "").trim() || rawTitle;

  const [seconds, setSeconds] = useState(COUNTDOWN);
  const [status, setStatus] = useState<"countdown" | "preparing" | "done" | "error">("countdown");
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [finalUrl, setFinalUrl] = useState("");
  const [resolvedTitle, setResolvedTitle] = useState(cleanTitle);
  const startedRef = useRef(false);

  useEffect(() => {
    if (seconds <= 0 || status !== "countdown") return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [seconds, status]);

  useEffect(() => {
    if (status !== "preparing") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (seconds > 0 || startedRef.current) return;
    startedRef.current = true;
    void startDownload();
  }, [seconds]);

  async function startDownload() {
    setStatus("preparing");
    setErrorMsg("");
    setElapsed(0);

    try {
      const q = new URLSearchParams();
      q.set("q", cleanTitle);
      q.set("source", scraperSource);
      q.set("mode", "download");
      if (scraperSource === "anime" || scraperSource === "series") {
        q.set("episode", episode || "1");
        q.set("season", season || "1");
      }
      // Prefer same-origin proxy (secret stays server-side); falls back handled by /api/media
      let res = await fetch(`/api/media?${q.toString()}`);
      let data = await res.json().catch(() => ({}));

      if ((!res.ok || !data?.success) && scraperSource === "movie") {
        const q2 = new URLSearchParams();
        q2.set("q", cleanTitle);
        q2.set("source", "movie");
        res = await fetch(`/api/media?${q2.toString()}`);
        data = await res.json().catch(() => ({}));
      }

      const downloadUrl = data?.downloadInfo?.url || data?.download || data?.sources?.[0]?.url || "";

      if (!res.ok || !data?.success || !downloadUrl) {
        setStatus("error");
        setErrorMsg(
          episode
            ? "This episode isn’t available yet. Try Watch or another episode."
            : "Download isn’t available for this title right now."
        );
        return;
      }

      if (data.title) setResolvedTitle(String(data.title));
      setFinalUrl(String(downloadUrl));
      setStatus("done");

      const a = document.createElement("a");
      a.href = String(downloadUrl);
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="border-b border-white/5 bg-zinc-950/80">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={backHref} className="text-zinc-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{resolvedTitle}</p>
            <p className="text-zinc-500 text-xs">
              Download
              {episode ? ` · S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-lg">
        <div className="space-y-6">
          {poster && (
            <div className="flex justify-center">
              <img src={poster} alt="" className="w-28 rounded-xl border border-white/10 shadow-lg" />
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8">
            <div className="flex flex-col items-center gap-4">
              {status === "countdown" && (
                <>
                  <div className="w-20 h-20 rounded-full border-2 border-primary flex items-center justify-center text-3xl font-bold text-primary tabular-nums">
                    {seconds}
                  </div>
                  <p className="text-white font-semibold">Preparing download</p>
                  <p className="text-zinc-500 text-sm text-center">Your link will be ready shortly</p>
                </>
              )}
              {status === "preparing" && (
                <>
                  <div className="w-14 h-14 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-white font-semibold text-lg">Downloading…</p>
                  <p className="text-zinc-500 text-sm text-center tabular-nums">{elapsed}s</p>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${Math.min(95, 10 + elapsed * 1.5)}%` }} />
                  </div>
                  <p className="text-zinc-600 text-xs text-center">Large files can take a minute or more</p>
                </>
              )}
              {status === "done" && (
                <>
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                  </div>
                  <p className="text-white font-semibold text-lg">Ready</p>
                  {finalUrl && (
                    <a href={finalUrl} target="_blank" rel="noopener" className="flex items-center gap-2 bg-primary hover:bg-primary/90 rounded-full px-8 py-3 text-sm font-bold text-white">
                      <Download className="w-4 h-4" /> Open download
                    </a>
                  )}
                </>
              )}
              {status === "error" && (
                <>
                  <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-red-400" />
                  </div>
                  <p className="text-white font-semibold text-lg">Unavailable</p>
                  <p className="text-zinc-400 text-sm text-center max-w-sm">{errorMsg}</p>
                  <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => { startedRef.current = false; setSeconds(COUNTDOWN); setStatus("countdown"); }}>
                      Try again
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={backHref}>Back</Link>
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