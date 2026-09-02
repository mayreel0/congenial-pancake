import Link from "next/link";
import { Button } from "ui/Button";
import { TextField } from "ui/TextField";

export type ResetPasswordStatus = "idle" | "pending" | "done";

type ResetPasswordBodyProps = {
  token: string | null;
  status: ResetPasswordStatus;
  password: string;
  error: string | null;
  fieldError: string | undefined;
  onPasswordChange(value: string): void;
  onPasswordBlur(): void;
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
  fieldError,
  onPasswordChange,
  onPasswordBlur,
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
        error={fieldError}
        id="password"
        label="새 비밀번호"
        required
        type="password"
        value={password}
        onBlur={onPasswordBlur}
        onChange={(event) => onPasswordChange(event.currentTarget.value)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button disabled={status === "pending"} fullWidth type="submit">
        {status === "pending" ? "처리 중" : "비밀번호 설정"}
      </Button>
    </form>
  );
}
