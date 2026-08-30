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
// NicknameVisibilitySection, the three profile-page switches in
// ProfileVisibilitySection, and whatever gets added later — shares one
// draft, one 저장/취소 control, and one confirm dialog instead of each
// section owning its own. Toggles stay in whichever section they visually
// belong to; only the save/cancel/dialog mechanism is unified, rendered
// once here as a fixed bar at the bottom of the page. Mounted only once
// `user` is confirmed non-null (see MeContent), so this never has to
// handle a null user itself.
//
// `children` (and the bar) are wrapped in a real <form> — safe to do here
// specifically because NicknameSection's own text-edit <form> lives
// *outside* this provider as a sibling in MePage, so there's no nesting.
// Multiple independent <form> elements on one page is fine; only nesting
// one inside another is invalid HTML.
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
  // Announced via a persistent aria-live region below, separate from the
  // bar's own (conditionally-mounted) text — the bar itself unmounts the
  // instant a save succeeds (isDirty flips back to false), which would
  // otherwise wipe out the "saved" message before assistive tech reads it.
  const [statusMessage, setStatusMessage] = useState("");

  const isDirty =
    draft.nicknameVisible !== user.nicknameVisible ||
    draft.showRequestsOnProfile !== user.showRequestsOnProfile ||
    draft.showRepliesOnProfile !== user.showRepliesOnProfile ||
    draft.showCountsOnProfile !== user.showCountsOnProfile;

  function setField(field: keyof VisibilityDraft, value: boolean) {
    setError(null);
    setStatusMessage("저장하지 않은 변경사항이 있어요.");
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function resetDraft() {
    setError(null);
    setStatusMessage("");
    setDraft(draftFromUser(user));
  }

  async function handleConfirmSave(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      await updateProfileVisibility(draft);
      setConfirming(false);
      setStatusMessage("설정이 저장되었습니다.");
    } catch (saveError) {
      const message = errorMessage(saveError);
      setError(message);
      setStatusMessage(message);
    } finally {
      setPending(false);
    }
  }

  function handleFormSubmit(event: React.FormEvent): void {
    event.preventDefault();
    if (!isDirty) return;
    setConfirming(true);
  }

  return (
    <VisibilityDraftContext.Provider value={{ draft, setField }}>
      <div aria-live="polite" className="sr-only">
        {statusMessage}
      </div>
      <form aria-label="공개 설정 변경" onSubmit={handleFormSubmit}>
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
                <Button size="sm" type="submit">
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
      </form>
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
