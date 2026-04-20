import { NextResponse } from "next/server";

import { detectPlatformProfile } from "../../../lib/agent/platform-profile";

export async function GET() {
  return NextResponse.json(detectPlatformProfile());
}
