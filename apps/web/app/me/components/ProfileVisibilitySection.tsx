"use client";

import { useState } from "react";
import { Button } from "ui/Button";
import { Toggle } from "ui/Toggle";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth/useAuth";

type VisibilityDraft = {
  showRequestsOnProfile: boolean;
  showRepliesOnProfile: boolean;
  showCountsOnProfile: boolean;
};

const DEFAULT_DRAFT: VisibilityDraft = {
  showRequestsOnProfile: true,
  showRepliesOnProfile: true,
  showCountsOnProfile: true,
};

function draftFromUser(user: VisibilityDraft): VisibilityDraft {
  return {
    showRequestsOnProfile: user.showRequestsOnProfile,
    showRepliesOnProfile: user.showRepliesOnProfile,
    showCountsOnProfile: user.showCountsOnProfile,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "설정을 바꾸지 못했습니다. 잠시 후 다시 시도해주세요.";
}

export function ProfileVisibilitySection() {
  const { user, updateProfileVisibility } = useAuth();
  // Toggles only edit local draft state — a single "저장" sends all three
  // at once, rather than firing a PATCH per click (three quick clicks would
  // otherwise mean three separate round-trips). The parent only mounts this
  // once `user` is confirmed non-null (see MeContent), so the lazy
  // initializer below captures the real value on the meaningful first
  // render — DEFAULT_DRAFT is just a hooks-order-safe placeholder.
  const [draft, setDraft] = useState<VisibilityDraft>(
    user ? draftFromUser(user) : DEFAULT_DRAFT,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const isDirty =
    draft.showRequestsOnProfile !== user.showRequestsOnProfile ||
    draft.showRepliesOnProfile !== user.showRepliesOnProfile ||
    draft.showCountsOnProfile !== user.showCountsOnProfile;

  function updateDraft(field: keyof VisibilityDraft, value: boolean) {
    setError(null);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function resetDraft() {
    setError(null);
    setDraft(draftFromUser(user!));
  }

  async function handleSave(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      await updateProfileVisibility(draft);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">공개 프로필 설정</h2>
        <p className="text-xs text-muted">
          닉네임으로 공개한 글을 내 프로필 페이지에서 다른 사람도 볼 수 있는지
          정해요.
        </p>
      </div>
      <div className="space-y-3">
        {/* Toggle's root element is inline-flex, not block — without a
            wrapping div per toggle, space-y-3 has no effect between them
            since they'd all sit on one line instead of stacking. */}
        <div>
          <Toggle
            checked={draft.showRequestsOnProfile}
            label="내가 남긴 고민 목록 공개"
            onChange={(checked) => updateDraft("showRequestsOnProfile", checked)}
          />
        </div>
        <div>
          <Toggle
            checked={draft.showRepliesOnProfile}
            label="내가 남긴 답변 목록 공개"
            onChange={(checked) => updateDraft("showRepliesOnProfile", checked)}
          />
        </div>
        <div>
          <Toggle
            checked={draft.showCountsOnProfile}
            label="고민/답변 개수 공개"
            onChange={(checked) => updateDraft("showCountsOnProfile", checked)}
          />
        </div>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <Button
          disabled={pending || !isDirty}
          size="sm"
          type="button"
          onClick={() => void handleSave()}
        >
          {pending ? "저장하는 중" : "저장"}
        </Button>
        <Button
          disabled={pending || !isDirty}
          size="sm"
          type="button"
          variant="secondary"
          onClick={resetDraft}
        >
          취소
        </Button>
      </div>
    </section>
  );
}
