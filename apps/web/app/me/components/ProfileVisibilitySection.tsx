"use client";

import { useState } from "react";
import { Toggle } from "ui/Toggle";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth/useAuth";

type VisibilityField =
  | "showRequestsOnProfile"
  | "showRepliesOnProfile"
  | "showCountsOnProfile";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "설정을 바꾸지 못했습니다. 잠시 후 다시 시도해주세요.";
}

export function ProfileVisibilitySection() {
  const { user, updateProfileVisibility } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  // Fires immediately on toggle, no separate save step — matches typical
  // settings UX, and each field updates independently (see
  // apps/api-server's UpdateProfileVisibilityDto, all fields optional).
  async function handleToggle(
    field: VisibilityField,
    value: boolean,
  ): Promise<void> {
    setError(null);
    try {
      await updateProfileVisibility({ [field]: value });
    } catch (toggleError) {
      setError(errorMessage(toggleError));
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
        <Toggle
          checked={user.showRequestsOnProfile}
          label="내가 남긴 고민 목록 공개"
          onChange={(checked) =>
            void handleToggle("showRequestsOnProfile", checked)
          }
        />
        <Toggle
          checked={user.showRepliesOnProfile}
          label="내가 남긴 답변 목록 공개"
          onChange={(checked) =>
            void handleToggle("showRepliesOnProfile", checked)
          }
        />
        <Toggle
          checked={user.showCountsOnProfile}
          label="개수 공개"
          onChange={(checked) => void handleToggle("showCountsOnProfile", checked)}
        />
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </section>
  );
}
