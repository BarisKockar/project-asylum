import { DashboardClient } from "./components/dashboard-client";
import { listDemoScenarios } from "../lib/agent/runtime";
import {
  getCognitiveSummary,
  getSystemSummary,
  listPromptExecutions
} from "./lib/platform-data";

export default function HomePage() {
  const system = getSystemSummary();
  const cognitive = getCognitiveSummary();
  const executions = listPromptExecutions();
  const demoScenarios = listDemoScenarios();

  return (
    <main className="shell">
      <DashboardClient
        initialSystem={system}
        initialCognitive={cognitive}
        initialExecutions={executions}
        initialDemoScenarios={demoScenarios}
      />
    </main>
  );
}
