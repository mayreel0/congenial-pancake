import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

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
