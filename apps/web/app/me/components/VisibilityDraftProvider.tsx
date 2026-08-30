"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { ActionConfirmDialog } from "ui/ActionConfirmDialog";
import { Button } from "ui/Button";
import { ApiError, type CurrentUser } from "../../lib/api";
import { useAuth } from "../../lib/auth/useAuth";

export type VisibilityDraft = {
  nicknameVisible: boolean;
  showRequestsOnProfile: boolean;
  showRepliesOnProfile: boolean;
  showCountsOnProfile: boolean;
};

type VisibilityDraftContextValue = {
  draft: VisibilityDraft;
  setField(field: keyof VisibilityDraft, value: boolean): void;
};

const VisibilityDraftContext = createContext<VisibilityDraftContextValue | null>(
  null,
);

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

// Every "who can see this" toggle on /me — nickname visibility in
// NicknameSection, the three profile-page switches in
// ProfileVisibilitySection, and whatever gets added later — shares one
// draft, one 저장/취소 control, and one confirm dialog instead of each
// section owning its own. Toggles stay in whichever section they visually
// belong to; only the save/cancel/dialog mechanism is unified, rendered
// once here as a fixed bar at the bottom of the page. Mounted only once
// `user` is confirmed non-null (see MeContent), so this never has to
// handle a null user itself.
export function VisibilityDraftProvider({
  user,
  children,
}: {
  user: CurrentUser;
  children: ReactNode;
}) {
  const { updateProfileVisibility } = useAuth();
  const [draft, setDraft] = useState<VisibilityDraft>(() => draftFromUser(user));
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty =
    draft.nicknameVisible !== user.nicknameVisible ||
    draft.showRequestsOnProfile !== user.showRequestsOnProfile ||
    draft.showRepliesOnProfile !== user.showRepliesOnProfile ||
    draft.showCountsOnProfile !== user.showCountsOnProfile;

  function setField(field: keyof VisibilityDraft, value: boolean) {
    setError(null);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function resetDraft() {
    setError(null);
    setDraft(draftFromUser(user));
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
    <VisibilityDraftContext.Provider value={{ draft, setField }}>
      {children}
      {isDirty ? (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface px-5 py-3 shadow-sm sm:px-8">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            {error ? (
              <p className="text-xs text-red-600">{error}</p>
            ) : (
              <p className="text-xs text-muted">저장하지 않은 변경사항이 있어요.</p>
            )}
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                type="button"
                onClick={() => setConfirming(true)}
              >
                저장
              </Button>
              <Button
                size="sm"
                type="button"
                variant="secondary"
                onClick={resetDraft}
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <ActionConfirmDialog
        confirmLabel={pending ? "저장하는 중" : "저장"}
        message="설정을 저장할까요?"
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void handleConfirmSave()}
      />
    </VisibilityDraftContext.Provider>
  );
}

export function useVisibilityDraft(): VisibilityDraftContextValue {
  const context = useContext(VisibilityDraftContext);
  if (!context) {
    throw new Error(
      "useVisibilityDraft must be used within a VisibilityDraftProvider",
    );
  }
  return context;
}
