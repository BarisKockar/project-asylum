import { DashboardClient } from "./components/dashboard-client";
import {
  getCognitiveSummary,
  getSystemSummary,
  listPromptExecutions
} from "./lib/platform-data";

export default function HomePage() {
  const system = getSystemSummary();
  const cognitive = getCognitiveSummary();
  const executions = listPromptExecutions();

  return (
    <main className="shell">
      <DashboardClient
        initialSystem={system}
        initialCognitive={cognitive}
        initialExecutions={executions}
      />
    </main>
  );
}
