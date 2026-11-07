/**
 * PixelDrain upload via PUT /api/file/{name}
 * (Remote /file/url is not available — returns not_found.)
 *
 * Flow: fetch source with required Referer → stream body to PixelDrain.
 * Env: PIXELDRAIN_API_KEY
 */

const PD_BASE = "https://pixeldrain.com/api";
const DEFAULT_REFERER = "https://vidlink.pro/";

function apiKey(): string {
  return (
    process.env.PIXELDRAIN_API_KEY ||
    process.env.PIXEL_DRAIN_API_KEY ||
    ""
  ).trim();
}

export function hasPixeldrainKey(): boolean {
  return Boolean(apiKey());
}

type FetchResponse = {
  ok: boolean;
  status: number;
  body: import("node:stream/web").ReadableStream<Uint8Array> | null;
  headers: { get(name: string): string | null };
  arrayBuffer: () => Promise<ArrayBuffer>;
  text: () => Promise<string>;
  json: () => Promise<any>;
};

function basicAuthHeader(key: string): string {
  return `Basic ${Buffer.from(`:${key}`, "utf8").toString("base64")}`;
}

export type PixeldrainResult =
  | { ok: true; id: string; downloadUrl: string; pageUrl: string }
  | { ok: false; error: string; status?: number; raw?: string };

/**
 * Download sourceUrl (with Referer) and PUT the bytes to PixelDrain.
 * Works for moderate files; large movies may hit Vercel time/size limits.
 */
export async function remoteUploadToPixeldrain(
  sourceUrl: string,
  fileName: string,
  referer: string = DEFAULT_REFERER
): Promise<PixeldrainResult> {
  const key = apiKey();
  if (!key) {
    return { ok: false, error: "PIXELDRAIN_API_KEY not set on server" };
  }
  if (!sourceUrl.startsWith("https://")) {
    return { ok: false, error: "Source URL must be https" };
  }

  const safeName =
    fileName.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 180) || "video.mp4";

  // 1) Fetch source
  let upstream: FetchResponse;
  try {
    upstream = (await fetch(sourceUrl, {
      headers: {
        Referer: referer,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
      signal: AbortSignal.timeout(115000),
    })) as unknown as FetchResponse;
  } catch (e: any) {
    return { ok: false, error: `Source fetch failed: ${e?.message || e}` };
  }

  if (!upstream.ok) {
    const status = upstream.status;
    if (status === 429) {
      return {
        ok: false,
        error:
          "Source CDN rate-limited (429). Wait a few minutes and try again, or pick another quality.",
        status,
      };
    }
    return {
      ok: false,
      error: `Source returned HTTP ${status}`,
      status,
    };
  }

  // Buffer in memory — Vercel serverless can't easily pipe unknown streams to another fetch body in all runtimes
  let bytes: ArrayBuffer;
  try {
    bytes = await upstream.arrayBuffer();
  } catch (e: any) {
    return { ok: false, error: `Failed reading source body: ${e?.message || e}` };
  }

  if (!bytes || bytes.byteLength < 1000) {
    return {
      ok: false,
      error: `Source file too small (${bytes?.byteLength ?? 0} bytes) — likely blocked or expired`,
    };
  }

  // 2) PUT to PixelDrain
  try {
    const putRes = (await fetch(
      `${PD_BASE}/file/${encodeURIComponent(safeName)}`,
      {
        method: "PUT",
        headers: {
          Authorization: basicAuthHeader(key),
          "Content-Type":
            upstream.headers.get("content-type") || "application/octet-stream",
          Accept: "application/json",
        },
        body: bytes,
        signal: AbortSignal.timeout(115000),
      }
    )) as unknown as FetchResponse;

    const text = await putRes.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        ok: false,
        error: `PixelDrain returned non-JSON (${putRes.status})`,
        status: putRes.status,
        raw: text.slice(0, 300),
      };
    }

    if (data?.success === false) {
      return {
        ok: false,
        error: data.message || data.value || "PixelDrain upload rejected",
        status: putRes.status,
        raw: text.slice(0, 300),
      };
    }

    const id =
      (typeof data?.id === "string" && data.id) ||
      (typeof data?.value === "string" && data.value) ||
      null;

    if (!id) {
      return {
        ok: false,
        error: "PixelDrain response had no file id",
        raw: text.slice(0, 300),
      };
    }

    return {
      ok: true,
      id,
      downloadUrl: `https://pixeldrain.com/api/file/${id}?download`,
      pageUrl: `https://pixeldrain.com/u/${id}`,
    };
  } catch (e: any) {
    return { ok: false, error: `PixelDrain PUT failed: ${e?.message || e}` };
  }
}
