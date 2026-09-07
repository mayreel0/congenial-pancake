"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeSignup as apiCompleteSignup,
  fetchCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  signup as apiSignup,
  updateNickname as apiUpdateNickname,
  updateProfileVisibility as apiUpdateProfileVisibility,
  type CurrentUser,
  type ProfileVisibilityPatch,
} from "../api";

export const authKeys = {
  me: ["auth", "me"] as const,
};

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: fetchCurrentUser,
    // 401(비로그인)이든 네트워크 에러든 재시도할 이유가 없다 — 바로 실패로
    // 확정해야 "로그인 안 됨" 상태로 넘어갈 수 있다.
    retry: false,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiLogin(email, password),
    onSuccess: (user: CurrentUser) => {
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

// Just requests the signup email — no session/user results from this, so
// nothing to cache. Calling it again for the same address is a "resend."
export function useSignupMutation() {
  return useMutation({
    mutationFn: (email: string) => apiSignup(email),
  });
}

// Consumes the emailed link — this is what actually creates the account
// and logs it in, so this one does update the cache.
export function useCompleteSignupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      apiCompleteSignup(token, password),
    onSuccess: (user: CurrentUser) => {
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

export function useUpdateNicknameMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (nickname: string) => apiUpdateNickname(nickname),
    onSuccess: (user: CurrentUser) => {
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

export function useUpdateProfileVisibilityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: ProfileVisibilityPatch) =>
      apiUpdateProfileVisibility(patch),
    onSuccess: (user: CurrentUser) => {
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiLogout,
    onSuccess: () => {
      queryClient.setQueryData(authKeys.me, null);
    },
  });
}
