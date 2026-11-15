/** Guest download limit — streams always require auth. */

export const GUEST_DOWNLOAD_LIMIT = 5;
const STORAGE_KEY = "movienet_guest_downloads";

export function getGuestDownloadCount(): number {
  try {
    const n = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function remainingGuestDownloads(): number {
  return Math.max(0, GUEST_DOWNLOAD_LIMIT - getGuestDownloadCount());
}

/** Call after a successful download start for guests. */
export function recordGuestDownload(): number {
  const next = getGuestDownloadCount() + 1;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function guestCanDownload(): boolean {
  return getGuestDownloadCount() < GUEST_DOWNLOAD_LIMIT;
}