import { NextResponse } from "next/server";
import { getCognitiveSummary } from "../../lib/platform-data";

export async function GET() {
  return NextResponse.json(getCognitiveSummary());
}
