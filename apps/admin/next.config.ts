import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app is entirely client components with no cookies()/Server
  // Actions/route handlers/image-optimization usage, so it can build to
  // plain static HTML/CSS/JS — no Node server needed to host it. See
  // docs/decisions/2026-08-25-onseol-admin-app-split-decisions.md.
  output: "export",
  // packages/{ui,api,utils} are source-only (no build step) — transpile
  // them as part of this app's own build instead of expecting pre-compiled
  // output.
  transpilePackages: ["ui", "api", "utils"],
};

export default nextConfig;
