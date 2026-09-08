"use client";

import { useRouter } from "next/navigation";
import type { CurrentUser, ProfileVisibilityPatch } from "../api";
import {
  useCompleteSignupMutation,
  useCurrentUserQuery,
  useLoginMutation,
  useLogoutMutation,
  useRestoreAccountMutation,
  useSignupMutation,
  useUpdateNicknameMutation,
  useUpdateProfileVisibilityMutation,
  useWithdrawMutation,
} from "./queries";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type UseAuthResult = {
  status: AuthStatus;
  user: CurrentUser | null;
  login(email: string, password: string): Promise<void>;
  signup(email: string): Promise<void>;
  completeSignup(token: string, password: string): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
  updateNickname(nickname: string): Promise<void>;
  updateProfileVisibility(patch: ProfileVisibilityPatch): Promise<void>;
  withdraw(immediate?: boolean): Promise<void>;
  restoreAccount(): Promise<void>;
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
  const completeSignupMutation = useCompleteSignupMutation();
  const logoutMutation = useLogoutMutation();
  const updateNicknameMutation = useUpdateNicknameMutation();
  const updateProfileVisibilityMutation = useUpdateProfileVisibilityMutation();
  const withdrawMutation = useWithdrawMutation();
  const restoreAccountMutation = useRestoreAccountMutation();

  const status = toAuthStatus(meQuery.isPending, Boolean(meQuery.data));

  async function login(email: string, password: string): Promise<void> {
    await loginMutation.mutateAsync({ email, password });
  }

  async function signup(email: string): Promise<void> {
    await signupMutation.mutateAsync(email);
  }

  async function completeSignup(token: string, password: string): Promise<void> {
    await completeSignupMutation.mutateAsync({ token, password });
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

  async function updateProfileVisibility(
    patch: ProfileVisibilityPatch,
  ): Promise<void> {
    await updateProfileVisibilityMutation.mutateAsync(patch);
  }

  async function withdraw(immediate?: boolean): Promise<void> {
    await withdrawMutation.mutateAsync(immediate);
  }

  async function restoreAccount(): Promise<void> {
    await restoreAccountMutation.mutateAsync();
  }

  return {
    status,
    user: meQuery.data ?? null,
    login,
    signup,
    completeSignup,
    logout,
    refresh,
    updateNickname,
    updateProfileVisibility,
    withdraw,
    restoreAccount,
  };
}
