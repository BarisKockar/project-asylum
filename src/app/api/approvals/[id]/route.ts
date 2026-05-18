import { NextResponse } from "next/server";

import {
  approveAction,
  getApproval,
  rejectAction
} from "../../../../lib/agent/runtime";

export const dynamic = "force-dynamic";

type DecisionBody = {
  action?: "approve" | "reject";
  decidedBy?: string;
  rationale?: string;
};

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const approval = getApproval(context.params.id);
  if (!approval) {
    return NextResponse.json({ error: "Approval not found." }, { status: 404 });
  }

  return NextResponse.json({ approval });
}

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  let body: DecisionBody;
  try {
    body = (await request.json()) as DecisionBody;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json(
      { error: "Body must include action: 'approve' or 'reject'." },
      { status: 400 }
    );
  }

  const decidedBy =
    typeof body.decidedBy === "string" && body.decidedBy.trim().length > 0
      ? body.decidedBy.trim()
      : null;
  const rationale =
    typeof body.rationale === "string" && body.rationale.trim().length > 0
      ? body.rationale.trim()
      : null;

  if (!decidedBy || !rationale) {
    return NextResponse.json(
      {
        error:
          "decidedBy and rationale are required so approvals carry an audit trail."
      },
      { status: 400 }
    );
  }

  try {
    const updated =
      body.action === "approve"
        ? approveAction(context.params.id, { decidedBy, rationale })
        : rejectAction(context.params.id, { decidedBy, rationale });

    return NextResponse.json({ approval: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";

    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (message.includes("already decided")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
