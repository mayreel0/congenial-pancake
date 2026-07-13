import { SanctionState } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { assertCanWrite, requireUser } from "@/server/permissions";

describe("permissions", () => {
  it("rejects unauthenticated write attempts", () => {
    expect(() => requireUser(undefined)).toThrow("AUTH_REQUIRED");
  });

  it("allows normal users to write", () => {
    expect(() => assertCanWrite({ sanctionState: SanctionState.NORMAL })).not.toThrow();
  });

  it("blocks service banned users from writing", () => {
    expect(() => assertCanWrite({ sanctionState: SanctionState.SERVICE_BANNED })).toThrow("WRITE_BLOCKED");
  });
});
