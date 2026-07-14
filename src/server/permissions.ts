import { SanctionState } from "@prisma/client";

export function requireUser(sessionUserId: string | undefined): string {
  if (!sessionUserId) {
    throw new Error("AUTH_REQUIRED");
  }
  return sessionUserId;
}

export function assertCanWrite(user: { sanctionState: SanctionState }): void {
  if (user.sanctionState === SanctionState.SERVICE_BANNED) {
    throw new Error("WRITE_BLOCKED");
  }
}
