import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";

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

describe("AuthContext", () => {
  it("resolves to anonymous when /auth/me returns 401", async () => {
    // vitest.setup.ts already mocks fetch to 401 by default.
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

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

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.user?.email).toBe("test@example.com");
  });

  it("login() updates status and user on success", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.status).toBe("anonymous"));

    mockFetchOnce({
      ok: true,
      status: 200,
      body: { id: "1", email: "test@example.com", createdAt: "2026-08-20T00:00:00.000Z" },
    });

    await act(async () => {
      await result.current.login("test@example.com", "password123");
    });

    expect(result.current.status).toBe("authenticated");
    expect(result.current.user?.email).toBe("test@example.com");
  });

  it("logout() clears user and returns to anonymous", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      body: { id: "1", email: "test@example.com", createdAt: "2026-08-20T00:00:00.000Z" },
    });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    mockFetchOnce({ ok: true, status: 204, body: undefined });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.status).toBe("anonymous");
    expect(result.current.user).toBeNull();
  });
});
