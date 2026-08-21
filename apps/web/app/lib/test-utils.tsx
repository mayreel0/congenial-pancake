import { render as rtlRender, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { AuthProvider } from "./auth/AuthContext";

// Every page renders ServiceNav, which reads auth state via useAuth() — so
// any component test that touches the app shell needs an AuthProvider in
// scope. vitest.setup.ts already mocks fetch to resolve as "not logged in"
// by default, so this is safe to wrap unconditionally.
export function render(ui: ReactElement, options?: RenderOptions) {
  return rtlRender(ui, { wrapper: AuthProvider, ...options });
}

export * from "@testing-library/react";
