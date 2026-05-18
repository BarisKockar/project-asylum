import { NextRequest, NextResponse } from "next/server";
import { describeDecisionStatus } from "@/lib/cognitive/episode";
import {
  getCognitiveEpisode,
  listDecisions,
  listHypotheses,
  listObservations,
  listPlans
} from "@/lib/storage/repositories/cognitive-repository";

export async function GET(request: NextRequest) {
  const targetId =
    request.nextUrl.searchParams.get("targetId") || "asset-localhost-core";

  return NextResponse.json({
    ok: true,
    targetId,
    episode: getCognitiveEpisode(targetId),
    summary: {
      observations: listObservations(targetId).length,
      hypotheses: listHypotheses(targetId).length,
      plans: listPlans(targetId).length,
      decisions: listDecisions(targetId).length,
      latestDecisionStatus:
        listDecisions(targetId).at(-1)?.status ?? null,
      latestDecisionLabel: describeDecisionStatus(
        listDecisions(targetId).at(-1)?.status ?? null
      )
    }
  });
}
