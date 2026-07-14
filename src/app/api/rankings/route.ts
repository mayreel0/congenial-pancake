import { NextResponse } from "next/server";
import { getRankingSnapshots } from "@/server/rankings";

export async function GET() {
  const rankings = await getRankingSnapshots();
  return NextResponse.json({ rankings });
}
