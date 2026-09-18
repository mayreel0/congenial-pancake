"use client";

import type { SendTestPushDto } from "shared/dto";
import { ApiError, errorMessage } from "../lib/api";
import { useSendTestPushMutation } from "../lib/admin/push-test-queries";

type UseSendTestPushResult = {
  sending: boolean;
  sendError: string | null;
  subscriptionCount: number | null;
  send(dto: SendTestPushDto): Promise<void>;
  reset(): void;
};

// Same 401/403 special-case as useAccountsAdmin's toIssueError — see that
// file's comment.
function toSendError(error: unknown): string | null {
  if (!error) return null;
  if (
    error instanceof ApiError &&
    (error.statusCode === 401 || error.statusCode === 403)
  ) {
    return "이 계정은 접근 권한이 없어요.";
  }
  if (error instanceof ApiError && error.statusCode === 404) {
    return "해당 이메일의 계정을 찾을 수 없어요.";
  }
  return errorMessage(error);
}

export function usePushTestAdmin(): UseSendTestPushResult {
  const sendMutation = useSendTestPushMutation();

  return {
    sending: sendMutation.isPending,
    sendError: toSendError(sendMutation.error),
    subscriptionCount: sendMutation.data?.subscriptionCount ?? null,
    send: (dto) => sendMutation.mutateAsync(dto).then(() => undefined),
    reset: () => sendMutation.reset(),
  };
}
