import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

import { deriveExecutionDecision } from "../src/lib/agent/decision-engine";
import {
  getExecutionStore,
  resetExecutionStoreForTests
} from "../src/lib/agent/execution-store";
import {
  collectExecutionObservations
} from "../src/lib/agent/observation-engine";
import { detectPlatformProfile } from "../src/lib/agent/platform-profile";
import {
  buildPolicyInsight,
  buildPolicyRiskContext
} from "../src/lib/agent/policy-engine";
import { getPersistentExecutionStorePath } from "../src/lib/agent/persistent-store";
import {
  executePrompt,
  getPromptExecutionReport,
  getTrustTrendSummary,
  listDemoScenarios,
  listPromptExecutionsByFilters
} from "../src/lib/agent/runtime";
import { runDemoScenario } from "../src/lib/agent/demo-scenarios";
import { buildTrustAssessment } from "../src/lib/agent/trust-engine";
import { getCognitiveSummary, getSystemSummary } from "../src/app/lib/platform-data";
import { scoreExecutionRisks } from "../src/lib/agent/risk-engine";
import type { PromptAnalysis, PromptExecutionReport } from "../src/types/agent";

function createAnalysis(
  overrides: Partial<PromptAnalysis> = {}
): PromptAnalysis {
  return {
    input: "localhost admin panelini analiz et",
    normalizedGoal: "localhost admin panelini analiz et",
    detectedTargets: ["localhost", "admin-panel"],
    suggestedMode: "discovery",
    actions: [],
    riskLevel: "high",
    explanation: "",
    intent: "analysis-request",
    expectedOutput: "",
    assistantResponse: "",
    urgency: "normal",
    responseStyle: "balanced",
    constraints: [],
    planSummary: "",
    ...overrides
  };
}

function createCritic(
  overrides: Partial<PromptExecutionReport["critic"]> = {}
): PromptExecutionReport["critic"] {
  return {
    verdict: "revise",
    summary: "Ek doğrulama gerekli.",
    riskFlags: ["network-exposure-review", "high-risk-triage"],
    policyMatches: [
      {
        flag: "network-exposure-review",
        action: "remove",
        matched: true,
        note: "Network blocker temizlenebilir."
      },
      {
        flag: "high-risk-triage",
        action: "remove",
        matched: false,
        note: "Riskli sinyal yoğunluğu hâlâ yüksek."
      }
    ],
    recommendedAction: "Collector ve critic zincirini yeniden çalıştır.",
    ...overrides
  };
}

function createHostRuntimeObservation(
  overrides: Partial<Record<string, unknown>> = {}
): PromptExecutionReport["observations"][number] {
  return {
    kind: "host-runtime",
    detail: "Runtime snapshot",
    confidence: 0.88,
    metadata: {
      hostname: "dev-localhost",
      cpuCount: 8,
      interfaces: ["en0", "lo0"],
      uptimeSeconds: 1234,
      ...overrides
    }
  };
}

test("strict profile keeps high-risk-triage as primary blocker", () => {
  const previousProfile = process.env.PROJECT_ASYLUM_POLICY_PROFILE;
  process.env.PROJECT_ASYLUM_POLICY_PROFILE = "strict-soc";

  try {
    const risks: PromptExecutionReport["risks"] = [
      {
        id: "risk-admin-surface",
        severity: "high",
        title: "Admin surface risk",
        rationale: "Admin yüzeyi dışa açık.",
        sourceKinds: ["network-surface"],
        score: 0.82
      },
      {
        id: "risk-network-exposure",
        severity: "medium",
        title: "Network exposure",
        rationale: "Açık port review gerektiriyor.",
        sourceKinds: ["network-surface"],
        score: 0.48
      }
    ];

    const policyInsight = buildPolicyInsight(
      "strict-soc",
      createCritic().policyMatches,
      buildPolicyRiskContext(risks),
      {
        collectorAttempts: 2,
        reasoningAttempts: 2,
        reviewPorts: [],
        riskySignals: ["NODE_ENV=unset", "interactive-shell=/bin/zsh", "user-home-scope"],
        hasCriticalRisk: false,
        hasHighProcessRisk: false
      }
    );

    const decision = deriveExecutionDecision(
      createAnalysis(),
      risks,
      createCritic(),
      policyInsight
    );

    assert.equal(decision.status, "needs-triage");
    assert.equal(decision.blockers[0], "high-risk-triage");
    assert.ok(decision.blockers.includes("network-exposure-review"));
    assert.equal(decision.primaryBlockerReason?.flag, "high-risk-triage");
    assert.equal(decision.primaryBlockerReason?.severity, "high");
  } finally {
    if (previousProfile === undefined) {
      delete process.env.PROJECT_ASYLUM_POLICY_PROFILE;
    } else {
      process.env.PROJECT_ASYLUM_POLICY_PROFILE = previousProfile;
    }
  }
});

