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

// AuthProvider calls /auth/me on mount. Default every test to "not logged
// in" so components that render it (most of the app, via ServiceNav) don't
// need real network access. Tests that care about auth state override this.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({
          statusCode: 401,
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        }),
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});
