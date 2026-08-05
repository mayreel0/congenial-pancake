import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createComfortReply } from "@/server/comfort";
import { parseComfortReplyInput } from "@/server/request-validation";

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const { requestId } = await context.params;
  let input;
  try {
    input = parseComfortReplyInput(await request.json());
  } catch {
    return NextResponse.json({ error: "COMFORT_REPLY_INPUT_INVALID" }, { status: 400 });
  }

  const reply = await createComfortReply(requestId, userId, input);
  return NextResponse.json(
    {
      reply: {
        id: reply.id,
        requestId: reply.requestId,
        body: reply.body,
        displayMode: reply.displayMode,
        createdAt: reply.createdAt
      }
    },
    { status: 201 }
  );
}