test("trust score improves with successful history and drops with triage history", () => {
  const execution: PromptExecutionReport["execution"] = {
    id: "exec-1",
    prompt: "localhost config ayarlarini analiz et",
    mode: "discovery",
    status: "completed",
    riskLevel: "medium",
    policyProfile: "default",
    createdAt: new Date().toISOString(),
    summary: "",
    targets: ["configuration"]
  };

  const reasoning: PromptExecutionReport["reasoning"] = {
    belief: {
      summary: "Config hardening ihtiyacı",
      status: "tentative",
      confidence: 0.78,
      supportingKinds: ["configuration", "runtime"]
    },
    hypotheses: [],
    priorityHypothesisId: null,
    nextInference: "Config sinyallerini tekrar değerlendir."
  };

  const risks: PromptExecutionReport["risks"] = [
    {
      id: "risk-config-hardening",
      severity: "medium",
      title: "Config hardening",
      rationale: "Zayıf config sinyali",
      sourceKinds: ["configuration"],
      score: 0.35
    }
  ];

  const decision: PromptExecutionReport["decision"] = {
    status: "completed",
    rationale: "",
    blockers: [],
    primaryBlockerReason: null,
    nextStep: ""
  };
  const observations: PromptExecutionReport["observations"] = [
    createHostRuntimeObservation()
  ];

  const base = buildTrustAssessment({
    execution,
    observations,
    reasoning,
    risks,
    decision
  });
  const withSuccess = buildTrustAssessment({
    execution,
    observations,
    reasoning,
    risks,
    decision,
    historicalReports: [
      {
        execution,
        observations,
        risks,
        reasoning,
        plan: { objective: "", steps: [], guarded: false },
        taskRuns: [],
        critic: {
          verdict: "approve",
          summary: "",
          riskFlags: [],
          recommendedAction: ""
        },
        decision,
        generatedAt: new Date().toISOString()
      }
    ]
  });
  const withTriage = buildTrustAssessment({
    execution,
    observations,
    reasoning,
    risks,
    decision,
    historicalReports: [
      {
        execution: { ...execution, id: "exec-triage", status: "needs-triage" },
        observations,
        risks,
        reasoning,
        plan: { objective: "", steps: [], guarded: false },
        taskRuns: [],
        critic: {
          verdict: "revise",
          summary: "",
          riskFlags: ["high-risk-triage"],
          recommendedAction: ""
        },
        decision: { ...decision, status: "needs-triage", blockers: ["high-risk-triage"] },
        generatedAt: new Date().toISOString()
      }
    ]
  });

  assert.ok(withSuccess.confidenceScore > base.confidenceScore);
  assert.ok(withTriage.confidenceScore < base.confidenceScore);
  assert.match(
    withSuccess.confidenceFactors.join(" "),
    /environment-history-success=1/
  );
  assert.match(
    withTriage.confidenceFactors.join(" "),
    /environment-history-triage=1/
  );
});

