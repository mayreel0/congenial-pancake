import "server-only";

import { db } from "@/lib/db";

export async function requiresNicknameSetup(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { nicknameSetupRequired: true }
  });
  return user?.nicknameSetupRequired ?? false;
}
