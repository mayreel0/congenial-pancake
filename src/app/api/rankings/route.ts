import { NextResponse } from "next/server";
import { rankingsRemovedError } from "@/server/rankings";

export async function GET() {
  return NextResponse.json({ error: rankingsRemovedError }, { status: 410 });
}
