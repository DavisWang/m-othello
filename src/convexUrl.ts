/**
 * Vite inlines this at build time. Must be the sync/backend URL ending in .convex.cloud,
 * not .convex.site (HTTP actions / static host URL) — wrong host makes the client hang.
 */
export function parseConvexUrl(raw: string | undefined): { ok: true; url: string } | { ok: false; reason: string } {
  const url = raw?.trim();
  if (!url) {
    return { ok: false, reason: "missing" };
  }
  if (url === "undefined" || url === "null") {
    return { ok: false, reason: "literal" };
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "parse" };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "https" };
  }
  if (!parsed.hostname.endsWith(".convex.cloud")) {
    if (parsed.hostname.endsWith(".convex.site")) {
      return { ok: false, reason: "site_not_cloud" };
    }
    return { ok: false, reason: "host" };
  }
  return { ok: true, url: url.replace(/\/$/, "") };
}
