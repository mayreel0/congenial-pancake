"use client";

import { useState } from "react";
import { ActionConfirmDialog } from "ui/ActionConfirmDialog";
import { Button } from "ui/Button";
import { TextField } from "ui/TextField";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth/useAuth";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// null once the cooldown (if any) has already elapsed — matches the
// backend's own "may be in the past" contract for nicknameChangeAvailableAt
// (apps/api-server's UserResponseDto), so this is the one place that turns
// that raw timestamp into "how many days are actually left, if any."
function cooldownDaysRemaining(availableAt: string | null): number | null {
  if (!availableAt) return null;
  const remainingMs = new Date(availableAt).getTime() - Date.now();
  if (remainingMs <= 0) return null;
  return Math.ceil(remainingMs / MS_PER_DAY);
}

export function NicknameSection() {
  const { user, updateNickname, clearNickname } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  if (!user) return null;

  // Non-null only while an actual cooldown is in effect — first-time
  // setting has no nicknameChangeAvailableAt at all, and an elapsed
  // cooldown resolves to null too (see cooldownDaysRemaining above).
  const daysRemaining = cooldownDaysRemaining(user.nicknameChangeAvailableAt);
  const cooldownActive = daysRemaining !== null;

  function startEditing() {
    setDraft(user!.nickname ?? "");
    setError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await updateNickname(draft.trim());
      setEditing(false);
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setPending(false);
    }
  }

  async function handleConfirmClear(): Promise<void> {
    setClearing(true);
    try {
      await clearNickname();
      setConfirmingClear(false);
    } catch {
      // Clearing has no dedicated error UI — it's a simple, always-allowed
      // action (see UsersService.clearNickname), so a failure here is
      // unexpected. Leave the dialog open so the user can just retry.
    } finally {
      setClearing(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">닉네임</h2>
        <p className="text-xs text-muted">
          글이나 답장을 남길 때, 익명 대신 이 닉네임으로 남길지 매번 선택할 수
          있어요.
        </p>
      </div>

      {editing ? (
        <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
          <TextField
            id="nickname"
            label="닉네임"
            maxLength={20}
            value={draft}
            width="compact"
            onChange={(event) => setDraft(event.currentTarget.value)}
          />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <Button disabled={pending || !draft.trim()} size="sm" type="submit">
              {pending ? "저장하는 중" : "저장"}
            </Button>
            <Button
              disabled={pending}
              size="sm"
              type="button"
              variant="secondary"
              onClick={cancelEditing}
            >
              취소
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-foreground">
              {user.nickname ? (
                <>
                  {user.nickname}
                  <span className="text-muted">#{user.nicknameDiscriminator}</span>
                </>
              ) : (
                <span className="text-muted">아직 설정한 닉네임이 없어요.</span>
              )}
            </p>
            {cooldownActive ? (
              <p className="text-xs text-muted">
                {daysRemaining}일 후에 다시 바꿀 수 있어요.
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              disabled={cooldownActive}
              size="sm"
              type="button"
              onClick={startEditing}
            >
              {user.nickname ? "수정" : "설정하기"}
            </Button>
            {user.nickname ? (
              <Button
                size="sm"
                type="button"
                variant="secondary"
                onClick={() => setConfirmingClear(true)}
              >
                지우기
              </Button>
            ) : null}
          </div>
        </div>
      )}
      <ActionConfirmDialog
        confirmLabel={clearing ? "지우는 중" : "지우기"}
        message="닉네임을 지울까요? 지금까지 닉네임으로 공개했던 글도 모두 익명으로 바뀌어요."
        open={confirmingClear}
        onCancel={() => setConfirmingClear(false)}
        onConfirm={() => void handleConfirmClear()}
      />
    </section>
  );
}
