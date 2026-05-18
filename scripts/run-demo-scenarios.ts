import { listDemoScenarios, runDemoScenario } from "../src/lib/agent/demo-scenarios";

const scenarios = listDemoScenarios();

const results = scenarios.map((scenario) => {
  const result = runDemoScenario(scenario.id);

  return {
    id: scenario.id,
    title: scenario.title,
    status: result.execution.status,
    riskCount: result.report.risks.length,
    blockerCount: result.report.decision.blockers.length,
    openPortCount: Array.isArray(
      result.report.observations.find((observation) => observation.kind === "network-surface")
        ?.metadata?.ports
    )
      ? (
          result.report.observations.find(
            (observation) => observation.kind === "network-surface"
          )?.metadata?.ports as number[]
        ).length
      : 0,
    securitySignalCount: Array.isArray(
      result.report.observations.find((observation) => observation.kind === "telemetry")
        ?.metadata?.securitySignals
    )
      ? (
          result.report.observations.find(
            (observation) => observation.kind === "telemetry"
          )?.metadata?.securitySignals as string[]
        ).length
      : 0
  };
});

console.log(
  JSON.stringify(
    {
      runner: "project-asylum-demo-scenarios",
      scenarioCount: results.length,
      observeOnly: true,
      results
    },
    null,
    2
  )
);
