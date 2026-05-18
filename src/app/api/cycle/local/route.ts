import { NextRequest, NextResponse } from "next/server";
import { runLocalCycle } from "@/lib/pipeline/local-cycle";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { target?: string }
    | null;

  const target = body?.target?.trim() || "localhost";
  const result = runLocalCycle(target);

  return NextResponse.json({
    ok: true,
    result
  });
}
