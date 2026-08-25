"use client";

import type { CurrentUser } from "../api";
import {
  useCurrentUserQuery,
  useLoginMutation,
  useLogoutMutation,
} from "./queries";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type UseAuthResult = {
  status: AuthStatus;
  user: CurrentUser | null;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
};

// No signup here — see lib/api.ts. This is a single-route app (no /today to
// redirect to on logout like apps/web has), so logout just clears the
// session; the page re-renders its own signed-out state.
export function useAuth(): UseAuthResult {
  const meQuery = useCurrentUserQuery();
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();

  const status: AuthStatus = meQuery.isPending
    ? "loading"
    : meQuery.data
      ? "authenticated"
      : "anonymous";

  async function login(email: string, password: string): Promise<void> {
    await loginMutation.mutateAsync({ email, password });
  }

  async function logout(): Promise<void> {
    await logoutMutation.mutateAsync();
  }

  return {
    status,
    user: meQuery.data ?? null,
    login,
    logout,
  };
}