test("trust history applies across different prompts in the same environment and action type", () => {
  const execution: PromptExecutionReport["execution"] = {
    id: "exec-env-action",
    prompt: "localhost config ayarlarini analiz et",
    mode: "discovery",
    status: "completed",
    riskLevel: "medium",
    policyProfile: "default",
    createdAt: new Date().toISOString(),
    summary: "",
    targets: ["localhost", "configuration"]
  };

  const reasoning: PromptExecutionReport["reasoning"] = {
    belief: {
      summary: "Config hardening ihtiyacı",
      status: "tentative",
      confidence: 0.74,
      supportingKinds: ["configuration", "runtime"]
    },
    hypotheses: [],
    priorityHypothesisId: null,
    nextInference: "Config sinyallerini tekrar değerlendir."
  };

  const risks: PromptExecutionReport["risks"] = [
    {
      id: "risk-config-hardening",
      severity: "medium",
      title: "Config hardening",
      rationale: "Zayıf config sinyali",
      sourceKinds: ["configuration"],
      score: 0.35
    }
  ];

  const decision: PromptExecutionReport["decision"] = {
    status: "completed",
    rationale: "",
    blockers: [],
    primaryBlockerReason: null,
    nextStep: ""
  };
  const observations: PromptExecutionReport["observations"] = [
    createHostRuntimeObservation({ hostname: "host-a" })
  ];

  const relatedHistory: PromptExecutionReport = {
    execution: {
      ...execution,
      id: "exec-related",
      prompt: "localhost config sertlestirmesini incele"
    },
    observations,
    risks,
    reasoning,
    plan: { objective: "", steps: [], guarded: false },
    taskRuns: [],
    critic: {
      verdict: "approve",
      summary: "",
      riskFlags: [],
      recommendedAction: ""
    },
    decision,
    generatedAt: new Date().toISOString()
  };

  const unrelatedHistory: PromptExecutionReport = {
    execution: {
      ...execution,
      id: "exec-unrelated",
      prompt: "remote host runtime durumunu analiz et",
      targets: ["host-runtime"]
    },
    observations: [createHostRuntimeObservation({ hostname: "host-b" })],
    risks: [
      {
        id: "risk-process-review",
        severity: "medium",
        title: "Process review",
        rationale: "Süreç incelemesi",
        sourceKinds: ["process-surface"],
        score: 0.4
      }
    ],
    reasoning,
    plan: { objective: "", steps: [], guarded: false },
    taskRuns: [],
    critic: {
      verdict: "approve",
      summary: "",
      riskFlags: [],
      recommendedAction: ""
    },
    decision,
    generatedAt: new Date().toISOString()
  };

  const base = buildTrustAssessment({
    execution,
    observations,
    reasoning,
    risks,
    decision
  });
  const withRelated = buildTrustAssessment({
    execution,
    observations,
    reasoning,
    risks,
    decision,
    historicalReports: [relatedHistory]
  });
  const withUnrelated = buildTrustAssessment({
    execution,
    observations,
    reasoning,
    risks,
    decision,
    historicalReports: [unrelatedHistory]
  });

  assert.ok(withRelated.confidenceScore > base.confidenceScore);
  assert.equal(withUnrelated.confidenceScore, base.confidenceScore);
  assert.match(withRelated.confidenceFactors.join(" "), /action-history-success=1/);
  assert.match(withUnrelated.confidenceFactors.join(" "), /action-history-success=0/);
});

test("policy insight explanation exposes matched and pending rules", () => {
  const insight = buildPolicyInsight(
    "default",
    [
      {
        flag: "network-exposure-review",
        action: "remove",
        matched: true,
        note: "Network blocker temizlenebilir."
      },
      {
        flag: "high-risk-triage",
        action: "remove",
        matched: false,
        note: "High risk triage beklemede."
      }
    ],
    {
      "network-exposure-review": {
        severity: "medium",
        score: 0.4,
        riskIds: ["risk-network-exposure"]
      },
      "high-risk-triage": {
        severity: "high",
        score: 0.82,
        riskIds: ["risk-admin-surface"]
      }
    },
    {
      collectorAttempts: 1,
      reasoningAttempts: 1,
      reviewPorts: [],
      riskySignals: ["NODE_ENV=unset"],
      hasCriticalRisk: false,
      hasHighProcessRisk: false
    }
  );

  assert.deepEqual(insight.matchedRules, ["network-exposure-review"]);
  assert.deepEqual(insight.pendingRules, ["high-risk-triage"]);
  assert.equal(insight.posture, "balanced");
  assert.equal(
    insight.evaluations["network-exposure-review"]?.collectorAttemptsSatisfied,
    true
  );
});

test("executePrompt produces a persisted report with trust and policy insight", () => {
  resetExecutionStoreForTests();

  const result = executePrompt(
    "localhost üzerindeki admin panelini analiz et ve açık port risklerini açıkla"
  );
  const report = getPromptExecutionReport(result.execution.id);

  assert.ok(report);
  assert.equal(report?.execution.id, result.execution.id);
  assert.equal(report?.policyProfile, result.execution.policyProfile);
  assert.ok((report?.observations.length ?? 0) > 0);
  assert.ok((report?.risks.length ?? 0) > 0);
  assert.ok(report?.trust);
  assert.ok(report?.policyInsight);
  assert.equal(report?.policyInsight?.profile, result.execution.policyProfile);
  assert.ok(
    ["observe-only", "approval-required", "low-risk-auto"].includes(
      report?.trust?.automationEligibility ?? ""
    )
  );
});

