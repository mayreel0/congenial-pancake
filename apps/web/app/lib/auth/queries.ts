"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  signup as apiSignup,
  type CurrentUser,
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

export function useSignupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiSignup(email, password),
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
