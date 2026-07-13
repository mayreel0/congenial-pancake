import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addAuthorReply } from "@/server/comments";
import { assertCanWrite, requireUser } from "@/server/permissions";
import { publishPostEvent } from "@/server/realtime";

export async function POST(request: Request, context: { params: Promise<{ commentId: string }> }) {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  assertCanWrite(user);
  const { commentId } = await context.params;
  const { body } = await request.json();
  const reply = await addAuthorReply(commentId, userId, body);
  publishPostEvent(reply.postId, { type: "reply.created", postId: reply.postId, replyId: reply.id });
  return NextResponse.json({ reply }, { status: 201 });
}
