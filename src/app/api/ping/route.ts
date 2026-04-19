import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "project-asylum",
    timestamp: new Date().toISOString()
  });
}
