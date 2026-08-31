import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

// jsdom has no real IntersectionObserver — AnswerLog's reverse-infinite-
// scroll (and anything else using this pattern later) needs one to exist so
// construction doesn't throw. Exported so a test can grab the most recent
// instance and manually invoke its callback to simulate a sentinel
// scrolling into view.
export class MockIntersectionObserver implements IntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => [] as IntersectionObserverEntry[]);
}

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
  // vi.fn() (not a plain arrow fn) so a test that needs a specific dynamic
  // route param (e.g. /u/[slug]) can override it per-test via
  // vi.mocked(useParams).mockReturnValue({ slug: "..." }) — other mocks
  // above don't need this since nothing currently overrides them per-test.
  useParams: vi.fn(() => ({})),
}));

// AuthProvider calls /auth/me on mount, and useRequestsQuery calls
// GET /requests on mount (rendered by /today, via ServiceNav's app shell
// isn't involved here but the page itself is). Default every test to "not
// logged in" / "no requests yet" so components don't need real network
// access. Tests that care about either override with mockResolvedValueOnce.
beforeEach(() => {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
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
