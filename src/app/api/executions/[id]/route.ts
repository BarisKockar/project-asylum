import { NextResponse } from "next/server";
import { buildPolicyDecisionExplanation } from "../../../../lib/agent/policy-engine";
import { getPromptExecutionReport } from "../../../../lib/agent/runtime";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  const report = getPromptExecutionReport(params.id);

  if (!report) {
    return NextResponse.json(
      { error: "Execution raporu bulunamadi." },
      { status: 404 }
    );
  }

  const policyDecision = buildPolicyDecisionExplanation(report.policyInsight);

  return NextResponse.json({
    report,
    policy: report.policyInsight ?? {
      profile: report.policyProfile ?? "default",
      posture: "balanced",
      explanation:
        "Policy farkı için henüz detaylı insight üretilmemiş.",
      context: {
        collectorAttempts: 0,
        reasoningAttempts: 0,
        reviewPorts: [],
        riskySignals: [],
        hasCriticalRisk: false,
        hasHighProcessRisk: false
      },
      thresholds: {},
      evaluations: {},
      matchedRules: [],
      pendingRules: []
    },
    policyDecisionSummary: policyDecision.summary,
    policyDecisionLines: policyDecision.details,
    policyDecisionDetails: policyDecision.structuredDetails,
    primaryBlockerReason: policyDecision.primaryBlockerReason
  });
}
