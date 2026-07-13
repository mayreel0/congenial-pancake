import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Socket.IO is registered by the deployment's Node server through registerSocketServer.
export async function GET() {
  return NextResponse.json({ status: "socket-server-external" }, { status: 204 });
}
