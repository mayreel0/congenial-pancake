import { SanctionState } from "@prisma/client";

export function requireUser(sessionUserId: string | undefined): string {
  if (!sessionUserId) {
    throw new Error("AUTH_REQUIRED");
  }
  return sessionUserId;
}

export function assertCanWrite(user: { sanctionState: SanctionState }): void {
  if (isWriteRestricted(user.sanctionState)) {
    throw new Error("WRITE_BLOCKED");
  }
}

export function isWriteRestricted(sanctionState: SanctionState): boolean {
  return sanctionState === SanctionState.SHADOW_BANNED || sanctionState === SanctionState.SERVICE_BANNED;
}

export function sanctionStateLabel(sanctionState: SanctionState): string {
  switch (sanctionState) {
    case SanctionState.NORMAL:
      return "정상";
    case SanctionState.LOW_TRUST:
      return "주의 필요";
    case SanctionState.SHADOW_BANNED:
      return "그림자 제한";
    case SanctionState.SERVICE_BANNED:
      return "서비스 이용 제한";
  }
}
