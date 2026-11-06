import { useEffect, useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { AdSlot } from "../components/AdSlot";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, CheckCircle2 } from "lucide-react";

const COUNTDOWN = 5;

/** Same-origin proxy so the CDN Referer requirement is satisfied. */
function proxyDownloadUrl(cdnUrl: string, filename: string): string {
  if (!cdnUrl || cdnUrl.startsWith("magnet:")) return cdnUrl;
  const params = new URLSearchParams({
    url: cdnUrl,
    filename,
  });
  return `/api/proxy-download?${params.toString()}`;
}

export function DownloadPage() {
  const [location] = useLocation();
  void location;
  const params = new URLSearchParams(window.location.search);

  const title = params.get("title") ?? "Unknown Title";
  const quality = params.get("quality") ?? "";
  const size = params.get("size") ?? "";
  const format = params.get("format") ?? "MP4";
  const fileUrl = params.get("url") ?? "";
  const poster = params.get("poster") ?? "";
  const backHref = params.get("back") ?? "/";

  const safeName = `${title.replace(/[^\w\s.-]+/g, "").trim() || "video"}-${quality || "hd"}.mp4`;
  const downloadHref = proxyDownloadUrl(fileUrl, safeName);

  const [seconds, setSeconds] = useState(COUNTDOWN);
  const [triggered, setTriggered] = useState(false);
  const triggerRef = useRef(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  useEffect(() => {
    if (seconds > 0 || triggerRef.current) return;
    triggerRef.current = true;
    setTriggered(true);
    triggerDownload();
  }, [seconds]);

  function triggerDownload() {
    if (!downloadHref) return;
    // Force download via hidden anchor (works better than location.href on mobile)
    const a = document.createElement("a");
    a.href = downloadHref;
    a.setAttribute("download", safeName);
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function handleManual() {
    setTriggered(true);
    triggerDownload();
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
              {!triggered ? (
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
                    Your download will start automatically in{" "}
                    <span className="text-white font-semibold">{seconds}</span> second
                    {seconds !== 1 ? "s" : ""}
                  </p>
                  <Button
                    size="lg"
                    className="rounded-full px-10 font-bold shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90"
                    onClick={handleManual}
                    disabled={!downloadHref}
                  >
                    <Download className="w-5 h-5 mr-2" /> Download MP4
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                  </div>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <p className="text-white font-semibold text-lg">Download started</p>
                    <p className="text-zinc-400 text-sm max-w-xs">
                      If nothing started, tap the button below. Files are direct MP4
                      downloads (not torrents).
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 px-6 pb-6">
              {downloadHref && (
                <a
                  href={downloadHref}
                  download={safeName}
                  className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-white/8 rounded-xl py-3 px-5 text-sm font-semibold text-white transition-colors"
                >
                  <Download className="w-4 h-4 text-primary" /> Download MP4 file
                </a>
              )}
            </div>
          </div>

          <AdSlot label="Advertisement" />

          <p className="text-center text-xs text-zinc-600 leading-relaxed">
            Direct file links are provided by third-party CDNs. MovieNet does not host video
            files on its own servers.
          </p>
        </div>
      </div>
    </div>
  );
}
