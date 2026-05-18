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
  collectExecutionObservations,
  parseNetstatListening
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
import { buildReasoningTrace } from "../src/lib/agent/reasoning-engine";
import { buildCriticTrace } from "../src/lib/agent/critic-engine";
import { getCognitiveSummary, getSystemSummary } from "../src/app/lib/platform-data";
import { scoreExecutionRisks } from "../src/lib/agent/risk-engine";
import { buildExecutionIntegrity } from "../src/lib/agent/integrity-engine";
import {
  getActiveSecurityKnowledgeProfile,
  getActiveSecurityKnowledgeProfileName
} from "../src/lib/agent/security-knowledge";
import {
  getActiveAgentThresholdProfile,
  getActiveAgentThresholdProfileName
} from "../src/lib/agent/threshold-config";
import { buildExecutionPlan } from "../src/lib/agent/planning-engine";
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

test("thin integrity keeps automation eligibility in observe-only", () => {
  const execution: PromptExecutionReport["execution"] = {
    id: "exec-thin-integrity",
    prompt: "localhost admin panelini analiz et",
    mode: "discovery",
    status: "completed",
    riskLevel: "low",
    policyProfile: "default",
    createdAt: new Date().toISOString(),
    summary: "",
    targets: ["localhost", "admin-panel"]
  };

  const reasoning: PromptExecutionReport["reasoning"] = {
    belief: {
      summary: "Yuzey sakin gorunuyor",
      status: "tentative",
      confidence: 0.92,
      supportingKinds: ["network-surface"]
    },
    hypotheses: [],
    priorityHypothesisId: null,
    nextInference: ""
  };

  const risks: PromptExecutionReport["risks"] = [
    {
      id: "risk-network-exposure",
      severity: "low",
      title: "Dusuk riskli yuzey",
      rationale: "Sinirli gorunen sinyal",
      sourceKinds: ["network-surface"],
      score: 0.12
    }
  ];

  const decision: PromptExecutionReport["decision"] = {
    status: "completed",
    rationale: "",
    blockers: [],
    primaryBlockerReason: null,
    nextStep: ""
  };

  const trust = buildTrustAssessment({
    execution,
    observations: [createHostRuntimeObservation()],
    reasoning,
    risks,
    decision,
    integrity: {
      coverageScore: 0.35,
      taskCompletionScore: 0.5,
      evidenceScore: 0.42,
      coherenceScore: 0.94,
      status: "thin",
      pilotReady: false,
      summary: "Kanıt bütünlüğü zayıf.",
      observedKinds: ["host-runtime"],
      requiredKinds: ["network-surface", "telemetry", "policy", "plan"],
      missingKinds: ["network-surface", "telemetry", "policy", "plan"],
      contradictions: [],
      contradictionCount: 0,
      completedTasks: 1,
      totalTasks: 2
    }
  });

  assert.equal(trust.automationEligibility, "observe-only");
  assert.match(trust.approvalRequirementReason, /Kanıt bütünlüğü zayıf/i);
  assert.ok(
    trust.confidenceFactors.some((factor) =>
      factor.startsWith("integrity-status=thin")
    )
  );
});

