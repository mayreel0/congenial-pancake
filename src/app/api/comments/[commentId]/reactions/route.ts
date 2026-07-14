import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addAuthorReaction } from "@/server/comments";
import { commentValidationErrors, parseReactionInput } from "@/server/request-validation";
import { assertCanWrite, requireUser } from "@/server/permissions";
import { publishPostEvent } from "@/server/realtime";

export async function POST(request: Request, context: { params: Promise<{ commentId: string }> }) {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  assertCanWrite(user);
  const { commentId } = await context.params;
  try {
    const { type } = parseReactionInput(await request.json());
    const reaction = await addAuthorReaction(commentId, userId, type);
    publishPostEvent(reaction.postId, { type: "reaction.created", postId: reaction.postId, reactionId: reaction.id });
    return NextResponse.json({ reaction }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && commentValidationErrors.has(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
