// Shared between UsersService (enforcement), UserResponseDto (letting the
// frontend show/disable proactively), and NicknameCooldownException (error
// message) — see docs/decisions/2026-08-29-onseol-nickname-cooldown-
// decisions.md.
export const NICKNAME_COOLDOWN_DAYS = 7;
export const NICKNAME_COOLDOWN_MS =
  NICKNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
