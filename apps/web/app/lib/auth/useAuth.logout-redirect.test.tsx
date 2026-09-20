import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "./useAuth";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const isStandaloneApp = vi.fn();
vi.mock("../standalone-app", () => ({
  isStandaloneApp: () => isStandaloneApp(),
}));

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

async function logoutAsMember() {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        id: "1",
        email: "test@example.com",
        createdAt: "2026-08-20T00:00:00.000Z",
      }),
  });
  const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
  await waitFor(() => expect(result.current.status).toBe("authenticated"));

  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    status: 204,
    json: () => Promise.resolve(undefined),
  });
  await act(async () => {
    await result.current.logout();
  });
}

describe("logout() destination", () => {
  beforeEach(() => {
    push.mockReset();
  });

  it("goes to the landing page from a browser tab", async () => {
    isStandaloneApp.mockReturnValue(false);
    await logoutAsMember();

    expect(push).toHaveBeenCalledWith("/");
  });

  it("goes straight to the app entry from the installed app, skipping the landing page", async () => {
    isStandaloneApp.mockReturnValue(true);
    await logoutAsMember();

    expect(push).toHaveBeenCalledWith("/login?returnTo=/today");
  });
});
