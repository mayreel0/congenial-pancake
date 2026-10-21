const { isIPv4 } = require("node:net");

/** @param {NodeJS.ProcessEnv} env */
function vpnNextConfig(env = process.env) {
  const host = env.DEV_VPN_HOST;
  const additionalHosts = env.DEV_VPN_ADDITIONAL_HOSTS?.trim();
  if (!host) {
    if (additionalHosts) throw new Error("DEV_VPN_ADDITIONAL_HOSTS requires DEV_VPN_HOST");
    return undefined;
  }

  if (env.NODE_ENV !== "development") {
    throw new Error("DEV_VPN_HOST is only supported by the development server");
  }
  const hosts = [...new Set([
    host,
    ...(additionalHosts ? additionalHosts.split(",").map((value) => value.trim()) : []),
  ])];
  for (const value of hosts) {
    if (
      !isIPv4(value) ||
      !/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(value)
    ) {
      throw new Error("VPN hosts must be PC IPv4 addresses in RFC1918 or 100.64.0.0/10");
    }
  }

  return {
    allowedDevOrigins: hosts,
    // Override stale .env.local API URLs in both clients, including OAuth and SSE.
    env: { NEXT_PUBLIC_API_BASE_URL: "/api" },
    async rewrites() {
      return [{ source: "/api/:path*", destination: "http://127.0.0.1:8080/:path*" }];
    },
  };
}

module.exports = { vpnNextConfig };
