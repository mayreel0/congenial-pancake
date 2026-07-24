"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { hideOwnPraiseComment } from "@/server/comments";
import { requireUser } from "@/server/permissions";
import { hideOwnPraisePost } from "@/server/posts";

function requireFormString(formData: FormData, key: string, errorCode: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(errorCode);
  }
  return value;
}

export async function hideMyPost(formData: FormData) {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  const postId = requireFormString(formData, "postId", "POST_ID_REQUIRED");
  const post = await hideOwnPraisePost(postId, userId);

  revalidatePath("/me");
  revalidatePath("/");
  revalidatePath(`/posts/${post.id}`);
}

export async function hideMyComment(formData: FormData) {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  const commentId = requireFormString(formData, "commentId", "COMMENT_ID_REQUIRED");
  const comment = await hideOwnPraiseComment(commentId, userId);

  revalidatePath("/me");
  revalidatePath("/");
  revalidatePath(`/posts/${comment.postId}`);
}
