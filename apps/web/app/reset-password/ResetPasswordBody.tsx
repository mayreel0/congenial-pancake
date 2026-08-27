import Link from "next/link";
import { Button } from "ui/Button";
import { TextField } from "ui/TextField";

export type ResetPasswordStatus = "idle" | "pending" | "done";

type ResetPasswordBodyProps = {
  token: string | null;
  status: ResetPasswordStatus;
  password: string;
  error: string | null;
  onPasswordChange(value: string): void;
  onSubmit(event: React.FormEvent): void;
};

// Early returns instead of a nested ternary — matches
// apps/admin/app/components/AdminStatusGate.tsx's pattern for a 3+-way
// conditional render.
export function ResetPasswordBody({
  token,
  status,
  password,
  error,
  onPasswordChange,
  onSubmit,
}: ResetPasswordBodyProps) {
  if (!token) {
    return <p className="text-sm text-red-600">유효하지 않은 링크입니다.</p>;
  }

  if (status === "done") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-primary">비밀번호를 설정했습니다.</p>
        <Link
          className="block text-center text-sm text-muted underline-offset-2 hover:underline"
          href="/login"
        >
          로그인하러 가기
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <TextField
        autoComplete="new-password"
        id="password"
        label="새 비밀번호"
        minLength={8}
        required
        type="password"
        value={password}
        onChange={(event) => onPasswordChange(event.currentTarget.value)}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button disabled={status === "pending"} fullWidth type="submit">
        {status === "pending" ? "처리 중" : "비밀번호 설정"}
      </Button>
    </form>
  );
}
