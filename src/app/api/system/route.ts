import { NextResponse } from "next/server";
import { getDashboardSnapshot } from "@/lib/domain/system-snapshot";
import { getMissionControlState } from "@/lib/orchestrator/mission-control";

export async function GET() {
  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    dashboard: getDashboardSnapshot(),
    missionControl: getMissionControlState()
  });
}
