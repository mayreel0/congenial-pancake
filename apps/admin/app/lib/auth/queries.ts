"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  type CurrentUser,
} from "../api";

const authKeys = {
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

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiLogout,
    onSuccess: () => {
      // clear() first so no other admin's cached data (신고 검토/고민 관리/
      // 답변 관리 목록 등) can leak into a shared machine's next session —
      // then immediately re-set the auth query so the "signed out" UI
      // still renders instantly instead of flashing a loading state while
      // it refetches.
      queryClient.clear();
      queryClient.setQueryData(authKeys.me, null);
    },
  });
}
