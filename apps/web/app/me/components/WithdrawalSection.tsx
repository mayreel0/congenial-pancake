import Link from "next/link";

// Right-aligned, unlike every other /me section's left-aligned primary
// action — a destructive action reads better set apart from the
// explanatory text rather than directly under it. Color pair (light:
// plain red-600 outline; dark: brighter coral + an always-on background
// tint, not just a lightened hue) came out of a real-token visual
// comparison — a plain outline in the same red read as muddy against this
// palette's greenish dark surface. See
// docs/decisions/2026-09-09-onseol-account-withdrawal-decisions.md and
// app/globals.css's --destructive/--destructive-bg tokens.
export function WithdrawalSection() {
  return (
    <section className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">회원탈퇴</h2>
        <p className="text-xs text-muted">
          탈퇴하면 즉시 로그아웃되고 이메일·닉네임·비밀번호가 삭제돼요. 남긴
          글은 익명 처리되어 남습니다.
        </p>
      </div>
      <div className="flex justify-end">
        <Link
          className="inline-flex h-10 items-center justify-center rounded-lg border border-destructive bg-destructive-bg px-4 text-sm font-semibold text-destructive transition hover:bg-destructive-bg-hover"
          href="/me/withdraw"
        >
          회원탈퇴
        </Link>
      </div>
    </section>
  );
}
