import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createPraisePost, listFeedPosts } from "@/server/posts";
import { assertCanWrite, requireUser } from "@/server/permissions";

export async function GET() {
  const posts = await listFeedPosts();
  return NextResponse.json({ posts });
}

const postValidationErrors = new Set(["POST_TITLE_REQUIRED", "POST_BODY_REQUIRED", "INVALID_POST_INPUT"]);

export async function POST(request: Request) {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  assertCanWrite(user);
  const body = await request.json();

  try {
    const post = await createPraisePost(body, userId);
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && postValidationErrors.has(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
