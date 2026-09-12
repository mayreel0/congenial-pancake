import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as rtlRender, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { GlobalToast } from "ui/GlobalToast";

// GlobalToast mirrors the real root layout — toast.success()/toast.error()
// calls are now a module-level singleton with nothing rendering them
// unless something in the tree mounts this, same as production.
function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <GlobalToast />
    </QueryClientProvider>
  );
}

export function render(ui: ReactElement, options?: RenderOptions) {
  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

export * from "@testing-library/react";
