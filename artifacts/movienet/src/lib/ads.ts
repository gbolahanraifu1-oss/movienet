export type BannerAd = {
  imageUrl: string;
  clickUrl: string;
  alt?: string;
};

export type VideoAd = {
  src: string;
  clickUrl?: string;
  durationSec: number;
  skipAfterSec: number;
};

function env(key: string, fallback = ""): string {
  try {
    const v = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.[key];
    return String(v || fallback).trim();
  } catch {
    return fallback;
  }
}

const HOUSE_BANNERS: BannerAd[] = [
  {
    imageUrl: "https://placehold.co/728x90/1a1a2e/a78bfa?text=MovieNet",
    clickUrl: "https://movienet.dpdns.org",
    alt: "Sponsored",
  },
];

export function getBannerAds(): BannerAd[] {
  const img = env("VITE_AD_BANNER_IMAGE");
  const link = env("VITE_AD_BANNER_LINK");
  if (img && link) return [{ imageUrl: img, clickUrl: link, alt: "Sponsored" }];
  return HOUSE_BANNERS;
}

/** Return null when no VITE_AD_VIDEO_URL — preroll finishes immediately */
export function getVideoAd(): VideoAd | null {
  const src = env("VITE_AD_VIDEO_URL");
  if (!src) return null;
  return {
    src,
    clickUrl: env("VITE_AD_VIDEO_CLICK") || undefined,
    durationSec: Number(env("VITE_AD_VIDEO_DURATION") || 15),
    skipAfterSec: Number(env("VITE_AD_VIDEO_SKIP_AFTER") || 5),
  };
}

export function getPopunderUrl(): string {
  return env("VITE_AD_POPUNDER_URL");
}

export function tryPopunder(reason: "banner" | "page" = "page"): void {
  const url = getPopunderUrl();
  if (!url || typeof window === "undefined") return;
  try {
    const key = "mn_pu_" + reason;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const w = window.open(url, "_blank");
    if (w) {
      try {
        w.blur();
        window.focus();
      } catch {
        /* */
      }
    }
  } catch {
    /* blocked */
  }
}

export function pickBanner(): BannerAd {
  const list = getBannerAds();
  return list[Math.floor(Math.random() * list.length)] || list[0];
}
