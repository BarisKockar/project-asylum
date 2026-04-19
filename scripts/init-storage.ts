import { getExecutionStatusSummary, listPromptExecutions } from "../src/lib/agent/runtime";

const summary = getExecutionStatusSummary();
const latest = listPromptExecutions()[0] ?? null;

console.log(
  JSON.stringify(
    {
      storage: "local-json",
      summary,
      latestExecution: latest
        ? {
            id: latest.id,
            status: latest.status,
            mode: latest.mode,
            policyProfile: latest.policyProfile
          }
        : null
    },
    null,
    2
  )
);
