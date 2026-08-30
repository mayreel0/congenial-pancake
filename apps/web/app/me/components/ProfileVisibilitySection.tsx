"use client";

import { Toggle } from "ui/Toggle";
import { useVisibilityDraft } from "./VisibilityDraftProvider";

// Nickname visibility lives in NicknameSection instead (it's about the
// nickname, not the profile page) — this section only covers whether
// content on the public profile page (/u/[slug]) is visible at all. Both
// share the same page-wide draft/save/dialog from VisibilityDraftProvider.
export function ProfileVisibilitySection() {
  const { draft, setField } = useVisibilityDraft();

  return (
    <section className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">공개 프로필 설정</h2>
        <p className="text-xs text-muted">
          닉네임으로 남긴 글을 내 프로필 페이지에서 다른 사람도 볼 수 있는지
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
            onChange={(checked) => setField("showRequestsOnProfile", checked)}
          />
        </div>
        <div>
          <Toggle
            checked={draft.showRepliesOnProfile}
            label="내가 남긴 답변 목록 공개"
            onChange={(checked) => setField("showRepliesOnProfile", checked)}
          />
        </div>
        <div>
          <Toggle
            checked={draft.showCountsOnProfile}
            label="고민/답변 개수 공개"
            onChange={(checked) => setField("showCountsOnProfile", checked)}
          />
        </div>
      </div>
    </section>
  );
}
