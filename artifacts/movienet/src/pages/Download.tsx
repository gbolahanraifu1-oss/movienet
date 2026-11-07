import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { AdSlot } from "../components/AdSlot";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

const COUNTDOWN = 5;

export function DownloadPage() {
  const params = new URLSearchParams(window.location.search);

  const title = params.get("title") ?? "Unknown Title";
  const quality = params.get("quality") ?? "";
  const size = params.get("size") ?? "";
  const format = params.get("format") ?? "MP4";
  const fileUrl = params.get("url") ?? "";
  const poster = params.get("poster") ?? "";
  const backHref = params.get("back") ?? "/";

  const safeName = `${title.replace(/[^\w\s.-]+/g, "").trim() || "video"}-${quality || "hd"}.mp4`;

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

  async function startDownload() {
    if (!fileUrl) {
      setStatus("error");
      setErrorMsg("No download URL was provided. Go back and pick a quality again.");
      return;
    }

    setStatus("preparing");
    setErrorMsg("");

    try {
      // Ask backend to remote-upload to PixelDrain (stable link) or fall back to proxy
      const res = await fetch("/api/prepare-download", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ url: fileUrl, filename: safeName }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data?.error || `Prepare failed (${res.status})`);
        return;
      }

      const downloadUrl = String(data.downloadUrl || "");
      if (!downloadUrl) {
        setStatus("error");
        setErrorMsg("No download link returned. Try again later.");
        return;
      }

      // PixelDrain or proxy URL — navigate so the browser downloads natively
      // (no loading a whole movie into JS memory)
      setFinalUrl(downloadUrl);
      setStatus("done");
      window.location.href = downloadUrl;
    } catch {
      setStatus("error");
      setErrorMsg("Network error while preparing download. Check your connection.");
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="w-full border-b border-border/30">
        <div className="container mx-auto px-4 py-3 max-w-5xl">
          <AdSlot label="Advertisement" />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl flex flex-col gap-8">
          <Link
            href={backHref}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> Back to title
          </Link>

          <div className="bg-zinc-900/60 border border-white/8 rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
            <div className="flex items-center gap-5 p-6 border-b border-white/5">
              {poster && (
                <img
                  src={poster}
                  alt={title}
                  className="w-16 h-24 object-cover rounded-lg border border-white/10 shrink-0"
                />
              )}
              <div className="flex flex-col gap-1 min-w-0">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
                  Preparing download
                </p>
                <h1 className="text-xl md:text-2xl font-display font-bold text-white leading-tight truncate">
                  {title}
                </h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {quality && (
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-primary/20 text-primary border border-primary/30 uppercase tracking-wider">
                      {quality}
                    </span>
                  )}
                  <span className="text-xs text-zinc-400">{format || "MP4"}</span>
                  {size && <span className="text-xs text-zinc-400">{size}</span>}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-6 py-12 px-6">
              {status === "countdown" && (
                <>
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 96 96">
                      <circle
                        cx="48"
                        cy="48"
                        r="44"
                        fill="none"
                        stroke="rgba(124,58,237,0.15)"
                        strokeWidth="6"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="44"
                        fill="none"
                        stroke="hsl(262 83% 58%)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 44}`}
                        strokeDashoffset={`${2 * Math.PI * 44 * (seconds / COUNTDOWN)}`}
                        style={{ transition: "stroke-dashoffset 1s linear" }}
                      />
                    </svg>
                    <span className="text-4xl font-display font-bold text-white tabular-nums">
                      {seconds}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-center max-w-xs">
                    Starting in{" "}
                    <span className="text-white font-semibold">{seconds}</span>s
                  </p>
                  <Button
                    size="lg"
                    className="rounded-full px-10 font-bold shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90"
                    onClick={() => {
                      startedRef.current = true;
                      void startDownload();
                    }}
                  >
                    <Download className="w-5 h-5 mr-2" /> Download MP4
                  </Button>
                </>
              )}

              {status === "preparing" && (
                <>
                  <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="text-zinc-300 text-center max-w-xs">
                    Preparing a stable download link… this can take up to a minute
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

          <p className="text-center text-xs text-zinc-600 leading-relaxed">
            Files are fetched by PixelDrain from third-party sources when configured. Prefer
            360p / 480p on mobile if a link fails.
          </p>
        </div>
      </div>
    </div>
  );
}
