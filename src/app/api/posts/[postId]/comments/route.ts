import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createPraiseComment } from "@/server/comments";
import { commentValidationErrors, parseCommentInput } from "@/server/request-validation";
import { assertCanWrite, requireUser } from "@/server/permissions";
import { publishPostEvent } from "@/server/realtime";

export async function POST(request: Request, context: { params: Promise<{ postId: string }> }) {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  assertCanWrite(user);
  const { postId } = await context.params;
  try {
    const body = parseCommentInput(await request.json());
    const comment = await createPraiseComment(postId, userId, body);
    publishPostEvent(postId, { type: "comment.created", postId, commentId: comment.id });
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && commentValidationErrors.has(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
