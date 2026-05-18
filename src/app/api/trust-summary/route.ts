import { NextResponse } from "next/server";

import { getTrustTrendSummary } from "../../../lib/agent/runtime";

export async function GET() {
  return NextResponse.json(getTrustTrendSummary());
}
