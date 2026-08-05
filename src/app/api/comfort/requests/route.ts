import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createComfortRequest, listRecentComfortExamples } from "@/server/comfort";
import { parseComfortRequestInput } from "@/server/request-validation";

export async function GET() {
  const examples = await listRecentComfortExamples();
  return NextResponse.json({ examples });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  let input;
  try {
    input = parseComfortRequestInput(await request.json());
  } catch {
    return NextResponse.json({ error: "COMFORT_REQUEST_INPUT_INVALID" }, { status: 400 });
  }

  const comfortRequest = await createComfortRequest(input, userId);
  return NextResponse.json(
    {
      request: {
        id: comfortRequest.id,
        body: comfortRequest.body,
        displayMode: comfortRequest.displayMode,
        createdAt: comfortRequest.createdAt
      }
    },
    { status: 201 }
  );
}
