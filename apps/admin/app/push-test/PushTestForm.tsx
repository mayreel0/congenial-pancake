"use client";

import { useState, type FormEvent } from "react";
import { sendTestPushSchema } from "shared/dto";
import { parseFieldErrors } from "shared/zod-form";
import { Button } from "ui/Button";
import { TextField } from "ui/TextField";
import { Toggle } from "ui/Toggle";
import { BUTTON_PENDING_MIN_MS, useMinDisplayDuration } from "ui/useMinDisplayDuration";
import { useFieldValidation } from "ui/useFieldValidation";
import type { usePushTestAdmin } from "./usePushTestAdmin";

type Field = "email";

type PushTestFormProps = {
  sending: boolean;
  sendError: string | null;
  subscriptionCount: number | null;
  send: ReturnType<typeof usePushTestAdmin>["send"];
  reset: ReturnType<typeof usePushTestAdmin>["reset"];
};

// Sends a real web push (same WebPushService.sendToUser path a real reply
// uses) to a member looked up by email — for verifying push delivery
// works without needing a real reply. "알림 목록에도 남기기" is off by
// default: a pure delivery probe shouldn't always leave a trace in
// someone's /notifications inbox.
export function PushTestForm({
  sending,
  sendError,
  subscriptionCount,
  send,
  reset,
}: PushTestFormProps) {
  const [email, setEmail] = useState("");
  const [persist, setPersist] = useState(false);
  const { touchAll, visibleError } = useFieldValidation<Field>();

  const fieldErrors = parseFieldErrors(sendTestPushSchema, { email, persist });
  const showSpinner = useMinDisplayDuration(sending, BUTTON_PENDING_MIN_MS);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    touchAll(["email"]);
    if (Object.keys(fieldErrors).length > 0) return;

    await send({ email, persist });
  }

  return (
    <>
      <h1 className="text-lg font-semibold text-foreground">알림 테스트</h1>
      <div className="space-y-6">
        <form
          className="space-y-3"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <TextField
            error={visibleError("email", fieldErrors)}
            hint="이 계정으로 구독된 모든 기기에 테스트 푸시를 보냅니다."
            id="email"
            label="이메일"
            required
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.currentTarget.value);
              reset();
            }}
          />

          <Toggle
            checked={persist}
            label="알림 목록에도 남기기"
            onChange={(checked) => {
              setPersist(checked);
              reset();
            }}
          />

          {sendError && <p className="text-sm text-red-600">{sendError}</p>}

          <Button
            disabled={Object.keys(fieldErrors).length > 0 || showSpinner}
            pending={showSpinner}
            type="submit"
          >
            테스트 알림 보내기
          </Button>
        </form>

        {subscriptionCount !== null && (
          <div className="space-y-1 rounded-lg border border-line bg-surface p-4">
            {subscriptionCount > 0 ? (
              <p className="text-sm text-foreground">
                {subscriptionCount}개 기기로 전송했어요.
              </p>
            ) : (
              <p className="text-sm text-amber-600">
                이 계정은 구독된 기기가 없어요.
              </p>
            )}
            <p className="text-xs text-muted">
              웹 푸시는 전송 확인만 가능하고 실제 수신 여부는 알 수 없어요.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
