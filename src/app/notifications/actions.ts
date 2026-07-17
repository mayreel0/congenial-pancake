"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireUser } from "@/server/permissions";
import { markAllNotificationsRead } from "@/server/notifications";

export async function markNotificationsRead() {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  await markAllNotificationsRead(userId);
  revalidatePath("/notifications");
  revalidatePath("/");
}
