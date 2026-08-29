"use client";

import { useRouter } from "next/navigation";
import type { CurrentUser, ProfileVisibilityPatch } from "../api";
import {
  useClearNicknameMutation,
  useCurrentUserQuery,
  useLoginMutation,
  useLogoutMutation,
  useSignupMutation,
  useUpdateNicknameMutation,
  useUpdateProfileVisibilityMutation,
} from "./queries";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type UseAuthResult = {
  status: AuthStatus;
  user: CurrentUser | null;
  login(email: string, password: string): Promise<void>;
  signup(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
  updateNickname(nickname: string): Promise<void>;
  clearNickname(): Promise<void>;
  updateProfileVisibility(patch: ProfileVisibilityPatch): Promise<void>;
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
  const updateNicknameMutation = useUpdateNicknameMutation();
  const clearNicknameMutation = useClearNicknameMutation();
  const updateProfileVisibilityMutation = useUpdateProfileVisibilityMutation();

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

  async function updateNickname(nickname: string): Promise<void> {
    await updateNicknameMutation.mutateAsync(nickname);
  }

  async function clearNickname(): Promise<void> {
    await clearNicknameMutation.mutateAsync();
  }

  async function updateProfileVisibility(
    patch: ProfileVisibilityPatch,
  ): Promise<void> {
    await updateProfileVisibilityMutation.mutateAsync(patch);
  }

  return {
    status,
    user: meQuery.data ?? null,
    login,
    signup,
    logout,
    refresh,
    updateNickname,
    clearNickname,
    updateProfileVisibility,
  };
}
