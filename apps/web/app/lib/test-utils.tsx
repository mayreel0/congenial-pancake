import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as rtlRender, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

// Every page renders ServiceNav, which reads auth state via useAuth(), and
// useAuth() needs a QueryClientProvider in scope. Each render gets its own
// fresh QueryClient so cached /auth/me results don't leak between tests.
// vitest.setup.ts already mocks fetch to resolve as "not logged in" by
// default, so this is safe to wrap unconditionally.
function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function render(ui: ReactElement, options?: RenderOptions) {
  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

export * from "@testing-library/react";
