import { executePrompt } from "../src/lib/agent/runtime";

const target = process.argv.slice(2).join(" ").trim() || "localhost";
const prompt = `${target} için network, config ve runtime yüzeyini güvenli şekilde analiz et`;
const { execution, report } = executePrompt(prompt);

console.log(
  JSON.stringify(
    {
      prompt,
      execution,
      trust: report.trust,
      primaryBlockerReason: report.decision.primaryBlockerReason,
      policyDecisionSummary: report.policyInsight.policyDecisionSummary
    },
    null,
    2
  )
);
