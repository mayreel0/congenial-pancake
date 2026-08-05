import { NextResponse } from "next/server";
import { legacyCommentsRemovedError } from "@/server/comments";

export async function POST() {
  return NextResponse.json({ error: legacyCommentsRemovedError }, { status: 410 });
}
