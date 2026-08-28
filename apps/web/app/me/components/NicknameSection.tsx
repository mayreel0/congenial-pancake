"use client";

import { useState } from "react";
import { Button } from "ui/Button";
import { TextField } from "ui/TextField";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth/useAuth";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";
}

export function NicknameSection() {
  const { user, updateNickname } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

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
            <button
              className="text-xs font-medium text-muted transition hover:text-foreground"
              disabled={pending}
              type="button"
              onClick={cancelEditing}
            >
              취소
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-3">
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
          <Button size="sm" type="button" onClick={startEditing}>
            {user.nickname ? "수정" : "설정하기"}
          </Button>
        </div>
      )}
    </section>
  );
}
