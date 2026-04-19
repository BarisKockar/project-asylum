import { NextResponse } from "next/server";
import {
  listPromptExecutionsByFilters
} from "../../../lib/agent/runtime";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.trim() ?? "";
  const policyProfile = searchParams.get("policyProfile")?.trim() ?? "";

  return NextResponse.json({
    executions: listPromptExecutionsByFilters({
      status,
      policyProfile
    })
  });
}
