"use client";

import { useState } from "react";
import { ActionConfirmDialog } from "ui/ActionConfirmDialog";
import { Button } from "ui/Button";
import { Toggle } from "ui/Toggle";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth/useAuth";

type VisibilityDraft = {
  nicknameVisible: boolean;
  showRequestsOnProfile: boolean;
  showRepliesOnProfile: boolean;
  showCountsOnProfile: boolean;
};

const DEFAULT_DRAFT: VisibilityDraft = {
  nicknameVisible: true,
  showRequestsOnProfile: true,
  showRepliesOnProfile: true,
  showCountsOnProfile: true,
};

function draftFromUser(user: VisibilityDraft): VisibilityDraft {
  return {
    nicknameVisible: user.nicknameVisible,
    showRequestsOnProfile: user.showRequestsOnProfile,
    showRepliesOnProfile: user.showRepliesOnProfile,
    showCountsOnProfile: user.showCountsOnProfile,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "설정을 바꾸지 못했습니다. 잠시 후 다시 시도해주세요.";
}

// One combined section for every "who can see this" toggle — nickname
// visibility used to live inside NicknameSection with its own immediate-fire
// toggle, but per user feedback every setting here (present and future)
// should follow the same edit → 저장 → confirm dialog → applied flow, so it
// moved in alongside the three profile-page switches rather than keeping a
// separate one-off pattern.
export function VisibilitySettingsSection() {
  const { user, updateProfileVisibility } = useAuth();
  // Toggles only edit local draft state; nothing is sent to the server
  // until the confirm dialog is accepted. The parent only mounts this once
  // `user` is confirmed non-null (see MeContent), so the lazy initializer
  // captures the real value on the meaningful first render —
  // DEFAULT_DRAFT is just a hooks-order-safe placeholder.
  const [draft, setDraft] = useState<VisibilityDraft>(
    user ? draftFromUser(user) : DEFAULT_DRAFT,
  );
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const isDirty =
    draft.nicknameVisible !== user.nicknameVisible ||
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

  async function handleConfirmSave(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      await updateProfileVisibility(draft);
      setConfirming(false);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">공개 설정</h2>
        <p className="text-xs text-muted">
          닉네임과, 닉네임으로 공개한 글을 다른 사람이 볼 수 있는지 정해요.
        </p>
      </div>
      <div className="space-y-3">
        {/* Toggle's root element is inline-flex, not block — without a
            wrapping div per toggle, space-y-3 has no effect between them
            since they'd all sit on one line instead of stacking. */}
        {user.nickname ? (
          <div>
            <Toggle
              checked={draft.nicknameVisible}
              label="닉네임 공개"
              onChange={(checked) => updateDraft("nicknameVisible", checked)}
            />
          </div>
        ) : null}
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
          disabled={!isDirty}
          size="sm"
          type="button"
          onClick={() => setConfirming(true)}
        >
          저장
        </Button>
        <Button
          disabled={!isDirty}
          size="sm"
          type="button"
          variant="secondary"
          onClick={resetDraft}
        >
          취소
        </Button>
      </div>
      <ActionConfirmDialog
        confirmLabel={pending ? "저장하는 중" : "저장"}
        message="공개 설정을 저장할까요?"
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void handleConfirmSave()}
      />
    </section>
  );
}
