import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Socket.IO Engine.IO traffic is handled by the custom Node server at /api/socket/io.
export async function GET() {
  return new NextResponse(null, { status: 204 });
}
