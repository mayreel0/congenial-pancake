import Link from "next/link";
import { Button } from "ui/Button";

export type VerifyEmailStatus = "pending" | "done" | "error";

type VerifyEmailBodyProps = {
  token: string | null;
  status: VerifyEmailStatus;
  error: string | null;
};

// Early returns instead of a nested ternary — matches
// apps/admin/app/components/AdminStatusGate.tsx's pattern.
export function VerifyEmailBody({ token, status, error }: VerifyEmailBodyProps) {
  if (!token) {
    return <p className="text-sm text-red-600">유효하지 않은 링크입니다.</p>;
  }

  if (status === "pending") {
    return <p className="text-sm text-muted">인증하는 중...</p>;
  }

  if (status === "done") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-primary">이메일 인증이 완료되었습니다.</p>
        <Button fullWidth href="/today">
          계속하기
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-red-600">{error}</p>
      <Link
        className="block text-center text-sm text-muted underline-offset-2 hover:underline"
        href="/me"
      >
        내 정보에서 다시 시도하기
      </Link>
    </div>
  );
}
