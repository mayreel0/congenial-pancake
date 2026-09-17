import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "./useAuth";

function mockFetchOnce(response: {
  ok: boolean;
  status: number;
  body: unknown;
}) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: response.ok,
    status: response.status,
    json: () => Promise.resolve(response.body),
  });
}

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// logout()'s "clear the whole cache" test needs to seed and inspect a
// query client shared with the hook under test, unlike every other test
// here — Wrapper's own per-render client isn't reachable from outside it.
function createSharedWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function SharedWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }
  return { queryClient, SharedWrapper };
}

describe("useAuth", () => {
  it("resolves to anonymous when /auth/me returns 401", async () => {
    // vitest.setup.ts already mocks fetch to 401 by default.
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("anonymous"));
    expect(result.current.user).toBeNull();
  });

  it("resolves to authenticated when /auth/me returns a user", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      body: { id: "1", email: "test@example.com", createdAt: "2026-08-20T00:00:00.000Z" },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.user?.email).toBe("test@example.com");
  });

  it("login() updates status and user on success", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe("anonymous"));

    mockFetchOnce({
      ok: true,
      status: 200,
      body: { id: "1", email: "test@example.com", createdAt: "2026-08-20T00:00:00.000Z" },
    });

    await act(async () => {
      await result.current.login("test@example.com", "password123");
    });

    // Login sets query data via the mutation's onSuccess callback, which
    // React Query notifies through its own microtask batching — one more
    // than a single `act()` await reliably flushes — so wait for the
    // re-render instead of asserting immediately.
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.user?.email).toBe("test@example.com");
  });

  it("logout() clears user and returns to anonymous", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      body: { id: "1", email: "test@example.com", createdAt: "2026-08-20T00:00:00.000Z" },
    });
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    mockFetchOnce({ ok: true, status: 204, body: undefined });

    await act(async () => {
      await result.current.logout();
    });

    await waitFor(() => expect(result.current.status).toBe("anonymous"));
    expect(result.current.user).toBeNull();
  });

  it("logout() clears every other cached query, not just the auth one", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      body: { id: "1", email: "test@example.com", createdAt: "2026-08-20T00:00:00.000Z" },
    });
    const { queryClient, SharedWrapper } = createSharedWrapper();
    const { result } = renderHook(() => useAuth(), { wrapper: SharedWrapper });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    // Stand-in for another admin's cached data (신고 검토/고민 관리/답변 관리
    // 목록 등) — logout must not leave this behind on a shared machine.
    queryClient.setQueryData(["admin", "requests"], [{ id: "leaked" }]);
    expect(queryClient.getQueryData(["admin", "requests"])).toBeDefined();

    mockFetchOnce({ ok: true, status: 204, body: undefined });

    await act(async () => {
      await result.current.logout();
    });

    await waitFor(() => expect(result.current.status).toBe("anonymous"));
    expect(queryClient.getQueryData(["admin", "requests"])).toBeUndefined();
  });
});
