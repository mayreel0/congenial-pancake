import { Button } from "ui/Button";
import { TextField } from "ui/TextField";

export type VerifyEmailStatus = "idle" | "pending";

type VerifyEmailBodyProps = {
  token: string | null;
  password: string;
  error: string | null;
  fieldError: string | undefined;
  // Raw validity, independent of whether the field has been touched yet
  // (unlike `fieldError`, which only shows once touched) — gates the
  // submit button so it starts disabled on an empty field.
  hasFieldErrors: boolean;
  // Min-display-duration version of `status === "pending"` (via
  // useMinDisplayDuration in the parent) — appears the same instant status
  // does, just held a little longer so a fast signup doesn't flash.
  showSpinner: boolean;
  onPasswordChange(value: string): void;
  onSubmit(event: React.FormEvent): void;
};

// Early return instead of a nested ternary — matches
// apps/admin/app/components/AdminStatusGate.tsx's pattern.
export function VerifyEmailBody({
  token,
  password,
  error,
  fieldError,
  hasFieldErrors,
  showSpinner,
  onPasswordChange,
  onSubmit,
}: VerifyEmailBodyProps) {
  if (!token) {
    return <p className="text-sm text-red-600">유효하지 않은 링크입니다.</p>;
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <p className="text-sm text-muted">
        비밀번호를 설정하면 가입이 완료돼요.
      </p>
      <TextField
        autoComplete="new-password"
        error={fieldError}
        id="password"
        label="비밀번호"
        required
        type="password"
        value={password}
        onChange={(event) => onPasswordChange(event.currentTarget.value)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        disabled={hasFieldErrors || showSpinner}
        fullWidth
        pending={showSpinner}
        type="submit"
      >
        가입 완료
      </Button>
    </form>
  );
}
