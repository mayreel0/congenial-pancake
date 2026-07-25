"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireUser } from "@/server/permissions";
import { markAllNotificationsRead, markNotificationRead } from "@/server/notifications";

function revalidateNotificationSurfaces() {
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function markNotificationsRead() {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  await markAllNotificationsRead(userId);
  revalidateNotificationSurfaces();
}

export async function markNotificationReadAction(formData: FormData) {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  const notificationId = formData.get("notificationId");

  if (typeof notificationId !== "string" || notificationId.trim().length === 0) {
    throw new Error("NOTIFICATION_ID_REQUIRED");
  }

  await markNotificationRead(userId, notificationId);
  revalidateNotificationSurfaces();
}
