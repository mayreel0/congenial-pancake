import { ApiError } from "./apiError";

// Every backend error `code` that carries a fixed, non-parameterized
// meaning — one canonical Korean translation per code, shared by every
// consumer instead of each page hand-rolling its own partial copy (this
// used to be 4 separate maps across apps/web alone). Source of truth for
// the codes themselves: apps/api-server/src/common/exceptions/
// app.exception.ts — that file is the *only* place custom exceptions are
// defined, so this list should stay in sync with it.
const ERROR_MESSAGES: Record<string, string> = {
  AUTH_EMAIL_TAKEN: "이미 가입이 완료된 이메일입니다. 로그인해주세요.",
  AUTH_INVALID_CREDENTIALS: "이메일 또는 비밀번호가 올바르지 않습니다.",
  AUTH_OAUTH_EXCHANGE_FAILED: "소셜 로그인에 실패했어요. 다시 시도해주세요.",
  AUTH_OAUTH_ALREADY_LINKED: "이미 다른 계정에 연동된 소셜 계정이에요.",
  REQUEST_NOT_FOUND: "이 글은 더 이상 존재하지 않아요.",
  REPLY_NOT_FOUND: "이 답변은 더 이상 존재하지 않아요.",
  REQUEST_GUEST_LIMIT_EXCEEDED:
    "비회원은 온설을 1개만 남길 수 있어요. 로그인하면 더 남길 수 있어요.",
  REPLY_ALREADY_SUBMITTED: "이미 이 글에 답변을 남겼어요.",
  REPORT_ALREADY_SUBMITTED: "이미 신고한 항목이에요.",
  AUTH_PASSWORD_RESET_TOKEN_INVALID:
    "비밀번호 재설정 링크가 유효하지 않거나 만료되었어요.",
  AUTH_EMAIL_VERIFICATION_TOKEN_INVALID:
    "인증 링크가 유효하지 않거나 만료되었어요.",
  AUTH_EMAIL_NOT_VERIFIED: "이메일 인증이 필요해요. 메일함을 확인해주세요.",
  NICKNAME_REQUIRED: "닉네임을 먼저 설정해주세요.",
  AUTH_EMAIL_SEND_FAILED: "인증 메일을 보내지 못했어요. 잠시 후 다시 시도해주세요.",
};

// These two codes carry a dynamic, settings-configurable number
// (cooldown days, guest reply limit) that only the backend knows — it
// builds the final Korean sentence itself (see AUTH_NICKNAME_COOLDOWN's
// comment in app.exception.ts) rather than the frontend reassembling it
// from a template, so these are shown as-is instead of looked up here.
const RAW_MESSAGE_CODES = new Set([
  "AUTH_NICKNAME_COOLDOWN",
  "REPLY_GUEST_LIMIT_EXCEEDED",
]);

const GENERIC_FALLBACK = "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.";

// The one place every "show this error to the user" call site should go
// through — never leaks the backend's raw (often English) message for an
// unmapped code, always falls back to GENERIC_FALLBACK instead.
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (RAW_MESSAGE_CODES.has(error.code)) return error.message;
    return ERROR_MESSAGES[error.code] ?? GENERIC_FALLBACK;
  }
  return GENERIC_FALLBACK;
}
