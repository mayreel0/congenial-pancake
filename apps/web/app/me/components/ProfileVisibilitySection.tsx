"use client";

import { Toggle } from "ui/Toggle";
import { useAuth } from "../../lib/auth/useAuth";
import { useVisibilityDraft } from "./VisibilityDraftProvider";

// Nickname visibility lives in NicknameVisibilitySection instead (it's about
// the nickname, not the profile page) — this section only covers whether
// content on the public profile page (/u/[slug]) is visible at all. Both
// share the same page-wide draft/save/dialog from VisibilityDraftProvider.
export function ProfileVisibilitySection() {
  const { user } = useAuth();
  const { draft, setField } = useVisibilityDraft();

  // /u/[slug] 404s for everyone once the nickname is hidden (or doesn't
  // exist yet) — see UsersService.findByNicknameAndDiscriminator — so these
  // three switches have no effect right now. Disabling them (rather than
  // hiding them) keeps their saved values visible and makes clear they'll
  // resume mattering as soon as the nickname is shown again.
  const disabled = !user?.nickname || !draft.nicknameVisible;

  return (
    <section className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">공개 프로필 설정</h2>
        <p className="text-xs text-muted">
          닉네임으로 남긴 글을 내 프로필 페이지에서 다른 사람도 볼 수 있는지
          정해요.
        </p>
        {disabled && (
          <p className="text-xs text-amber-600">
            닉네임을 공개해야 다른 사람이 프로필 페이지를 볼 수 있어요 — 지금은
            이 설정이 적용되지 않아요.
          </p>
        )}
      </div>
      <div className="space-y-3">
        {/* Toggle's root element is inline-flex, not block — without a
            wrapping div per toggle, space-y-3 has no effect between them
            since they'd all sit on one line instead of stacking. */}
        <div>
          <Toggle
            checked={draft.showRequestsOnProfile}
            disabled={disabled}
            label="내가 남긴 고민 목록 공개"
            onChange={(checked) => setField("showRequestsOnProfile", checked)}
          />
        </div>
        <div>
          <Toggle
            checked={draft.showRepliesOnProfile}
            disabled={disabled}
            label="내가 남긴 답변 목록 공개"
            onChange={(checked) => setField("showRepliesOnProfile", checked)}
          />
        </div>
        <div>
          <Toggle
            checked={draft.showCountsOnProfile}
            disabled={disabled}
            label="고민/답변 개수 공개"
            onChange={(checked) => setField("showCountsOnProfile", checked)}
          />
        </div>
      </div>
    </section>
  );
}
