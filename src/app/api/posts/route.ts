import { NextResponse } from "next/server";
import { legacyPostsRemovedError } from "@/server/posts";

export async function GET() {
  return NextResponse.json({ error: legacyPostsRemovedError }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: legacyPostsRemovedError }, { status: 410 });
}