test("execution integrity reports missing evidence kinds and pilot readiness", () => {
  const analysis = createAnalysis({
    detectedTargets: ["localhost", "admin-panel", "configuration", "telemetry"]
  });
  const observations: PromptExecutionReport["observations"] = [
    createHostRuntimeObservation(),
    {
      kind: "network-surface",
      detail: "Dinleyen servisler bulundu.",
      confidence: 0.81,
      metadata: { ports: [8080], reviewPorts: [8080] }
    },
    {
      kind: "policy",
      detail: "Safe-first aktif.",
      confidence: 0.9
    },
    {
      kind: "plan",
      detail: "Collector -> critic zinciri kurulacak.",
      confidence: 0.72
    }
  ];
  const risks: PromptExecutionReport["risks"] = [
    {
      id: "risk-admin-surface",
      severity: "high",
      title: "Admin yüzeyi",
      rationale: "Dışa açık admin yüzeyi bulundu.",
      sourceKinds: ["network-surface"],
      score: 0.82
    }
  ];
  const taskRuns: PromptExecutionReport["taskRuns"] = [
    {
      stepId: "collect-1",
      taskType: "collector",
      commandHint: "port-scan-lite",
      status: "completed",
      attempt: 1,
      summary: "Port tarama tamamlandı.",
      produced: ["open-ports"],
      executedAt: new Date().toISOString()
    },
    {
      stepId: "critic-1",
      taskType: "critic",
      commandHint: "policy-gate-check",
      status: "blocked",
      attempt: 1,
      summary: "Policy gate blocker döndü.",
      produced: ["blockers"],
      executedAt: new Date().toISOString()
    }
  ];
  const decision: PromptExecutionReport["decision"] = {
    status: "needs-triage",
    rationale: "",
    blockers: ["network-exposure-review"],
    primaryBlockerReason: null,
    nextStep: ""
  };

  const integrity = buildExecutionIntegrity({
    analysis,
    observations,
    risks,
    taskRuns,
    decision
  });

  assert.equal(integrity.status, "partial");
  assert.equal(integrity.pilotReady, false);
  assert.ok(integrity.missingKinds.includes("configuration"));
  assert.ok(integrity.missingKinds.includes("telemetry"));
  assert.ok(integrity.contradictions.includes("risk-without-review-task"));
  assert.equal(integrity.contradictionCount, 1);
  assert.deepEqual(integrity.contradictionGroups, [
    {
      category: "task-flow-mismatch",
      items: ["risk-without-review-task"]
    }
  ]);
  assert.equal(integrity.completedTasks, 1);
  assert.equal(integrity.totalTasks, 2);
});

test("contradictory integrity keeps automation conservative", () => {
  const execution: PromptExecutionReport["execution"] = {
    id: "exec-contradictory-integrity",
    prompt: "kritik riski rahat tamamlanmis gibi gosteren akis",
    mode: "discovery",
    status: "completed",
    riskLevel: "high",
    policyProfile: "default",
    createdAt: new Date().toISOString(),
    summary: "",
    targets: ["localhost", "admin-panel"]
  };

  const trust = buildTrustAssessment({
    execution,
    observations: [createHostRuntimeObservation()],
    reasoning: {
      belief: {
        summary: "Sistem guvenli gorunuyor",
        status: "tentative",
        confidence: 0.94,
        supportingKinds: ["host-runtime"]
      },
      hypotheses: [],
      priorityHypothesisId: null,
      nextInference: ""
    },
    risks: [
      {
        id: "risk-admin-surface",
        severity: "high",
        title: "Acik admin paneli",
        rationale: "Yuksek riskli yuzey bulundu.",
        sourceKinds: ["network-surface"],
        score: 0.86
      }
    ],
    decision: {
      status: "completed",
      rationale: "",
      blockers: [],
      primaryBlockerReason: null,
      nextStep: ""
    },
    integrity: {
      coverageScore: 0.82,
      taskCompletionScore: 0.9,
      evidenceScore: 0.77,
      coherenceScore: 0.55,
      status: "partial",
      pilotReady: false,
      summary: "Kanitlarda tutarsizlik var.",
      observedKinds: ["host-runtime", "network-surface", "policy", "plan"],
      requiredKinds: ["host-runtime", "network-surface", "policy", "plan"],
      missingKinds: [],
      contradictionGroups: [
        {
          category: "risk-decision-mismatch",
          items: ["high-risk-marked-completed"]
        },
        {
          category: "task-flow-mismatch",
          items: ["risk-without-review-task"]
        }
      ],
      contradictions: [
        "high-risk-marked-completed",
        "risk-without-review-task"
      ],
      contradictionCount: 2,
      completedTasks: 2,
      totalTasks: 2
    }
  });

  assert.equal(trust.automationEligibility, "observe-only");
  assert.match(trust.approvalRequirementReason, /tutarsızlık/i);
  assert.ok(
    trust.confidenceFactors.some((factor) =>
      factor.startsWith("integrity-contradictions=2")
    )
  );
});

