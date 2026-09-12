import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { toast } from "ui/useToast";

// Exported so a test can assert AdminGate/AdminStatusGate actually
// redirected (e.g. `expect(mockRouterReplace).toHaveBeenCalledWith("/review")`)
// — a plain per-call `useRouter()` mock object would give each render a new
// `replace` function with nothing to assert against.
export const mockRouterReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockRouterReplace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Default every test to "not logged in" so components don't need real
// network access. Tests that care override with vi.stubGlobal("fetch", ...).
beforeEach(() => {
  mockRouterReplace.mockClear();
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
  // toast (ui/useToast) is a module-level singleton, not per-render state
  // — without this, a toast/its dismiss timer left over from one test
  // could leak into the next.
  toast.dismiss();
});