test("execution filters work together for status and policy profile", () => {
  const previousProfile = process.env.PROJECT_ASYLUM_POLICY_PROFILE;
  resetExecutionStoreForTests();

  try {
    process.env.PROJECT_ASYLUM_POLICY_PROFILE = "strict-soc";
    const strictExecution = executePrompt(
      "localhost admin panelini analiz et"
    ).execution;

    process.env.PROJECT_ASYLUM_POLICY_PROFILE = "default";
    const defaultExecution = executePrompt(
      "localhost config ayarlarini analiz et"
    ).execution;

    const strictOnly = listPromptExecutionsByFilters({
      policyProfile: "strict-soc"
    });
    const needsTriageStrictOnly = listPromptExecutionsByFilters({
      status: strictExecution.status,
      policyProfile: "strict-soc"
    });

    assert.ok(
      strictOnly.some((execution) => execution.id === strictExecution.id)
    );
    assert.ok(
      strictOnly.every((execution) => execution.policyProfile === "strict-soc")
    );
    assert.ok(
      needsTriageStrictOnly.some((execution) => execution.id === strictExecution.id)
    );
    assert.ok(
      !needsTriageStrictOnly.some((execution) => execution.id === defaultExecution.id)
    );
  } finally {
    if (previousProfile === undefined) {
      delete process.env.PROJECT_ASYLUM_POLICY_PROFILE;
    } else {
      process.env.PROJECT_ASYLUM_POLICY_PROFILE = previousProfile;
    }
  }
});

test("executePrompt persists trust trend records for environment and action scopes", () => {
  resetExecutionStoreForTests();

  const result = executePrompt(
    "localhost üzerindeki admin panelini analiz et ve açık port risklerini açıkla"
  );
  const store = getExecutionStore();
  const trustRecords = Object.values(store.trustRecords);
  const persistedPath = getPersistentExecutionStorePath();
  const persisted = JSON.parse(fs.readFileSync(persistedPath, "utf8")) as {
    trustRecords?: Record<string, { scope: string; lastStatus: string | null }>;
  };

  assert.ok(result.report.trust);
  assert.ok(
    trustRecords.some((record) => record.scope === "environment")
  );
  assert.ok(trustRecords.some((record) => record.scope === "action"));
  assert.ok(
    Object.values(persisted.trustRecords ?? {}).some(
      (record) => record.scope === "environment"
    )
  );
  assert.ok(
    Object.values(persisted.trustRecords ?? {}).some(
      (record) => record.scope === "action"
    )
  );
});

test("trust trend summary ranks strongest and weakest trust records", () => {
  const previousProfile = process.env.PROJECT_ASYLUM_POLICY_PROFILE;
  resetExecutionStoreForTests();

  try {
    process.env.PROJECT_ASYLUM_POLICY_PROFILE = "default";
    executePrompt("localhost config ayarlarini analiz et");
    executePrompt("localhost config ayarlarini analiz et");

    process.env.PROJECT_ASYLUM_POLICY_PROFILE = "strict-soc";
    executePrompt("localhost admin panelini analiz et ve açık port risklerini açıkla");

    const summary = getTrustTrendSummary();

    assert.ok(summary.totalRecords >= 2);
    assert.ok(summary.topEnvironment);
    assert.ok(summary.topAction);
    assert.ok(summary.weakestAction);
    assert.equal(summary.topEnvironment?.scope, "environment");
    assert.equal(summary.topAction?.scope, "action");
    assert.equal(summary.weakestAction?.scope, "action");
    assert.ok((summary.topEnvironment?.trustRatio ?? 0) >= 0);
    assert.ok((summary.topAction?.trustRatio ?? 0) >= 0);
    assert.ok(summary.recentRecords.length > 0);
  } finally {
    if (previousProfile === undefined) {
      delete process.env.PROJECT_ASYLUM_POLICY_PROFILE;
    } else {
      process.env.PROJECT_ASYLUM_POLICY_PROFILE = previousProfile;
    }
  }
});

