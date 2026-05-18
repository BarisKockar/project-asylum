import { executePrompt } from "../src/lib/agent/runtime";

const target = process.argv.slice(2).join(" ").trim() || "localhost";
const prompt = `${target} üzerindeki config ve admin surface risklerini açıkla`;
const { execution, report } = executePrompt(prompt);

console.log(
  JSON.stringify(
    {
      prompt,
      execution,
      reasoning: report.reasoning,
      critic: report.critic
    },
    null,
    2
  )
);
