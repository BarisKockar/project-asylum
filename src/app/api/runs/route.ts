import { NextRequest, NextResponse } from "next/server";
import { queueLocalRun } from "@/lib/orchestrator/mission-control";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { target?: string }
    | null;
  const target = body?.target?.trim() || "localhost";

  return NextResponse.json({
    ok: true,
    run: queueLocalRun(target)
  });
}