test("system and cognitive summaries expose trust trend fields", () => {
  resetExecutionStoreForTests();
  executePrompt("localhost config ayarlarini analiz et");
  executePrompt("localhost admin panelini analiz et ve açık port risklerini açıkla");

  const systemSummary = getSystemSummary();
  const cognitiveSummary = getCognitiveSummary();

  assert.ok(systemSummary.trustTrend.totalRecords >= 2);
  assert.equal(typeof systemSummary.trustTrend.topEnvironmentRatio, "number");
  assert.equal(typeof systemSummary.trustTrend.weakestActionRatio, "number");
  assert.equal(typeof cognitiveSummary.trustTrend.topActionRatio, "number");
  assert.equal(
    typeof cognitiveSummary.trustTrend.weakestEnvironmentRatio,
    "number"
  );
  assert.ok(Array.isArray(cognitiveSummary.trustTrend.recentTrustSignals));
  assert.equal(typeof systemSummary.telemetry.sampledLogSourceCount, "number");
  assert.equal(typeof systemSummary.telemetry.securitySignalCount, "number");
  assert.ok(Array.isArray(cognitiveSummary.exposure.openPorts));
  assert.ok(Array.isArray(cognitiveSummary.exposure.highlightedPorts));
  assert.ok(Array.isArray(cognitiveSummary.exposure.bruteForceSignals));
  assert.ok(Array.isArray(cognitiveSummary.exposure.problemSignals));
  assert.equal(typeof systemSummary.exposure.openPortCount, "number");
  assert.equal(typeof systemSummary.exposure.bruteForceSignalCount, "number");
  assert.equal(typeof systemSummary.exposure.attentionCount, "number");
  assert.ok(Array.isArray(cognitiveSummary.telemetry.sampledLogSources));
  assert.ok(Array.isArray(cognitiveSummary.telemetry.securitySignals));
});

test("platform profile detects OS family and candidate log sources", () => {
  const profile = detectPlatformProfile();

  assert.ok(["linux", "macos", "windows", "unknown"].includes(profile.osFamily));
  assert.ok(profile.platform.length > 0);
  assert.ok(profile.hostname.length > 0);
  assert.ok(profile.logSources.length > 0);
  assert.ok(
    profile.logSources.every(
      (source) =>
        typeof source.path === "string" &&
        typeof source.exists === "boolean" &&
        typeof source.recommended === "boolean"
    )
  );
});

test("execution observations include telemetry/log discovery metadata", () => {
  const observations = collectExecutionObservations(
    createAnalysis({
      detectedTargets: ["localhost", "network-surface", "configuration"]
    })
  );
  const telemetry = observations.find(
    (observation) => observation.kind === "telemetry"
  );

  assert.ok(telemetry);
  assert.equal(typeof telemetry?.metadata?.osFamily, "string");
  assert.ok(Array.isArray(telemetry?.metadata?.sampledLogSources));
  assert.ok(Array.isArray(telemetry?.metadata?.previewLines));
  assert.ok(Array.isArray(telemetry?.metadata?.securitySignals));
});

test("risk engine can derive log anomaly risk from telemetry security signals", () => {
  const analysis = createAnalysis({
    detectedTargets: ["configuration"]
  });
  const observations: PromptExecutionReport["observations"] = [
    {
      kind: "telemetry",
      detail: "Log kaynaklari tarandi.",
      confidence: 0.72,
      metadata: {
        securitySignals: [
          "authentication failure for admin",
          "failed password for invalid user"
        ]
      }
    }
  ];

  const risks = scoreExecutionRisks(analysis, observations);
  const logRisk = risks.find((risk) => risk.id === "risk-log-anomaly");

  assert.ok(logRisk);
  assert.equal(logRisk?.severity, "medium");
  assert.ok((logRisk?.evidence?.length ?? 0) > 0);
});

