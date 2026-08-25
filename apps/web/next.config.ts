import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["tttwg.iptime.org"],
  // packages/ui is source-only (no build step) — transpile it as part of
  // this app's own build instead of expecting pre-compiled output.
  transpilePackages: ["ui"],
};

export default nextConfig;
