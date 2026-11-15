import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { useAuth } from "@clerk/react";
import { AdSlot } from "../components/AdSlot";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

const COUNTDOWN = 5;
const GUEST_DOWNLOAD_LIMIT = 5;
const GUEST_DL_KEY = "movienet_guest_downloads";

function getGuestDownloadCount(): number {
  try {
    const n = parseInt(localStorage.getItem(GUEST_DL_KEY) || "0", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}
function guestCanDownload(): boolean {
  return getGuestDownloadCount() < GUEST_DOWNLOAD_LIMIT;
}
function recordGuestDownload(): void {
  try {
    localStorage.setItem(GUEST_DL_KEY, String(getGuestDownloadCount() + 1));
  } catch {
    /* ignore */
  }
}

const VPS_HTTPS = "https://movienetapi.hidenplay.net";
const VPS_SECRET = String(
  import.meta.env.VITE_STREAM_API_SECRET ||
    import.meta.env.VITE_SCRAPER_API_SECRET ||
    "eYW2lW1n9HGgVGdB6LApVfaosFB9mxHm"
).trim();

export function DownloadPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [gate, setGate] = useState<"ok" | "need-auth" | "checking">("checking");
  const params = new URLSearchParams(window.location.search);

  const rawTitle = params.get("title") ?? "Unknown Title";
  const poster = params.get("poster") ?? "";
  const backHref = params.get("back") ?? "/";
  const tmdbId = params.get("id") ?? "";
  const year = params.get("year") ?? "";
  const type = (params.get("type") || "movie").toLowerCase();
  const source = (params.get("source") || type || "movie").toLowerCase();
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
    if (!isLoaded) return;
    if (isSignedIn) {
      setGate("ok");
      return;
    }
    setGate(guestCanDownload() ? "ok" : "need-auth");
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (gate !== "ok") return;
    if (seconds > 0 || startedRef.current) return;
    startedRef.current = true;
    void startDownload();
  }, [seconds, gate]);

  async function startDownload() {
    setStatus("preparing");
    setErrorMsg("");
    setElapsed(0);

    try {
      const q = new URLSearchParams();
      q.set("q", cleanTitle);
      q.set("source", scraperSource);
      q.set("mode", "download");
      if (year) q.set("year", year);
      if (tmdbId) q.set("id", tmdbId);
      if (scraperSource !== "movie") {
        q.set("season", season);
        if (episode) q.set("episode", episode);
      }

      let res = await fetch(`/api/media?${q.toString()}`);
      let data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        const q2 = new URLSearchParams(q);
        q2.set("source", scraperSource === "anime" ? "anime" : scraperSource);
        res = await fetch(`/api/media?${q2.toString()}`);
        data = await res.json().catch(() => ({}));
      }

      const downloadUrl =
        data?.downloadInfo?.url || data?.download || data?.sources?.[0]?.url || "";

      if (!res.ok || !data?.success || !downloadUrl) {
        throw new Error(data?.error || data?.message || "File not found");
      }

      if (data.title) setResolvedTitle(String(data.title));
      setFinalUrl(String(downloadUrl));
      if (!isSignedIn) recordGuestDownload();
      setStatus("done");

      const a = document.createElement("a");
      a.href = String(downloadUrl);
      a.target = "_blank";
      a.rel = "noopener";
      a.click();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Download failed";
      setErrorMsg(msg);
      setStatus("error");
    }
  }

  if (!isLoaded || gate === "checking") {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Checking download access…</p>
      </div>
    );
  }

  if (gate === "need-auth") {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-6 text-center gap-4">
        <AlertCircle className="w-10 h-10 text-amber-400" />
        <h1 className="text-xl font-bold">Free download limit reached</h1>
        <p className="text-zinc-400 text-sm max-w-sm">
          Guests get {GUEST_DOWNLOAD_LIMIT} downloads. Sign in or create a free account to keep downloading.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href={`/sign-in?redirect_url=${next}`}
            className="rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
          <Link
            href={`/sign-up?redirect_url=${next}`}
            className="rounded-xl border border-white/20 px-5 py-2.5 text-sm text-white"
          >
            Sign up
          </Link>
          <Link href={backHref} className="rounded-xl px-5 py-2.5 text-sm text-zinc-400">
            Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        <Link href={backHref} className="text-zinc-400 hover:text-white inline-flex items-center gap-2 text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="space-y-6">
          {poster ? (
            <img src={poster} alt="" className="w-32 mx-auto rounded-xl shadow-lg" />
          ) : null}
          <div className="text-center">
            <h1 className="text-xl font-bold">{resolvedTitle}</h1>
            {episode ? (
              <p className="text-zinc-500 text-sm mt-1">
                S{season}E{episode}
              </p>
            ) : null}
          </div>

          <AdSlot label="Advertisement" />

          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8">
            <div className="flex flex-col items-center gap-4">
              {status === "countdown" && (
                <>
                  <p className="text-white font-semibold">Preparing download</p>
                  <p className="text-4xl font-bold tabular-nums text-primary">{seconds}</p>
                  <p className="text-zinc-500 text-sm">Your file will be ready shortly</p>
                </>
              )}
              {status === "preparing" && (
                <>
                  <div className="w-14 h-14 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-white font-semibold text-lg">Downloading…</p>
                  <p className="text-zinc-500 text-sm text-center tabular-nums">{elapsed}s</p>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-1000"
                      style={{ width: `${Math.min(95, 10 + elapsed * 1.5)}%` }}
                    />
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
                  {finalUrl ? (
                    <a
                      href={finalUrl}
                      target="_blank"
                      rel="noopener"
                      className="flex items-center gap-2 bg-primary hover:bg-primary/90 rounded-full px-8 py-3 text-sm font-bold text-white"
                    >
                      <Download className="w-4 h-4" /> Open download
                    </a>
                  ) : null}
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