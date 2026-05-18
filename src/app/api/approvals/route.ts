import { NextResponse } from "next/server";

import { listApprovals } from "../../../lib/agent/runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status")?.trim() ?? "";
  const executionIdParam = searchParams.get("executionId")?.trim() ?? "";

  const filters: {
    status?: "awaiting-approval" | "approved" | "rejected" | "expired" | "all";
    executionId?: string;
  } = {};

  if (statusParam) {
    if (
      statusParam === "awaiting-approval" ||
      statusParam === "approved" ||
      statusParam === "rejected" ||
      statusParam === "expired" ||
      statusParam === "all"
    ) {
      filters.status = statusParam;
    }
  }

  if (executionIdParam) {
    filters.executionId = executionIdParam;
  }

  return NextResponse.json({
    approvals: listApprovals(filters)
  });
}
