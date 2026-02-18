"use client";

// In server mode (non-static), all traffic is proxied through Next.js rewrites.
// In static mode, the app is served directly by the Elysia backend.
export const host =
  process.env.NEXT_PUBLIC_IS_STATIC !== "true"
    ? ""  // All API paths are relative, proxied via Next.js rewrites
    : "";

export const public_path =
  process.env.NEXT_PUBLIC_IS_STATIC !== "true" ? "/" : "/static/";

export const isStaticMode = process.env.NEXT_PUBLIC_IS_STATIC === "true";

/**
 * Navigate to a page. In static mode, uses window.location for full page
 * navigation (since Next.js client-side router can't handle separate HTML pages).
 */
export function navigateTo(path: string, replace = false) {
  if (isStaticMode) {
    if (replace) {
      window.location.replace(path);
    } else {
      window.location.assign(path);
    }
  } else {
    // In server mode, fall back to window.location as well.
    // The caller can use Next.js router if preferred.
    if (replace) {
      window.location.replace(path);
    } else {
      window.location.assign(path);
    }
  }
}

export const getWebsocketHost = () => {
  if (process.env.NEXT_PUBLIC_IS_STATIC === "true") {
    // Static mode: app is served by FastAPI, derive WebSocket URL from browser location
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const current_host = window.location.host;
    return `${protocol}//${current_host}/ws/`;
  }

  // Server mode: WebSocket connects directly to Elysia backend.
  // Next.js rewrites don't support WebSocket; Elysia must bind to 0.0.0.0
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsPort = process.env.NEXT_PUBLIC_ELYSIA_WS_PORT || "8090";
  return `${protocol}//${window.location.hostname}:${wsPort}/ws/`;
};
