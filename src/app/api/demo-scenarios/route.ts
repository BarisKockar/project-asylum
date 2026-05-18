import { NextResponse } from "next/server";
import { listDemoScenarios, runDemoScenario } from "../../../lib/agent/runtime";

export async function GET() {
  return NextResponse.json({
    scenarios: listDemoScenarios()
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { scenarioId?: string };
  const scenarioId = body.scenarioId?.trim() ?? "";

  if (!scenarioId) {
    return NextResponse.json(
      { error: "Senaryo kimligi bos olamaz." },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(runDemoScenario(scenarioId));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Senaryo calistirilamadi.";

    return NextResponse.json({ error: message }, { status: 404 });
  }
}