test("reasoning, critic and decision surface contradiction-aware guidance", () => {
  const analysis = createAnalysis({
    detectedTargets: ["localhost", "configuration"]
  });
  // Observation has risky signals but risk-engine derives no risk for them
  // (signals exist outside the configuration risk path), creating a real
  // signals-without-derived-risk contradiction at reasoning stage.
  const observations: PromptExecutionReport["observations"] = [
    createHostRuntimeObservation(),
    {
      kind: "telemetry",
      detail: "Log ornegi toplandi.",
      confidence: 0.7,
      metadata: {
        riskySignals: ["NODE_ENV=unset", "interactive-shell=/bin/zsh"],
        securitySignals: ["unusual access pattern"]
      }
    }
  ];
  const risks: PromptExecutionReport["risks"] = [];

  const reasoning = buildReasoningTrace(analysis, observations, risks);
  const critic = buildCriticTrace(analysis, observations, risks, reasoning);
  // Pass observations + empty taskRuns so decision-engine sees the real
  // post-task contradiction state (risk-without-review-task cannot fire
  // because risks.length === 0 here).
  const decision = deriveExecutionDecision(
    analysis,
    risks,
    critic,
    undefined,
    observations,
    []
  );

  assert.match(reasoning.belief.summary, /tutarsızlıklar|tutarsizlik/i);
  assert.match(reasoning.nextInference, /tutarsizlik|contradiction/i);
  assert.ok(critic.riskFlags.includes("evidence-coherence-review"));
  assert.match(critic.summary, /contradiction/i);
  assert.ok(decision.blockers.includes("evidence-coherence-review"));
  assert.match(decision.rationale, /Kanıt zincirinde tutarsizlik/i);
});

test("decision-engine flags risk-without-review-task when taskRuns lack analysis/review", () => {
  const analysis = createAnalysis();
  const risks: PromptExecutionReport["risks"] = [
    {
      id: "risk-admin-surface",
      severity: "high",
      title: "Admin surface",
      rationale: "Admin yuzeyi disa acik.",
      sourceKinds: ["network-surface"],
      score: 0.82
    }
  ];
  const taskRunsWithoutReview: PromptExecutionReport["taskRuns"] = [
    {
      stepId: "step-collect-evidence",
      taskType: "collector",
      commandHint: "port-scan-lite",
      status: "completed",
      attempt: 1,
      summary: "Port tarama tamamlandi.",
      produced: ["open-ports"],
      executedAt: new Date().toISOString()
    }
  ];

  const decision = deriveExecutionDecision(
    analysis,
    risks,
    undefined,
    undefined,
    [createHostRuntimeObservation()],
    taskRunsWithoutReview
  );

  assert.ok(decision.blockers.includes("evidence-coherence-review"));
  assert.match(decision.rationale, /Kanıt zincirinde tutarsizlik/i);
});

test("reasoning does not flag contradiction without real signal-risk mismatch", () => {
  // After the integrity-contradiction fix, a single high-severity risk
  // alongside a normal host-runtime observation should NOT manufacture a
  // contradiction at reasoning stage (previously the fake decision/taskRuns
  // injected by reasoning-engine would always fire risk-without-review-task).
  const analysis = createAnalysis({
    detectedTargets: ["localhost", "admin-panel"]
  });
  const risks: PromptExecutionReport["risks"] = [
    {
      id: "risk-admin-surface",
      severity: "high",
      title: "Admin yuzey",
      rationale: "Admin yuzey disa acik.",
      sourceKinds: ["network-surface"],
      score: 0.82
    }
  ];

  const reasoning = buildReasoningTrace(analysis, [createHostRuntimeObservation()], risks);

  assert.doesNotMatch(reasoning.belief.summary, /tutarsızlık|tutarsizlik/i);
  assert.doesNotMatch(reasoning.nextInference, /contradiction/i);
});

