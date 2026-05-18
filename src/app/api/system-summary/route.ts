import { NextResponse } from "next/server";
import { getSystemSummary } from "../../lib/platform-data";

export async function GET() {
  return NextResponse.json(getSystemSummary());
}
