import { Button } from "ui/Button";
import { TextField } from "ui/TextField";

export type VerifyEmailStatus = "idle" | "pending";

type VerifyEmailBodyProps = {
  token: string | null;
  password: string;
  error: string | null;
  fieldError: string | undefined;
  // See ResetPasswordBody's identical prop for why (raw touched-independent
  // validity, gates the submit button on an empty field).
  hasFieldErrors: boolean;
  // See ResetPasswordBody's identical prop for why (min-display-duration
  // version of `status === "pending"`).
  showSpinner: boolean;
  onPasswordChange(value: string): void;
  onSubmit(event: React.FormEvent): void;
};

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
