import { executePrompt } from "../src/lib/agent/runtime";

const target = process.argv.slice(2).join(" ").trim() || "localhost";
const prompt = `${target} üzerindeki portları ve runtime yüzeyini analiz et`;
const { execution, report } = executePrompt(prompt);

console.log(
  JSON.stringify(
    {
      prompt,
      execution,
      observationKinds: report.observations.map((item) => item.kind),
      blockerCount: report.decision.blockers.length
    },
    null,
    2
  )
);
