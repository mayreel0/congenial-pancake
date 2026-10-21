const { test } = require("node:test");
const assert = require("node:assert/strict");
const { vpnNextConfig } = require("./vpn-next-config.cjs");

test("ordinary development and production keep their original config", () => {
  assert.equal(vpnNextConfig({ NODE_ENV: "development" }), undefined);
  assert.equal(vpnNextConfig({ NODE_ENV: "production" }), undefined);
});

test("VPN clients always use a relative API, even with a stale production URL", async () => {
  const config = vpnNextConfig({
    NODE_ENV: "development",
    DEV_VPN_HOST: "192.168.50.10",
    NEXT_PUBLIC_API_BASE_URL: "https://api.example.com",
  });
  assert.deepEqual(config.env, { NEXT_PUBLIC_API_BASE_URL: "/api" });
  assert.deepEqual(config.allowedDevOrigins, ["192.168.50.10"]);
  assert.deepEqual(await config.rewrites(), [
    { source: "/api/:path*", destination: "http://127.0.0.1:8080/:path*" },
  ]);
});

test("VPN config fails closed outside development or for non-private hosts", () => {
  assert.throws(() => vpnNextConfig({ NODE_ENV: "production", DEV_VPN_HOST: "10.0.0.10" }));
  for (const host of ["example.com", "*", "127.0.0.1", "203.0.113.10", "192.168.1.999", "http://10.0.0.10", "100.63.255.255", "100.128.0.0"]) {
    assert.throws(() => vpnNextConfig({ NODE_ENV: "development", DEV_VPN_HOST: host }));
  }
});

test("accepts configured LAN and Tailscale hosts without allowing the entire subnet", () => {
  const config = vpnNextConfig({
    NODE_ENV: "development",
    DEV_VPN_HOST: "100.64.0.1",
    DEV_VPN_ADDITIONAL_HOSTS: " 192.168.50.10,100.127.255.254,100.64.0.1 ",
  });
  assert.deepEqual(config.allowedDevOrigins, [
    "100.64.0.1", "192.168.50.10", "100.127.255.254",
  ]);
  assert.equal(config.env.NEXT_PUBLIC_API_BASE_URL, "/api");
});

test("rejects invalid additional hosts and additional hosts without opt-in", () => {
  assert.throws(() => vpnNextConfig({ DEV_VPN_ADDITIONAL_HOSTS: "10.0.0.10" }));
  for (const hosts of ["10.0.0.10,", "0.0.0.0", "203.0.113.10", "100.128.0.0", "https://example.com"]) {
    assert.throws(() => vpnNextConfig({
      NODE_ENV: "development", DEV_VPN_HOST: "10.0.0.10", DEV_VPN_ADDITIONAL_HOSTS: hosts,
    }));
  }
});
