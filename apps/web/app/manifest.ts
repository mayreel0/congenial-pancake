import type { MetadataRoute } from "next";

// Next.js auto-detects this file and serves it at /manifest.webmanifest,
// auto-linking it in <head> — no manual <link rel="manifest"> needed,
// same convention as app/favicon.ico. icon files themselves live in
// public/ (see icons array below) since Next's dynamic image generation
// (like opengraph-image.tsx) isn't a fit for a set of fixed-size PNGs
// referenced by exact path/size from the manifest spec.
//
// theme_color/background_color match the dark theme's --background
// (#171411, apps/web/app/globals.css) since that's this app's default —
// /settings lets a member switch to light, but a freshly-installed PWA's
// splash screen has no user preference to read yet.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "온설",
    short_name: "온설",
    description: "짧은 위로 요청과 담백한 답장을 주고받는 서비스",
    start_url: "/",
    display: "standalone",
    background_color: "#171411",
    theme_color: "#171411",
    lang: "ko",
    // Only "any" purpose — the source art has its own rounded-corner
    // shape baked in (no alpha channel), not a full-bleed safe-zone
    // design, so declaring it "maskable" would let Android's own mask
    // shape reveal those baked-in corners instead of a clean edge. Add a
    // real maskable variant (content within the inner ~80% circle,
    // background filling all the way to the edges) if that's ever
    // designed separately.
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
