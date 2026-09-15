import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { MockEventSource } from "../../../vitest.setup";
import { notificationKeys } from "./queries";
import { useNotificationStream } from "./useNotificationStream";

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useNotificationStream", () => {
  it("does not open a connection when disabled", () => {
    renderHook(() => useNotificationStream(false), { wrapper: Wrapper });

    expect(MockEventSource.instances).toHaveLength(0);
  });

  it("opens a credentialed connection to the stream endpoint when enabled", () => {
    renderHook(() => useNotificationStream(true), { wrapper: Wrapper });

    expect(MockEventSource.instances).toHaveLength(1);
    const source = MockEventSource.instances[0];
    expect(source.url).toContain("/notifications/stream");
    expect(source.eventSourceInitDict).toEqual({ withCredentials: true });
  });

  it("invalidates the unread-count and list queries on a server push", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    function FixedClientWrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    }
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    renderHook(() => useNotificationStream(true), {
      wrapper: FixedClientWrapper,
    });
    const source = MockEventSource.instances[0];
    source.onmessage?.({} as MessageEvent);

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: notificationKeys.unreadCount,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: notificationKeys.listAll,
    });
  });

  it("closes the connection on unmount", () => {
    const { unmount } = renderHook(() => useNotificationStream(true), {
      wrapper: Wrapper,
    });
    const source = MockEventSource.instances[0];

    unmount();

    expect(source.close).toHaveBeenCalled();
  });
});
