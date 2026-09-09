import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["tttwg.iptime.org"],
  // dev-only on-screen route indicator — off since it kept flashing back on
  // every HMR reconnect.
  devIndicators: false,
  // packages/{ui,api,utils,shared} are source-only (no build step) —
  // transpile them as part of this app's own build instead of expecting
  // pre-compiled output.
  transpilePackages: ["ui", "api", "utils", "shared"],
};

export default nextConfig;
