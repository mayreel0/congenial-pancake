"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireUser } from "@/server/permissions";
import { VisibilityState } from "@prisma/client";

function requireFormString(formData: FormData, key: string, errorCode: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(errorCode);
  }
  return value;
}

export async function hideMyComfortRequest(formData: FormData) {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  const requestId = requireFormString(formData, "requestId", "COMFORT_REQUEST_ID_REQUIRED");
  const request = await db.comfortRequest.findUniqueOrThrow({
    where: { id: requestId },
    select: { id: true, authorUserId: true }
  });
  if (request.authorUserId !== userId) throw new Error("COMFORT_REQUEST_AUTHOR_ONLY");

  await db.comfortRequest.update({
    where: { id: requestId },
    data: { status: VisibilityState.HIDDEN }
  });

  revalidatePath("/me");
  revalidatePath("/");
}

export async function hideMyComfortReply(formData: FormData) {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  const replyId = requireFormString(formData, "replyId", "COMFORT_REPLY_ID_REQUIRED");
  const reply = await db.comfortReply.findUniqueOrThrow({
    where: { id: replyId },
    select: { id: true, authorUserId: true }
  });
  if (reply.authorUserId !== userId) throw new Error("COMFORT_REPLY_AUTHOR_ONLY");

  await db.comfortReply.update({
    where: { id: replyId },
    data: { status: VisibilityState.HIDDEN }
  });

  revalidatePath("/me");
  revalidatePath("/");
}
