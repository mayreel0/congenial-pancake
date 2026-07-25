import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNotificationSummary } from "@/server/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const summary = await getNotificationSummary(userId);
  return NextResponse.json(summary);
}
