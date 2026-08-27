"use client";

import { useRouter } from "next/navigation";
import type { CurrentUser } from "../api";
import {
  useCurrentUserQuery,
  useLoginMutation,
  useLogoutMutation,
  useSignupMutation,
} from "./queries";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type UseAuthResult = {
  status: AuthStatus;
  user: CurrentUser | null;
  login(email: string, password: string): Promise<void>;
  signup(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
};

function toAuthStatus(isPending: boolean, hasUser: boolean): AuthStatus {
  if (isPending) return "loading";
  if (hasUser) return "authenticated";
  return "anonymous";
}

export function useAuth(): UseAuthResult {
  const router = useRouter();
  const meQuery = useCurrentUserQuery();
  const loginMutation = useLoginMutation();
  const signupMutation = useSignupMutation();
  const logoutMutation = useLogoutMutation();

  const status = toAuthStatus(meQuery.isPending, Boolean(meQuery.data));

  async function login(email: string, password: string): Promise<void> {
    await loginMutation.mutateAsync({ email, password });
  }

  async function signup(email: string, password: string): Promise<void> {
    await signupMutation.mutateAsync({ email, password });
  }

  async function logout(): Promise<void> {
    await logoutMutation.mutateAsync();
    // Otherwise the current page just quietly drops its login state, and it's
    // easy to miss that logout actually worked.
    router.push("/");
  }

  async function refresh(): Promise<void> {
    await meQuery.refetch();
  }

  return {
    status,
    user: meQuery.data ?? null,
    login,
    signup,
    logout,
    refresh,
  };
}
