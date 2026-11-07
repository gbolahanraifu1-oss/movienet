/**
 * PixelDrain remote upload (leech).
 * POST /api/file/url with Basic auth (username empty, password = API key)
 *
 * Env: PIXELDRAIN_API_KEY  (from https://pixeldrain.com/user/api_keys)
 *
 * Returns a stable browser download URL:
 *   https://pixeldrain.com/api/file/{id}?download
 */

const PD_BASE = "https://pixeldrain.com/api";

function apiKey(): string {
  return process.env.PIXELDRAIN_API_KEY || process.env.PIXEL_DRAIN_API_KEY || "";
}

export function hasPixeldrainKey(): boolean {
  return Boolean(apiKey());
}

type FetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<any>;
  text: () => Promise<string>;
};

function basicAuthHeader(key: string): string {
  // PixelDrain: username empty, password = API key
  const token = Buffer.from(`:${key}`).toString("base64");
  return `Basic ${token}`;
}

/**
 * Ask PixelDrain to pull a remote URL into their storage.
 * PixelDrain does the download — your server uses almost no bandwidth.
 */
export async function remoteUploadToPixeldrain(
  sourceUrl: string,
  fileName: string
): Promise<{ id: string; downloadUrl: string; pageUrl: string } | null> {
  const key = apiKey();
  if (!key) return null;
  if (!sourceUrl.startsWith("https://")) return null;

  const safeName =
    fileName.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 180) || "video.mp4";

  try {
    // Official remote URL endpoint (requires API key)
    const body = new URLSearchParams();
    body.set("url", sourceUrl);
    body.set("name", safeName);

    const res = (await fetch(`${PD_BASE}/file/url`, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(key),
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(120000),
    })) as unknown as FetchResponse;

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok || !data) {
      console.error("[pixeldrain] remote upload failed", res.status, text.slice(0, 300));
      return null;
    }

    // Responses vary: { id }, { success, id }, { value: id }
    const id = data.id || data.value?.id || data.value || null;
    if (!id || typeof id !== "string") {
      console.error("[pixeldrain] no id in response", data);
      return null;
    }

    return {
      id,
      // Force download attachment
      downloadUrl: `https://pixeldrain.com/api/file/${id}?download`,
      pageUrl: `https://pixeldrain.com/u/${id}`,
    };
  } catch (e) {
    console.error("[pixeldrain] error", e);
    return null;
  }
}
