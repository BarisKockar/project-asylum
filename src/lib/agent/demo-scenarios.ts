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

export type DemoTerminalEvent = {
  at: string;
  level: "info" | "warn" | "alert" | "ok";
  line: string;
};

export type DemoRuntime = {
  startedAt: string;
  summary: string;
  attackerIps: string[];
  highlightedPorts: number[];
  terminal: DemoTerminalEvent[];
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
  runtime: DemoRuntime;
} {
  const scenario = DEMO_SCENARIOS.find((entry) => entry.id === scenarioId);

  if (!scenario) {
    throw new Error("Demo senaryosu bulunamadi.");
  }

  const result = executePrompt(scenario.prompt);
  const overlay = applyScenarioOverlay(scenario, result.report);
  const store = getExecutionStore();

  store.reports[overlay.report.execution.id] = overlay.report;
  store.executions = store.executions.map((execution) =>
    execution.id === overlay.report.execution.id ? overlay.report.execution : execution
  );
  persistExecutionStore();

  return {
    scenario,
    execution: overlay.report.execution,
    report: overlay.report,
    runtime: overlay.runtime
  };
}

function applyScenarioOverlay(
  scenario: DemoScenario,
  report: PromptExecutionReport
): { report: PromptExecutionReport; runtime: DemoRuntime } {
  const next = structuredClone(report) as PromptExecutionReport;
  const startedAt = new Date().toISOString();
  const runtime: DemoRuntime = {
    startedAt,
    summary: `${scenario.title} senaryosu observe-only modda canlandirildi.`,
    attackerIps: [],
    highlightedPorts: [],
    terminal: []
  };
  next.execution.summary = `${next.execution.summary} Observe-only demo senaryosu uygulandi: ${scenario.title}.`;

  if (scenario.id === "brute-force-watch") {
    const attackSample = buildBruteForceAttackSample();
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
          ...new Set([...existingSignals, ...attackSample.securitySignals])
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
        evidence: attackSample.securitySignals.slice(0, 6)
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
    runtime.summary = `${attackSample.securitySignals.length} basarisiz giris denemesi ve ${attackSample.attackerIps.length} supheli IP goruldu.`;
    runtime.attackerIps = attackSample.attackerIps;
    runtime.terminal = attackSample.terminal;
  }

  if (scenario.id === "open-port-exposure") {
    const portSample = buildOpenPortSample();
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
        ports: [...new Set([...existingPorts, ...portSample.ports])],
        reviewPorts: [...new Set([...existingReviewPorts, ...portSample.highlightedPorts])]
      };
    }

    next.risks = next.risks.map((risk) =>
      risk.id === "risk-network-exposure"
        ? {
            ...risk,
            severity: "high",
            score: 0.82,
            evidence: [`Dinleyen portlar: ${portSample.ports.join(", ")}`]
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
    runtime.summary = `${portSample.highlightedPorts.length} dikkat isteyen port bulundu.`;
    runtime.highlightedPorts = portSample.highlightedPorts;
    runtime.terminal = portSample.terminal;
  }

  if (scenario.id === "critical-posture-review") {
    const criticalSample = buildCriticalReviewSample();
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
        securitySignals: [...new Set([...existingSignals, ...criticalSample.securitySignals])]
      };
    }
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
    runtime.summary = criticalSample.summary;
    runtime.attackerIps = criticalSample.attackerIps;
    runtime.highlightedPorts = criticalSample.highlightedPorts;
    runtime.terminal = criticalSample.terminal;
  } else {
    next.execution.status = next.decision.status;
  }

  return { report: next, runtime };
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(values: T[]): T {
  return values[randomInt(0, values.length - 1)] as T;
}

