import type { PromptExecution, PromptExecutionReport } from "../../types/agent";
import { executePrompt } from "./prompt-engine";
import { getExecutionStore, persistExecutionStore } from "./execution-store";

export type DemoScenario = {
  id: string;
  title: string;
  summary: string;
  customerLabel: string;
  prompt: string;
  expectedSignals: string[];
};

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "brute-force-watch",
    title: "Brute Force Gozlemi",
    customerLabel: "Giriş Denemeleri",
    summary:
      "Başarısız giriş ve invalid user sinyallerini öne çıkararak sistemin şüpheli erişim denemelerini nasıl gördüğünü gösterir.",
    prompt:
      "localhost loglarini analiz et, failed password ve invalid user sinyallerini onceliklendir, brute force risklerini acikla",
    expectedSignals: [
      "authentication failure",
      "failed password",
      "invalid user"
    ]
  },
  {
    id: "open-port-exposure",
    title: "Acik Port Yuzeyi",
    customerLabel: "Ağ Yüzeyi",
    summary:
      "Dinleyen servisleri ve dikkat isteyen portlari one cikararak ag yuzeyinin nasil raporlandigini gosterir.",
    prompt:
      "localhost uzerindeki admin panelini analiz et ve acik port risklerini acikla",
    expectedSignals: ["review-port", "network exposure", "admin surface"]
  },
  {
    id: "critical-posture-review",
    title: "Kritik Dikkat Ozeti",
    customerLabel: "Kritik Durum",
    summary:
      "Port, config ve log sinyallerini birlikte toparlayip hangi durumlarda hizli triage gerektigini gosterir.",
    prompt:
      "localhost admin paneli, config ve log risklerini guvenli sekilde analiz et ve kritik durumlari sirala",
    expectedSignals: ["high-risk-triage", "config hardening", "log anomaly"]
  }
];

export function listDemoScenarios(): DemoScenario[] {
  return [...DEMO_SCENARIOS];
}

export function runDemoScenario(scenarioId: string): {
  scenario: DemoScenario;
  execution: PromptExecution;
  report: PromptExecutionReport;
} {
  const scenario = DEMO_SCENARIOS.find((entry) => entry.id === scenarioId);

  if (!scenario) {
    throw new Error("Demo senaryosu bulunamadi.");
  }

  const result = executePrompt(scenario.prompt);
  const overlayReport = applyScenarioOverlay(scenario, result.report);
  const store = getExecutionStore();

  store.reports[overlayReport.execution.id] = overlayReport;
  store.executions = store.executions.map((execution) =>
    execution.id === overlayReport.execution.id ? overlayReport.execution : execution
  );
  persistExecutionStore();

  return {
    scenario,
    execution: overlayReport.execution,
    report: overlayReport
  };
}

function applyScenarioOverlay(
  scenario: DemoScenario,
  report: PromptExecutionReport
): PromptExecutionReport {
  const next = structuredClone(report) as PromptExecutionReport;
  next.execution.summary = `${next.execution.summary} Observe-only demo senaryosu uygulandi: ${scenario.title}.`;

  if (scenario.id === "brute-force-watch") {
    const telemetry = next.observations.find(
      (observation) => observation.kind === "telemetry"
    );

    if (telemetry) {
      const existingSignals = Array.isArray(telemetry.metadata?.securitySignals)
        ? telemetry.metadata?.securitySignals.filter(
            (value): value is string => typeof value === "string"
          )
        : [];
      telemetry.metadata = {
        ...telemetry.metadata,
        securitySignals: [
          ...new Set([
            ...existingSignals,
            "authentication failure for admin from 10.0.0.42",
            "failed password for invalid user root from 10.0.0.42",
            "invalid user deploy attempted from 10.0.0.42"
          ])
        ]
      };
    }

    next.risks = [
      ...next.risks.filter((risk) => risk.id !== "risk-log-anomaly"),
      {
        id: "risk-log-anomaly",
        severity: "high",
        title: "Log tabanli brute force sinyali",
        rationale:
          "Demo senaryosu, tekrarlayan başarısız giriş denemelerini kritik dikkat alanı olarak işaretledi.",
        sourceKinds: ["telemetry", "policy"],
        score: 0.82,
        evidence: [
          "authentication failure for admin from 10.0.0.42",
          "failed password for invalid user root from 10.0.0.42"
        ]
      }
    ];
    next.critic.riskFlags = [...new Set([...next.critic.riskFlags, "high-risk-triage"])];
    next.decision.blockers = [...new Set([...next.decision.blockers, "high-risk-triage"])];
    next.decision.status = "needs-triage";
    next.decision.primaryBlockerReason = {
      flag: "high-risk-triage",
      severity: "high",
      status: "pending",
      priority: 1,
      line: "high-risk-triage kuralı beklemede; brute force sinyalleri hizli triage gerektiriyor."
    };
  }

  if (scenario.id === "open-port-exposure") {
    const network = next.observations.find(
      (observation) => observation.kind === "network-surface"
    );

    if (network) {
      const existingPorts = Array.isArray(network.metadata?.ports)
        ? network.metadata?.ports.filter((value): value is number => typeof value === "number")
        : [];
      const existingReviewPorts = Array.isArray(network.metadata?.reviewPorts)
        ? network.metadata?.reviewPorts.filter(
            (value): value is number => typeof value === "number"
          )
        : [];
      network.metadata = {
        ...network.metadata,
        ports: [...new Set([...existingPorts, 22, 8080, 9200])],
        reviewPorts: [...new Set([...existingReviewPorts, 22, 8080, 9200])]
      };
    }

    next.risks = next.risks.map((risk) =>
      risk.id === "risk-network-exposure"
        ? {
            ...risk,
            severity: "high",
            score: 0.82,
            evidence: ["Dinleyen portlar: 22, 8080, 9200"]
          }
        : risk
    );
    next.critic.riskFlags = [...new Set([...next.critic.riskFlags, "network-exposure-review"])];
    next.decision.blockers = [...new Set([...next.decision.blockers, "network-exposure-review"])];
    next.decision.status = "needs-triage";
    next.decision.primaryBlockerReason = {
      flag: "network-exposure-review",
      severity: "high",
      status: "pending",
      priority: 2,
      line: "network-exposure-review kuralı beklemede; demo senaryosu dikkat isteyen port yüzeyi olusturdu."
    };
  }

  if (scenario.id === "critical-posture-review") {
    next.critic.riskFlags = [
      ...new Set([...next.critic.riskFlags, "high-risk-triage", "network-exposure-review"])
    ];
    next.decision.blockers = [
      ...new Set([...next.decision.blockers, "high-risk-triage", "network-exposure-review"])
    ];
    next.decision.status = "needs-triage";
    next.decision.primaryBlockerReason = {
      flag: "high-risk-triage",
      severity: "high",
      status: "pending",
      priority: 1,
      line: "high-risk-triage kuralı beklemede; kritik demo senaryosu birden fazla dikkat alanı uretti."
    };
    next.execution.status = "needs-triage";
  } else {
    next.execution.status = next.decision.status;
  }

  return next;
}
