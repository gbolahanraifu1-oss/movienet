/**
 * PixelDrain remote upload (leech).
 * Env: PIXELDRAIN_API_KEY from https://pixeldrain.com/user/api_keys
 *
 * Auth: HTTP Basic, username empty, password = API key
 *   Authorization: Basic base64(":" + key)
 */

const PD_BASE = "https://pixeldrain.com/api";

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
  json: () => Promise<any>;
  text: () => Promise<string>;
};

function basicAuthHeader(key: string): string {
  const token = Buffer.from(`:${key}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export type PixeldrainResult =
  | { ok: true; id: string; downloadUrl: string; pageUrl: string }
  | { ok: false; error: string; status?: number; raw?: string };

/**
 * Ask PixelDrain to pull a remote URL into their storage.
 */
export async function remoteUploadToPixeldrain(
  sourceUrl: string,
  fileName: string
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

  // Try form-urlencoded first (most common), then JSON
  const attempts: Array<{
    headers: Record<string, string>;
    body: string;
  }> = [
    {
      headers: {
        Authorization: basicAuthHeader(key),
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({ url: sourceUrl, name: safeName }).toString(),
    },
    {
      headers: {
        Authorization: basicAuthHeader(key),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ url: sourceUrl, name: safeName }),
    },
  ];

  let lastError = "PixelDrain upload failed";
  let lastStatus = 0;
  let lastRaw = "";

  for (const attempt of attempts) {
    try {
      const res = (await fetch(`${PD_BASE}/file/url`, {
        method: "POST",
        headers: attempt.headers,
        body: attempt.body,
        signal: AbortSignal.timeout(120000),
      })) as unknown as FetchResponse;

      const text = await res.text();
      lastRaw = text.slice(0, 500);
      lastStatus = res.status;

      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        lastError = `PixelDrain returned non-JSON (${res.status})`;
        continue;
      }

      if (data?.success === false) {
        lastError =
          data.message ||
          data.value ||
          `PixelDrain error (${res.status})`;
        // auth errors won't succeed on next attempt either
        if (data.value === "authentication_required") {
          return {
            ok: false,
            error:
              "PixelDrain rejected the API key. Check PIXELDRAIN_API_KEY on Vercel (redeploy after setting).",
            status: res.status,
            raw: lastRaw,
          };
        }
        continue;
      }

      const id =
        (typeof data?.id === "string" && data.id) ||
        (typeof data?.value === "string" && data.value) ||
        (typeof data?.value?.id === "string" && data.value.id) ||
        null;

      if (!id) {
        lastError = "PixelDrain response had no file id";
        continue;
      }

      return {
        ok: true,
        id,
        downloadUrl: `https://pixeldrain.com/api/file/${id}?download`,
        pageUrl: `https://pixeldrain.com/u/${id}`,
      };
    } catch (e: any) {
      lastError = e?.message || "PixelDrain network error";
    }
  }

  return {
    ok: false,
    error: lastError,
    status: lastStatus || undefined,
    raw: lastRaw || undefined,
  };
}