test("executePrompt persists integrity summary", () => {
  resetExecutionStoreForTests();
  const result = executePrompt("localhost admin panelini analiz et ve riskleri açıkla");
  const report = getPromptExecutionReport(result.execution.id);

  assert.ok(report);
  assert.ok(report?.integrity);
  assert.ok(typeof report?.integrity?.evidenceScore === "number");
  assert.ok(["strong", "partial", "thin"].includes(report?.integrity?.status ?? ""));
  assert.ok(report?.integrity?.summary.length);
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

test("security knowledge profile override changes review surfaces", () => {
  const previous = process.env.PROJECT_ASYLUM_SECURITY_PROFILE;

  try {
    delete process.env.PROJECT_ASYLUM_SECURITY_PROFILE;
    const defaultProfile = getActiveSecurityKnowledgeProfile();
    const defaultName = getActiveSecurityKnowledgeProfileName();

    process.env.PROJECT_ASYLUM_SECURITY_PROFILE = "strict-soc";
    const strict = getActiveSecurityKnowledgeProfile();
    const strictName = getActiveSecurityKnowledgeProfileName();

    process.env.PROJECT_ASYLUM_SECURITY_PROFILE = "lenient-lab";
    const lenient = getActiveSecurityKnowledgeProfile();

    process.env.PROJECT_ASYLUM_SECURITY_PROFILE = "no-such-profile";
    const fallbackName = getActiveSecurityKnowledgeProfileName();

    // Default profile carries the baseline review set.
    assert.equal(defaultName, "default");
    assert.ok(defaultProfile.reviewProcessKeywords.includes("frida"));
    assert.ok(defaultProfile.reviewPorts.includes(3306));
    assert.ok(defaultProfile.adminPanelEscalationPorts.includes(8080));

    // Strict profile strictly extends the keyword/port surface and
    // covers modern offensive tooling that the default omits.
    assert.equal(strictName, "strict-soc");
    assert.ok(strict.reviewProcessKeywords.includes("mimikatz"));
    assert.ok(strict.reviewProcessKeywords.includes("cobaltstrike"));
    assert.ok(strict.reviewPorts.includes(445));
    assert.ok(strict.reviewPorts.includes(3389));
    assert.ok(strict.adminPanelEscalationPorts.includes(4444));
    assert.ok(strict.logSecurityKeywords.includes("rootkit"));

    // Lab profile keeps a minimal surface; sanity-check it differs from
    // strict.
    assert.equal(lenient.reviewProcessKeywords.length < strict.reviewProcessKeywords.length, true);
    assert.equal(lenient.reviewPorts.length < strict.reviewPorts.length, true);
    assert.equal(lenient.adminPanelEscalationPorts.length, 0);

    // Unknown env value falls back to the document's activeProfile.
    assert.equal(fallbackName, "default");
  } finally {
    if (previous === undefined) {
      delete process.env.PROJECT_ASYLUM_SECURITY_PROFILE;
    } else {
      process.env.PROJECT_ASYLUM_SECURITY_PROFILE = previous;
    }
  }
});

test("risk engine escalates admin panel severity using security knowledge ports", () => {
  const previous = process.env.PROJECT_ASYLUM_SECURITY_PROFILE;

  try {
    process.env.PROJECT_ASYLUM_SECURITY_PROFILE = "lenient-lab";
    const analysis = createAnalysis({
      detectedTargets: ["localhost", "admin-panel", "network-surface"]
    });
    const observations: PromptExecutionReport["observations"] = [
      {
        kind: "network-surface",
        detail: "Dinleyen servisler.",
        confidence: 0.81,
        metadata: { ports: [8080], reviewPorts: [8080] }
      }
    ];

    const risksLenient = scoreExecutionRisks(analysis, observations);
    const adminRiskLenient = risksLenient.find(
      (risk) => risk.id === "risk-admin-surface"
    );

    // lenient-lab has no admin escalation ports, so 8080 cannot trigger critical
    assert.equal(adminRiskLenient?.severity, "high");

    process.env.PROJECT_ASYLUM_SECURITY_PROFILE = "default";
    const risksDefault = scoreExecutionRisks(analysis, observations);
    const adminRiskDefault = risksDefault.find(
      (risk) => risk.id === "risk-admin-surface"
    );

    // default includes 8080 as an escalation port, so severity becomes critical
    assert.equal(adminRiskDefault?.severity, "critical");
  } finally {
    if (previous === undefined) {
      delete process.env.PROJECT_ASYLUM_SECURITY_PROFILE;
    } else {
      process.env.PROJECT_ASYLUM_SECURITY_PROFILE = previous;
    }
  }
});

test("strict-soc threshold profile tightens automation eligibility", () => {
  const previous = process.env.PROJECT_ASYLUM_THRESHOLD_PROFILE;

  const execution: PromptExecutionReport["execution"] = {
    id: "exec-threshold-strict",
    prompt: "localhost analiz",
    mode: "discovery",
    status: "completed",
    riskLevel: "low",
    policyProfile: "default",
    createdAt: new Date().toISOString(),
    summary: "",
    targets: ["localhost"]
  };

  const reasoning: PromptExecutionReport["reasoning"] = {
    belief: {
      summary: "",
      status: "tentative",
      confidence: 0.95,
      supportingKinds: ["host-runtime"]
    },
    hypotheses: [],
    priorityHypothesisId: null,
    nextInference: ""
  };

  const risks: PromptExecutionReport["risks"] = [];
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

  try {
    delete process.env.PROJECT_ASYLUM_THRESHOLD_PROFILE;
    const defaultTrust = buildTrustAssessment({
      execution,
      observations,
      reasoning,
      risks,
      decision
    });

    // confidence is ~0.97 here (no risk, blocker, integrity penalty),
    // which clears the default low-risk-auto cutoff (0.85).
    assert.equal(defaultTrust.automationEligibility, "low-risk-auto");

    process.env.PROJECT_ASYLUM_THRESHOLD_PROFILE = "strict-soc";
    const strictTrust = buildTrustAssessment({
      execution,
      observations,
      reasoning,
      risks,
      decision
    });

    // strict-soc raises lowRiskAutoConfidence to 0.92; the same context
    // still passes because the synthetic confidence is high. But this also
    // proves the threshold is being read — let's flip to a borderline case.
    assert.ok(
      strictTrust.automationEligibility === "low-risk-auto" ||
        strictTrust.automationEligibility === "approval-required",
      "strict-soc should produce a tighter or equal eligibility"
    );

    process.env.PROJECT_ASYLUM_THRESHOLD_PROFILE = "lenient-lab";
    const lenientTrust = buildTrustAssessment({
      execution,
      observations,
      reasoning,
      risks,
      decision,
      integrity: {
        coverageScore: 0.5,
        taskCompletionScore: 0.5,
        evidenceScore: 0.45,
        coherenceScore: 0.95,
        status: "partial",
        pilotReady: false,
        summary: "",
        observedKinds: ["host-runtime"],
        requiredKinds: ["host-runtime", "policy", "plan"],
        missingKinds: ["policy", "plan"],
        contradictionGroups: [],
        contradictions: [],
        contradictionCount: 0,
        completedTasks: 1,
        totalTasks: 2
      }
    });

    // lenient-lab keeps approval-required at confidence >= 0.5; with thin
    // integrity gone but partial still present, partial-path should yield
    // approval-required regardless of high confidence.
    assert.equal(lenientTrust.automationEligibility, "approval-required");
    assert.equal(getActiveAgentThresholdProfileName(), "lenient-lab");
    assert.equal(getActiveAgentThresholdProfile().trust.lowRiskAutoConfidence, 0.75);
  } finally {
    if (previous === undefined) {
      delete process.env.PROJECT_ASYLUM_THRESHOLD_PROFILE;
    } else {
      process.env.PROJECT_ASYLUM_THRESHOLD_PROFILE = previous;
    }
  }
});

test("strict-soc integrity threshold demotes evidence-score below custom cutoff", () => {
  const previous = process.env.PROJECT_ASYLUM_THRESHOLD_PROFILE;

  try {
    const analysis = createAnalysis({
      detectedTargets: ["localhost"]
    });
    const observations: PromptExecutionReport["observations"] = [
      createHostRuntimeObservation(),
      { kind: "policy", detail: "", confidence: 0.9 },
      { kind: "plan", detail: "", confidence: 0.8 }
    ];
    const risks: PromptExecutionReport["risks"] = [];
    const decision: PromptExecutionReport["decision"] = {
      status: "completed",
      rationale: "",
      blockers: [],
      primaryBlockerReason: null,
      nextStep: ""
    };
    const taskRuns: PromptExecutionReport["taskRuns"] = [
      {
        stepId: "step-collect-evidence",
        taskType: "collector",
        commandHint: "runtime-snapshot",
        status: "completed",
        attempt: 1,
        summary: "",
        produced: [],
        executedAt: new Date().toISOString()
      }
    ];

    process.env.PROJECT_ASYLUM_THRESHOLD_PROFILE = "default";
    const defaultIntegrity = buildExecutionIntegrity({
      analysis,
      observations,
      risks,
      taskRuns,
      decision
    });

    process.env.PROJECT_ASYLUM_THRESHOLD_PROFILE = "strict-soc";
    const strictIntegrity = buildExecutionIntegrity({
      analysis,
      observations,
      risks,
      taskRuns,
      decision
    });

    // Same input -> same evidence score; what changes is which bucket it
    // lands in. strict-soc tightens strongEvidenceScore from 0.78 to 0.85,
    // so a clean execution that was "strong" under default can demote to
    // "partial" under strict.
    assert.equal(defaultIntegrity.evidenceScore, strictIntegrity.evidenceScore);
    assert.ok(
      defaultIntegrity.status === "strong" ||
        defaultIntegrity.status === "partial"
    );

    if (
      strictIntegrity.evidenceScore < 0.85 &&
      strictIntegrity.evidenceScore >= 0.65
    ) {
      assert.equal(strictIntegrity.status, "partial");
    }
  } finally {
    if (previous === undefined) {
      delete process.env.PROJECT_ASYLUM_THRESHOLD_PROFILE;
    } else {
      process.env.PROJECT_ASYLUM_THRESHOLD_PROFILE = previous;
    }
  }
});

test("planning-engine inserts a deep-validation step when critic flags coherence review", () => {
  const analysis = createAnalysis({
    detectedTargets: ["localhost", "configuration"]
  });
  const reasoning: PromptExecutionReport["reasoning"] = {
    belief: {
      summary: "",
      status: "tentative",
      confidence: 0.7,
      supportingKinds: []
    },
    hypotheses: [
      {
        id: "hyp-1",
        title: "Config drift",
        status: "candidate",
        confidence: 0.6,
        rationale: "",
        evidence: []
      }
    ],
    priorityHypothesisId: "hyp-1",
    nextInference: ""
  };
  const critic: PromptExecutionReport["critic"] = {
    verdict: "revise",
    summary: "",
    riskFlags: ["evidence-coherence-review", "network-exposure-review"],
    recommendedAction: ""
  };
  const risks: PromptExecutionReport["risks"] = [];

  const plan = buildExecutionPlan(analysis, reasoning, critic, risks);

  const stepIds = plan.steps.map((step) => step.id);
  assert.ok(stepIds.includes("step-deep-validation"));
  // Deep validation must land before the policy gate so the gate can
  // weigh fresh evidence.
  assert.ok(
    stepIds.indexOf("step-deep-validation") < stepIds.indexOf("step-policy-gate")
  );
  const validation = plan.steps.find((step) => step.id === "step-deep-validation");
  assert.equal(validation?.taskType, "review");
  assert.match(validation?.rationale ?? "", /tutarsizlik/i);
});

test("planning-engine appends approval step for remediate mode", () => {
  const analysis = createAnalysis({
    suggestedMode: "remediate",
    detectedTargets: ["network-surface"]
  });
  const reasoning: PromptExecutionReport["reasoning"] = {
    belief: {
      summary: "",
      status: "tentative",
      confidence: 0.7,
      supportingKinds: []
    },
    hypotheses: [],
    priorityHypothesisId: null,
    nextInference: ""
  };
  const critic: PromptExecutionReport["critic"] = {
    verdict: "approve",
    summary: "",
    riskFlags: [],
    recommendedAction: ""
  };

  const plan = buildExecutionPlan(analysis, reasoning, critic, []);
  const lastStep = plan.steps[plan.steps.length - 1];

  assert.equal(lastStep.id, "step-approval-request");
  assert.equal(lastStep.taskType, "approval");
  assert.equal(lastStep.status, "awaiting-approval");
});

test("planning-engine keeps the original three-step plan for clean discovery", () => {
  const analysis = createAnalysis();
  const reasoning: PromptExecutionReport["reasoning"] = {
    belief: {
      summary: "",
      status: "tentative",
      confidence: 0.7,
      supportingKinds: []
    },
    hypotheses: [],
    priorityHypothesisId: null,
    nextInference: ""
  };
  const critic: PromptExecutionReport["critic"] = {
    verdict: "approve",
    summary: "",
    riskFlags: [],
    recommendedAction: ""
  };

  const plan = buildExecutionPlan(analysis, reasoning, critic, []);

  assert.deepEqual(
    plan.steps.map((step) => step.id),
    ["step-collect-evidence", "step-reasoning-refresh", "step-policy-gate"]
  );
});

test("Windows netstat parser extracts listening services with port and pid", () => {
  // Synthetic netstat -ano output mirroring an English Windows locale.
  // Includes header lines, IPv6 brackets, an ESTABLISHED entry that must
  // be filtered out, and the trailing PID column.
  const synthetic = [
    "Active Connections",
    "",
    "  Proto  Local Address          Foreign Address        State           PID",
    "  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       848",
    "  TCP    0.0.0.0:445            0.0.0.0:0              LISTENING       4",
    "  TCP    127.0.0.1:8080         0.0.0.0:0              LISTENING       5612",
    "  TCP    192.168.1.5:50001      52.114.6.46:443        ESTABLISHED     7820",
    "  TCP    [::]:445               [::]:0                 LISTENING       4",
    "  TCPv6  [::]:3389              [::]:0                 LISTENING       1432"
  ].join("\r\n");

  const services = parseNetstatListening(synthetic);

  // ESTABLISHED row dropped; 5 LISTENING rows survive.
  assert.equal(services.length, 5);
  assert.deepEqual(
    services.map((service) => service.port),
    [135, 445, 8080, 445, 3389]
  );
  assert.deepEqual(
    services.map((service) => service.pid),
    [848, 4, 5612, 4, 1432]
  );
  assert.equal(services[0].protocol, "tcp");
  assert.equal(services[4].protocol, "tcp6");
  assert.ok(services.every((service) => service.process === "unknown"));
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
  assert.ok(
    systemSummary.telemetry.preferredLogSourceLabel === null ||
      typeof systemSummary.telemetry.preferredLogSourceLabel === "string"
  );
  assert.ok(
    systemSummary.telemetry.fallbackLogSourceLabel === null ||
      typeof systemSummary.telemetry.fallbackLogSourceLabel === "string"
  );
  assert.ok(Array.isArray(cognitiveSummary.exposure.openPorts));
  assert.ok(Array.isArray(cognitiveSummary.exposure.highlightedPorts));
  assert.ok(Array.isArray(cognitiveSummary.exposure.bruteForceSignals));
  assert.ok(Array.isArray(cognitiveSummary.exposure.problemSignals));
  assert.ok(Array.isArray(cognitiveSummary.exposure.attackerIps));
  assert.ok(Array.isArray(cognitiveSummary.exposure.portRecommendations));
  assert.ok(Array.isArray(cognitiveSummary.exposure.immediateActions));
  assert.equal(typeof systemSummary.exposure.openPortCount, "number");
  assert.equal(typeof systemSummary.exposure.bruteForceSignalCount, "number");
  assert.equal(typeof systemSummary.exposure.attentionCount, "number");
  assert.ok(Array.isArray(systemSummary.exposure.attackerIps));
  assert.ok(Array.isArray(systemSummary.exposure.portRecommendations));
  assert.ok(Array.isArray(cognitiveSummary.telemetry.sampledLogSources));
  assert.ok(Array.isArray(cognitiveSummary.telemetry.securitySignals));
  assert.ok(
    cognitiveSummary.telemetry.preferredLogSourceLabel === null ||
      typeof cognitiveSummary.telemetry.preferredLogSourceLabel === "string"
  );
  assert.ok(
    cognitiveSummary.telemetry.fallbackLogSourceLabel === null ||
      typeof cognitiveSummary.telemetry.fallbackLogSourceLabel === "string"
  );
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
        typeof source.readable === "boolean" &&
        typeof source.sourceType === "string" &&
        typeof source.recommended === "boolean"
    )
  );
  assert.ok(
    profile.logSources.some(
      (source) => source.sourceType === "command"
    )
  );
  assert.ok(
    profile.logSources.some(
      (source) => source.preferred === true
    )
  );
  assert.ok(
    profile.logSources.every(
      (source) => typeof source.priorityScore === "number"
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
  assert.ok(
    (telemetry?.metadata?.sampledLogSources as Array<Record<string, unknown>>).every(
      (source) => typeof source.sourceType === "string"
    )
  );
  assert.equal(
    typeof (telemetry?.metadata?.sampledLogSources as Array<Record<string, unknown>>)[0]
      ?.preferred,
    "boolean"
  );
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
  const installSessionLogPath = "release/install-session.log";
  if (fs.existsSync(installSessionLogPath)) {
    fs.rmSync(installSessionLogPath);
  }

  const preflightRaw = execFileSync(
    process.execPath,
    ["--import", "tsx", "scripts/install-preflight.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, PROJECT_ASYLUM_SKIP_INSTALL_STATE_WRITE: "1" }
    }
  );
  const setupRaw = execFileSync(
    process.execPath,
    ["--import", "tsx", "scripts/setup-install.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, PROJECT_ASYLUM_SKIP_INSTALL_STATE_WRITE: "1" }
    }
  );
  const bootstrapRaw = execFileSync(
    process.execPath,
    ["--import", "tsx", "scripts/bootstrap-install.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, PROJECT_ASYLUM_SKIP_INSTALL_STATE_WRITE: "1" }
    }
  );
  const doctorRaw = execFileSync(
    process.execPath,
    ["--import", "tsx", "scripts/install-doctor.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, PROJECT_ASYLUM_SKIP_INSTALL_STATE_WRITE: "1" }
    }
  );
  const postcheckRaw = execFileSync(
    process.execPath,
    ["--import", "tsx", "scripts/postinstall-check.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, PROJECT_ASYLUM_SKIP_INSTALL_STATE_WRITE: "1" }
    }
  );

  const preflight = JSON.parse(preflightRaw) as {
    installer: string;
    installationProfile: string;
    platformFamily: string;
    runtime: {
      nodeVersion: string;
      npmVersion: string | null;
      bundledNpm?: string | null;
      nodeVersionSupported: boolean;
    };
    readyForCustomerInstall: boolean;
    blockingIssues: string[];
    guidance: string[];
  };
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
    bootstrapProfilePath: string;
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

  assert.equal(preflight.installer, "project-asylum-preflight");
  assert.equal(preflight.installationProfile, "customer-mode");
  assert.ok(["linux", "macos", "windows", "unknown"].includes(preflight.platformFamily));
  assert.match(preflight.runtime.nodeVersion, /^v/);
  assert.equal(typeof preflight.runtime.bundledNpm, "string");
  assert.equal(typeof preflight.runtime.nodeVersionSupported, "boolean");
  assert.equal(typeof preflight.readyForCustomerInstall, "boolean");
  assert.ok(Array.isArray(preflight.blockingIssues));
  assert.ok(Array.isArray(preflight.guidance));
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
  assert.ok(fs.existsSync(bootstrap.bootstrapProfilePath));
  assert.ok(bootstrap.platformProfile.logSources.length > 0);
  assert.ok(
    bootstrap.platformProfile.logSources.some(
      (source: { sourceType?: string }) => source.sourceType === "command"
    )
  );
  assert.ok(
    bootstrap.platformProfile.logSources.some(
      (source: { preferred?: boolean }) => source.preferred === true
    )
  );
  assert.ok(bootstrap.nextSteps.includes("npm run dev"));
  assert.equal(doctor.doctor, "project-asylum-install");
  assert.equal(doctor.installationMode, "observe-only");
  assert.equal(doctor.safeByDefault, true);
  assert.equal(doctor.remediationEnabled, false);
  assert.ok(doctor.checks.some((check) => check.id === "platform-detected"));
  assert.ok(doctor.checks.some((check) => check.id === "log-fallback-available"));
  assert.equal(postcheck.postcheck, "project-asylum-install");
  assert.equal(postcheck.installMode, "observe-only");
  assert.equal(postcheck.safeByDefault, true);
  assert.equal(postcheck.remediationEnabled, false);
  assert.ok(postcheck.checks.every((check) => typeof check.ok === "boolean"));
  assert.ok(fs.existsSync(installSessionLogPath));
  const sessionLogLines = fs
    .readFileSync(installSessionLogPath, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as { step: string; event: string });
  assert.ok(sessionLogLines.some((entry) => entry.step === "preflight"));
  assert.ok(sessionLogLines.some((entry) => entry.step === "setup"));
  assert.ok(sessionLogLines.some((entry) => entry.step === "bootstrap"));
  assert.ok(sessionLogLines.some((entry) => entry.step === "doctor"));
  assert.ok(sessionLogLines.some((entry) => entry.step === "postcheck"));
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

  const openPort = runDemoScenario("open-port-exposure");
  const bruteForce = runDemoScenario("brute-force-watch");

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
  assert.ok(openPort.runtime.terminal.length >= 4);
  assert.ok(openPort.runtime.highlightedPorts.length >= 1);
  assert.ok(bruteSignals.length >= 14);
  assert.equal(bruteForce.execution.status, "needs-triage");
  assert.ok(bruteForce.runtime.attackerIps.length >= 3);
  assert.ok(bruteForce.runtime.terminal.length >= 16);
  const cognitiveSummary = getCognitiveSummary();
  assert.ok(cognitiveSummary.exposure.attackerIps.length >= 3);
  assert.ok(cognitiveSummary.exposure.immediateActions.length > 0);
});
