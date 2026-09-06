"use client";

import { Toggle } from "ui/Toggle";
import { useAuth } from "../../lib/auth/useAuth";
import { useVisibilityDraft } from "./VisibilityDraftProvider";

// Its own card, not merged into NicknameSection's text-edit form — that
// form and this toggle would otherwise end up nested (invalid HTML) once
// this shares VisibilityDraftProvider's outer <form>. Sharing the page-wide
// draft/save/dialog with ProfileVisibilitySection instead of firing its own
// request.
export function NicknameVisibilitySection() {
  const { user } = useAuth();
  const { draft, setField } = useVisibilityDraft();

  if (!user?.nickname) return null;

  return (
    <section className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">닉네임 공개 설정</h2>
      </div>
      <div>
        <Toggle
          checked={draft.nicknameVisible}
          label="닉네임 공개"
          onChange={(checked) => setField("nicknameVisible", checked)}
        />
        <p className="text-xs text-muted">
          꺼두면 지금까지 남긴 글에서도 닉네임 대신 익명으로 보여요. 언제든
          다시 켤 수 있고, 켜면 원래 닉네임 그대로 돌아와요 — 변경 쿨타임과는
          무관해요.
        </p>
      </div>
    </section>
  );
}
