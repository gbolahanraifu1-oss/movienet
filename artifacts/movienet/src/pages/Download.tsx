import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { useAuth } from "@clerk/react";
import { AdSlot } from "../components/AdSlot";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, CheckCircle2, AlertCircle, Copy, Check } from "lucide-react";

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

const VPS_HTTPS = String(
  import.meta.env.VITE_SCRAPER_URL ||
    import.meta.env.VITE_VPS_URL ||
    "https://movienetapi.hidenplay.net"
).replace(/\/$/, "");
const VPS_SECRET = String(
  import.meta.env.VITE_STREAM_API_SECRET ||
    import.meta.env.VITE_SCRAPER_API_SECRET ||
    "eYW2lW1n9HGgVGdB6LApVfaosFB9mxHm"
).trim();

/** Build a same-origin-safe download URL that forces attachment (avoids blank gate pages). */
function buildProxyDownloadUrl(directUrl: string, filename: string): string {
  const q = new URLSearchParams();
  q.set("url", directUrl);
  q.set("filename", filename);
  if (VPS_SECRET) q.set("secret", VPS_SECRET);
  return `${VPS_HTTPS}/proxy-download?${q.toString()}`;
}

function safeFilename(title: string, season: string, episode: string): string {
  const base = title
    .replace(/[^\w\s\-().]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  if (episode) {
    return `${base}_S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}.mp4`;
  }
  return `${base || "download"}.mp4`;
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  // Prefer same-tab download for proxy (attachment header). Blank gate pages fail with _blank.
  a.target = "_self";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function DownloadPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [gate, setGate] = useState<"ok" | "need-auth" | "checking">("checking");
  const params = new URLSearchParams(window.location.search);

  const rawTitle = params.get("title") ?? "Unknown Title";
  const poster = params.get("poster") ?? "";
  const backHref = params.get("back") ?? "/";
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
  const [proxyUrl, setProxyUrl] = useState("");
  const [resolvedTitle, setResolvedTitle] = useState(cleanTitle);
  const [copied, setCopied] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      setGate("ok");
      return;
    }
    setGate(guestCanDownload() ? "ok" : "need-auth");
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (gate !== "ok" || status !== "countdown") return;
    if (seconds <= 0) {
      if (!startedRef.current) {
        startedRef.current = true;
        void runPrepare();
      }
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [gate, status, seconds]);

  useEffect(() => {
    if (status !== "preparing") return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  async function runPrepare() {
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
      let res = await fetch(`/api/media?${q.toString()}`);
      let data = await res.json().catch(() => ({}));

      if ((!res.ok || !data?.success) && scraperSource === "movie") {
        const q2 = new URLSearchParams();
        q2.set("q", cleanTitle);
        q2.set("source", "movie");
        res = await fetch(`/api/media?${q2.toString()}`);
        data = await res.json().catch(() => ({}));
      }

      const downloadUrl =
        data?.downloadInfo?.url || data?.download || data?.sources?.[0]?.url || "";

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
      const direct = String(downloadUrl);
      const fname = safeFilename(
        String(data.title || cleanTitle),
        season,
        episode || ""
      );
      setFinalUrl(direct);
      setProxyUrl(buildProxyDownloadUrl(direct, fname));
      if (!isSignedIn) recordGuestDownload();
      setStatus("done");

      // Auto-start via PROXY (attachment) — not the blank gate page
      try {
        triggerDownload(buildProxyDownloadUrl(direct, fname), fname);
      } catch {
        /* user can click button */
      }
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  }

  function handleOpenDownload(e?: React.MouseEvent) {
    e?.preventDefault();
    const fname = safeFilename(resolvedTitle, season, episode || "");
    const url = proxyUrl || (finalUrl ? buildProxyDownloadUrl(finalUrl, fname) : "");
    if (!url) return;
    triggerDownload(url, fname);
  }

  async function handleCopy() {
    if (!finalUrl) return;
    try {
      await navigator.clipboard.writeText(finalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = finalUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (gate === "checking") {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center text-zinc-400 text-sm">
        Checking access…
      </div>
    );
  }

  if (gate === "need-auth") {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-white font-semibold text-lg">Sign in to download more</p>
        <p className="text-zinc-400 text-sm max-w-sm">
          Guests get {GUEST_DOWNLOAD_LIMIT} free downloads. Create a free account for unlimited access.
        </p>
        <Button asChild>
          <Link href="/">Back home</Link>
        </Button>
      </div>
    );
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
              {episode
                ? ` · S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`
                : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-lg">
        <div className="space-y-6">
          {poster && (
            <div className="flex justify-center">
              <img
                src={poster}
                alt=""
                className="w-28 rounded-xl border border-white/10 shadow-lg"
              />
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8">
            <div className="flex flex-col items-center gap-4">
              {status === "countdown" && (
                <>
                  <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">{seconds}</span>
                  </div>
                  <p className="text-white font-semibold">Preparing download</p>
                  <p className="text-zinc-500 text-sm">Starting in {seconds}s…</p>
                </>
              )}
              {status === "preparing" && (
                <>
                  <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <span className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  </div>
                  <p className="text-white font-semibold">Fetching link…</p>
                  <p className="text-zinc-500 text-sm">{elapsed}s</p>
                </>
              )}
              {status === "done" && (
                <>
                  <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                  </div>
                  <p className="text-white font-semibold text-lg">Ready</p>
                  <p className="text-zinc-500 text-xs text-center max-w-xs">
                    If the file didn&apos;t start, tap the button below. We stream through our server so
                    blank ad pages can&apos;t interrupt.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenDownload}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 rounded-full px-8 py-3 text-sm font-bold text-white"
                  >
                    <Download className="w-4 h-4" /> Download file
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Link copied" : "Copy direct link"}
                  </button>
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
