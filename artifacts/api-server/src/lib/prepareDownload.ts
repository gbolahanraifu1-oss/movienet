import { remoteUploadToPixeldrain, hasPixeldrainKey } from "./pixeldrain.js";

const VPS_URL = (process.env.DOWNLOAD_VPS_URL || "").replace(/\/$/, "");
const VPS_SECRET = process.env.DOWNLOAD_VPS_SECRET || "";

type FetchResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  headers: { get(name: string): string | null };
};

async function tryVpsLeech(
  url: string,
  filename: string
): Promise<
  | { ok: true; downloadUrl: string; pageUrl?: string; id?: string; mode: string }
  | { ok: false; error: string; status?: number }
> {
  if (!VPS_URL) return { ok: false, error: "DOWNLOAD_VPS_URL not set" };

  try {
    const res = (await fetch(`${VPS_URL}/leech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(VPS_SECRET ? { "X-Download-Secret": VPS_SECRET } : {}),
      },
      body: JSON.stringify({ url, filename, referer: "https://vidlink.pro/" }),
      signal: AbortSignal.timeout(300000),
    })) as unknown as FetchResponse;

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      if (res.ok && (res.headers.get("content-type") || "").includes("video")) {
        return {
          ok: true,
          mode: "vps-stream",
          downloadUrl: `${VPS_URL}/leech?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}${VPS_SECRET ? `&secret=${encodeURIComponent(VPS_SECRET)}` : ""}`,
        };
      }
      return {
        ok: false,
        error: `VPS non-JSON (${res.status})`,
        status: res.status,
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        error: data?.error || `VPS HTTP ${res.status}`,
        status: res.status,
      };
    }

    if (data.downloadUrl) {
      return {
        ok: true,
        mode: data.mode || "vps",
        downloadUrl: data.downloadUrl,
        pageUrl: data.pageUrl,
        id: data.id,
      };
    }

    return { ok: false, error: "VPS returned no downloadUrl" };
  } catch (e: any) {
    return { ok: false, error: `VPS error: ${e?.message || e}` };
  }
}

async function handlePrepare(req: any, res: any): Promise<void> {
  const url = String(req.body?.url || req.query?.url || "");
  const filename = String(req.body?.filename || req.query?.filename || "video.mp4");

  if (!url.startsWith("https://")) {
    res.status(400).json({ error: "Invalid url" });
    return;
  }

  // 1) Prefer VPS
  if (VPS_URL) {
    const vps = await tryVpsLeech(url, filename);
    if (vps.ok) {
      res.json({
        mode: vps.mode,
        downloadUrl: vps.downloadUrl,
        pageUrl: vps.pageUrl ?? null,
        id: vps.id ?? null,
      });
      return;
    }
    if (vps.status === 429 || /429|rate-?limit/i.test(vps.error)) {
      res.status(429).json({
        mode: "failed",
        error: vps.error,
        hint: "CDN rate-limits this file even from the VPS. Wait and retry, or use Watch.",
      });
      return;
    }
    // fall through to local PixelDrain
  }

  // 2) Local PixelDrain rehost
  if (hasPixeldrainKey()) {
    const pd = await remoteUploadToPixeldrain(url, filename);
    if (pd.ok) {
      res.json({
        mode: "pixeldrain",
        downloadUrl: pd.downloadUrl,
        pageUrl: pd.pageUrl,
        id: pd.id,
      });
      return;
    }
    const isRateLimit =
      pd.status === 429 || /rate-?limit|429/i.test(pd.error || "");
    res.status(isRateLimit ? 429 : 502).json({
      mode: "failed",
      error: pd.error,
      hint: isRateLimit
        ? "CDN rate-limits Vercel IPs. Set DOWNLOAD_VPS_URL to your VPS worker."
        : "Rehost failed.",
    });
    return;
  }

  res.status(503).json({
    mode: "none",
    error:
      "No download backend configured. Set DOWNLOAD_VPS_URL (recommended) or PIXELDRAIN_API_KEY.",
  });
}

export function registerPrepareDownload(app: any): void {
  app.post("/api/prepare-download", handlePrepare);
  app.get("/api/prepare-download", handlePrepare);
}
