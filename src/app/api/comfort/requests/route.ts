import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createComfortRequest, listRecentComfortExamples } from "@/server/comfort";
import { requireUser } from "@/server/permissions";
import { parseComfortRequestInput } from "@/server/request-validation";

export async function GET() {
  const examples = await listRecentComfortExamples();
  return NextResponse.json({ examples });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  const input = parseComfortRequestInput(await request.json());
  const comfortRequest = await createComfortRequest(input, userId);
  return NextResponse.json({ request: comfortRequest }, { status: 201 });
}
