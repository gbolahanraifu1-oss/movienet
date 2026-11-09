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
  const format = params.get("format") ?? "MKV";
  const fileUrlParam = params.get("url") ?? "";
  const poster = params.get("poster") ?? "";
  const backHref = params.get("back") ?? "/";
  const tmdbId = params.get("id") ?? "";

  const [seconds, setSeconds] = useState(COUNTDOWN);
  const [status, setStatus] = useState<"countdown" | "preparing" | "done" | "error">(
    "countdown"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [finalUrl, setFinalUrl] = useState("");
  const [resolvedTitle, setResolvedTitle] = useState(title);
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
    setStatus("preparing");
    setErrorMsg("");

    try {
      let downloadUrl = fileUrlParam;

      // Prefer Nkiri VPS via MovieNet proxy (no secrets in browser)
      if (!downloadUrl || !downloadUrl.startsWith("http")) {
        const q = new URLSearchParams();
        if (tmdbId) q.set("tmdb", tmdbId);
        q.set("q", title.replace(/\s*[—–-]\s*S\d+E\d+/i, "").trim() || title);
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
        downloadUrl = String(data.download);
        if (data.title) setResolvedTitle(String(data.title));
      }

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
                Download
              </p>
              <h1 className="text-xl font-display font-bold text-white leading-snug">
                {resolvedTitle}
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                {quality && (
                  <span className="inline-block mr-2 px-2 py-0.5 rounded bg-primary/20 text-primary text-xs font-bold">
                    {quality}
                  </span>
                )}
                {format}
                {size ? ` · ${size}` : ""}
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
                  <p className="text-zinc-400 text-sm text-center">
                    Fetching a direct link…
                  </p>
                </>
              )}
              {status === "preparing" && (
                <>
                  <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-white font-semibold text-lg">Finding file…</p>
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
                  <p className="text-white font-semibold text-lg">Download failed</p>
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
