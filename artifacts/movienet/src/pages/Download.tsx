import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { AdSlot } from "../components/AdSlot";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

const COUNTDOWN = 5;

export function DownloadPage() {
  const params = new URLSearchParams(window.location.search);

  const title = params.get("title") ?? "Unknown Title";
  const poster = params.get("poster") ?? "";
  const backHref = params.get("back") ?? "/";
  const tmdbId = params.get("id") ?? "";
  const year = params.get("year") ?? "";

  const cleanTitle = title.replace(/\s*[—–-]\s*S\d+E\d+/i, "").trim() || title;

  const [seconds, setSeconds] = useState(COUNTDOWN);
  const [status, setStatus] = useState<"countdown" | "preparing" | "done" | "error">(
    "countdown"
  );
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
    setElapsed(0);
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

    try {
      const q = new URLSearchParams();
      if (tmdbId) q.set("tmdb", tmdbId);
      q.set("q", cleanTitle);
      if (year) q.set("year", year);

      const res = await fetch(`/api/nkiri?${q.toString()}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success || !data?.download) {
        setStatus("error");
        setErrorMsg(
          data?.error ||
            "No download found. Try another title spelling or use Watch."
        );
        return;
      }

      const downloadUrl = String(data.download);
      if (data.title) setResolvedTitle(String(data.title));

      setFinalUrl(downloadUrl);
      setStatus("done");
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.message || "Download failed");
    }
  }

  const elapsedLabel = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

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
                Secure download
              </p>
              <h1 className="text-xl font-display font-bold text-white leading-snug">
                {resolvedTitle}
              </h1>
              <p className="text-sm text-zinc-500 mt-1">Direct file · HD</p>
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-white/5 rounded-2xl p-8">
            <div className="flex flex-col items-center gap-4">
              {status === "countdown" && (
                <>
                  <div className="w-20 h-20 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-3xl font-bold text-white tabular-nums">
                    {seconds}
                  </div>
                  <p className="text-white font-semibold text-lg">Preparing</p>
                  <p className="text-zinc-400 text-sm text-center">
                    Your download starts in a moment.
                  </p>
                </>
              )}
              {status === "preparing" && (
                <>
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg tabular-nums">
                      {elapsedLabel}
                    </div>
                  </div>
                  <p className="text-white font-semibold text-lg">Locating file</p>
                  <p className="text-zinc-400 text-sm text-center max-w-xs">
                    Connecting to mirrors and resolving a direct link. This can
                    take up to a minute — timer shows progress.
                  </p>
                  <div className="w-full max-w-xs h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-primary/80 rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.min(95, 8 + elapsed * 3)}%`,
                      }}
                    />
                  </div>
                </>
              )}
              {status === "done" && (
                <>
                  <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                  </div>
                  <p className="text-white font-semibold text-lg">Ready</p>
                  {finalUrl && (
                    <a
                      href={finalUrl}
                      target="_blank"
                      rel="noopener"
                      className="flex items-center gap-2 bg-primary hover:bg-primary/90 rounded-full px-8 py-3 text-sm font-bold text-white"
                    >
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
