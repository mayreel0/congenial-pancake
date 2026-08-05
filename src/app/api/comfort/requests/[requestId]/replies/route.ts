import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createComfortReply } from "@/server/comfort";
import { requireUser } from "@/server/permissions";
import { parseComfortReplyInput } from "@/server/request-validation";

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  const { requestId } = await context.params;
  const input = parseComfortReplyInput(await request.json());
  const reply = await createComfortReply(requestId, userId, input);
  return NextResponse.json({ reply }, { status: 201 });
}