function buildBruteForceAttackSample(): {
  attackerIps: string[];
  securitySignals: string[];
  terminal: DemoTerminalEvent[];
} {
  const ipPool = [
    "185.14.29.77",
    "46.101.122.54",
    "91.134.18.203",
    "103.245.89.14",
    "198.199.81.44",
    "45.83.64.22",
    "172.104.41.91"
  ];
  const userPool = ["admin", "root", "deploy", "ubuntu", "git", "postgres"];
  const attackerIps = [...ipPool]
    .sort(() => Math.random() - 0.5)
    .slice(0, randomInt(3, 5));
  const attemptCount = randomInt(14, 28);
  const securitySignals: string[] = [];
  const terminal: DemoTerminalEvent[] = [
    {
      at: "00:00",
      level: "info",
      line: "collector.auth: auth log kaynagi taraniyor..."
    }
  ];

  for (let index = 0; index < attemptCount; index += 1) {
    const ip = randomPick(attackerIps);
    const username = randomPick(userPool);
    const port = randomInt(32000, 65000);
    const lineTemplates = [
      `failed password for ${username} from ${ip} port ${port} ssh2`,
      `authentication failure for ${username} from ${ip}`,
      `invalid user ${username} attempted from ${ip} port ${port}`
    ];
    const line = randomPick(lineTemplates);
    securitySignals.push(line);
    terminal.push({
      at: `00:${String(Math.min(index + 1, 59)).padStart(2, "0")}`,
      level: index % 5 === 0 ? "alert" : "warn",
      line: `stream.auth ${line}`
    });
  }

  terminal.push({
    at: "01:05",
    level: "alert",
    line: `critic: ${attemptCount} failed login denemesi, ${attackerIps.length} farkli IP, hizli triage onerildi`
  });

  return {
    attackerIps,
    securitySignals,
    terminal
  };
}

function buildOpenPortSample(): {
  ports: number[];
  highlightedPorts: number[];
  terminal: DemoTerminalEvent[];
} {
  const candidatePorts = [22, 80, 443, 8080, 8443, 9200, 5601, 3000, 5000, 9000];
  const ports = [...candidatePorts]
    .sort(() => Math.random() - 0.5)
    .slice(0, randomInt(4, 7))
    .sort((left, right) => left - right);
  const highlightedPorts = ports.filter((port) =>
    [22, 8080, 8443, 9200, 5601, 9000].includes(port)
  );
  const terminal: DemoTerminalEvent[] = [
    {
      at: "00:00",
      level: "info",
      line: "collector.net: dinleyen servisler taraniyor..."
    },
    ...ports.map((port, index) => ({
      at: `00:${String(index + 1).padStart(2, "0")}`,
      level: highlightedPorts.includes(port) ? "warn" : "info",
      line: `port-scan-lite: tcp/${port} listening`
    })),
    {
      at: "00:12",
      level: highlightedPorts.length > 1 ? "alert" : "warn",
      line: `critic: ${highlightedPorts.join(", ")} portlari ek kontrol gerektiriyor`
    }
  ];

  return {
    ports,
    highlightedPorts,
    terminal
  };
}

function buildCriticalReviewSample(): {
  summary: string;
  attackerIps: string[];
  highlightedPorts: number[];
  securitySignals: string[];
  terminal: DemoTerminalEvent[];
} {
  const bruteForce = buildBruteForceAttackSample();
  const ports = buildOpenPortSample();
  const configSignals = [
    "NODE_ENV=unset",
    "debug mode enabled for admin surface",
    "admin panel allowlist missing"
  ];

  return {
    summary: `${bruteForce.attackerIps.length} supheli IP, ${ports.highlightedPorts.length} dikkat isteyen port ve config posture uyarisı goruldu.`,
    attackerIps: bruteForce.attackerIps,
    highlightedPorts: ports.highlightedPorts,
    securitySignals: [...bruteForce.securitySignals.slice(0, 8), ...configSignals],
    terminal: [
      ...bruteForce.terminal.slice(0, 10),
      {
        at: "01:10",
        level: "warn",
        line: `config-snapshot: ${randomPick(configSignals)}`
      },
      ...ports.terminal.slice(1, 5),
      {
        at: "01:22",
        level: "alert",
        line: "policy-gate-check: coklu sinyal kumesi nedeniyle kritik posture incelemesi acildi"
      }
    ]
  };
}
