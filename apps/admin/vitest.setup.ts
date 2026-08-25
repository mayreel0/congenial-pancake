import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

// Default every test to "not logged in" so components don't need real
// network access. Tests that care override with vi.stubGlobal("fetch", ...).
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            statusCode: 401,
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          }),
      }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});
