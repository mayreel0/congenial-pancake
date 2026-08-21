import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

// AuthContext (and /login) call useRouter() — there's no real Next.js App
// Router in a plain RTL render, so every component that renders AuthProvider
// (effectively the whole app) needs this mocked.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// AuthProvider calls /auth/me on mount, and useRequestsQuery calls
// GET /requests on mount (rendered by /today, via ServiceNav's app shell
// isn't involved here but the page itself is). Default every test to "not
// logged in" / "no requests yet" so components don't need real network
// access. Tests that care about either override with mockResolvedValueOnce.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/requests")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]),
        });
      }

      return Promise.resolve({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            statusCode: 401,
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          }),
      });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});