test("install scripts emit structured bootstrap and doctor output", () => {
  const setupRaw = execFileSync(
    process.execPath,
    ["--import", "tsx", "scripts/setup-install.ts"],
    { cwd: process.cwd(), encoding: "utf8" }
  );
  const bootstrapRaw = execFileSync(
    process.execPath,
    ["--import", "tsx", "scripts/bootstrap-install.ts"],
    { cwd: process.cwd(), encoding: "utf8" }
  );
  const doctorRaw = execFileSync(
    process.execPath,
    ["--import", "tsx", "scripts/install-doctor.ts"],
    { cwd: process.cwd(), encoding: "utf8" }
  );
  const postcheckRaw = execFileSync(
    process.execPath,
    ["--import", "tsx", "scripts/postinstall-check.ts"],
    { cwd: process.cwd(), encoding: "utf8" }
  );

  const setup = JSON.parse(setupRaw) as {
    package: string;
    installMode: string;
    safeByDefault: boolean;
    remediationEnabled: boolean;
    envPath: string;
    envCreated: boolean;
    nextCommands: string[];
  };
  const bootstrap = JSON.parse(bootstrapRaw) as {
    installer: string;
    installationMode: string;
    safeByDefault: boolean;
    remediationEnabled: boolean;
    platformProfile: { osFamily: string; logSources: unknown[] };
    nextSteps: string[];
  };
  const doctor = JSON.parse(doctorRaw) as {
    doctor: string;
    installationMode: string;
    safeByDefault: boolean;
    remediationEnabled: boolean;
    platformProfile: { osFamily: string };
    checks: Array<{ id: string; ok: boolean }>;
  };
  const postcheck = JSON.parse(postcheckRaw) as {
    postcheck: string;
    installMode: string;
    safeByDefault: boolean;
    remediationEnabled: boolean;
    checks: Array<{ id: string; ok: boolean }>;
  };

  assert.equal(setup.package, "project-asylum");
  assert.equal(setup.installMode, "observe-only");
  assert.equal(setup.safeByDefault, true);
  assert.equal(setup.remediationEnabled, false);
  assert.ok(fs.existsSync(setup.envPath));
  assert.ok(setup.nextCommands.includes("npm run install:postcheck"));
  assert.equal(bootstrap.installer, "project-asylum-bootstrap");
  assert.equal(bootstrap.installationMode, "observe-only");
  assert.equal(bootstrap.safeByDefault, true);
  assert.equal(bootstrap.remediationEnabled, false);
  assert.ok(bootstrap.platformProfile.logSources.length > 0);
  assert.ok(bootstrap.nextSteps.includes("npm run dev"));
  assert.equal(doctor.doctor, "project-asylum-install");
  assert.equal(doctor.installationMode, "observe-only");
  assert.equal(doctor.safeByDefault, true);
  assert.equal(doctor.remediationEnabled, false);
  assert.ok(doctor.checks.some((check) => check.id === "platform-detected"));
  assert.equal(postcheck.postcheck, "project-asylum-install");
  assert.equal(postcheck.installMode, "observe-only");
  assert.equal(postcheck.safeByDefault, true);
  assert.equal(postcheck.remediationEnabled, false);
  assert.ok(postcheck.checks.every((check) => typeof check.ok === "boolean"));
});

test("release surface assets and professional project docs are present", () => {
  const requiredPaths = [
    "README.md",
    "release/README.md",
    "release/VERSION.json",
    "scripts/install.sh",
    "scripts/install.ps1",
    "INSTALLATION.md"
  ];

  for (const relativePath of requiredPaths) {
    assert.ok(fs.existsSync(relativePath), `${relativePath} should exist`);
  }

  const readme = fs.readFileSync("README.md", "utf8");
  const version = JSON.parse(
    fs.readFileSync("release/VERSION.json", "utf8")
  ) as {
    product: string;
    installationMode: string;
    safeByDefault: boolean;
  };

  assert.match(readme, /Project Asylum/);
  assert.match(readme, /observe-only/);
  assert.equal(version.product, "project-asylum");
  assert.equal(version.installationMode, "observe-only");
  assert.equal(version.safeByDefault, true);
});

test("demo scenarios are available and runnable for customer-facing critical moments", () => {
  resetExecutionStoreForTests();

  const scenarios = listDemoScenarios();
  const bruteForceScenario = scenarios.find(
    (scenario) => scenario.id === "brute-force-watch"
  );

  assert.ok(scenarios.length >= 3);
  assert.ok(bruteForceScenario);

  const bruteForce = runDemoScenario("brute-force-watch");
  const openPort = runDemoScenario("open-port-exposure");

  const bruteTelemetry = bruteForce.report.observations.find(
    (observation) => observation.kind === "telemetry"
  );
  const bruteSignals = Array.isArray(bruteTelemetry?.metadata?.securitySignals)
    ? bruteTelemetry.metadata.securitySignals
    : [];

  assert.equal(openPort.scenario.id, "open-port-exposure");
  assert.equal(openPort.execution.prompt, openPort.scenario.prompt);
  assert.ok(openPort.report.observations.length > 0);
  assert.ok(openPort.report.risks.length > 0);
  assert.equal(openPort.execution.status, "needs-triage");
  assert.ok(bruteSignals.length >= 3);
  assert.equal(bruteForce.execution.status, "needs-triage");
});
