export type PromptAnalysis = {
  input: string;
  normalizedGoal: string;
  detectedTargets: string[];
  suggestedMode: string;
  actions: string[];
  riskLevel: string;
  explanation: string;
  intent: string;
  expectedOutput: string;
  assistantResponse: string;
  urgency: string;
  responseStyle: string;
  constraints: string[];
  planSummary: string;
};

export type PromptExecution = {
  id: string;
  prompt: string;
  mode: string;
  status: string;
  riskLevel: string;
  policyProfile?: string;
  createdAt: string;
  summary: string;
  targets: string[];
};

export type PromptExecutionReport = {
  execution: PromptExecution;
  policyProfile?: string;
  integrity?: {
    coverageScore: number;
    taskCompletionScore: number;
    evidenceScore: number;
    coherenceScore: number;
    status: "strong" | "partial" | "thin";
    pilotReady: boolean;
    summary: string;
    observedKinds: string[];
    requiredKinds: string[];
    missingKinds: string[];
    contradictionGroups: Array<{
      category:
        | "evidence-gap"
        | "risk-decision-mismatch"
        | "task-flow-mismatch";
      items: string[];
    }>;
    contradictions: string[];
    contradictionCount: number;
    completedTasks: number;
    totalTasks: number;
  };
  trust?: {
    confidenceScore: number;
    confidenceFactors: string[];
    environmentTrustScore: number;
    actionTrustScore: number;
    automationEligibility:
      | "observe-only"
      | "approval-required"
      | "low-risk-auto";
    approvalRequirementReason: string;
  };
  policyInsight?: {
    profile: string;
    posture: string;
    explanation: string;
    context: {
      collectorAttempts: number;
      reasoningAttempts: number;
      reviewPorts: number[];
      riskySignals: string[];
      hasCriticalRisk: boolean;
      hasHighProcessRisk: boolean;
    };
    riskContext: Record<
      string,
      {
        severity: string;
        score: number | null;
        riskIds: string[];
      }
    >;
    thresholds: Record<
      string,
      {
        enabled: boolean;
        minCollectorAttempts: number | null;
        minReasoningAttempts: number | null;
        maxRiskySignals: number | null;
        requiresNoCriticalRisk: boolean;
        requiresNoReviewPorts: boolean;
        requiresNoHighProcessRisk: boolean;
      }
    >;
    evaluations: Record<
      string,
      {
        matched: boolean;
        collectorAttemptsSatisfied: boolean;
        reasoningAttemptsSatisfied: boolean;
        riskySignalsSatisfied: boolean;
        criticalRiskSatisfied: boolean;
        reviewPortsSatisfied: boolean;
        highProcessRiskSatisfied: boolean;
      }
    >;
    matchedRules: string[];
    pendingRules: string[];
  };
  observations: Array<{
    kind: string;
    detail: string;
    confidence: number;
    metadata?: Record<string, unknown>;
  }>;
  risks: Array<{
    id: string;
    severity: string;
    title: string;
    rationale: string;
    sourceKinds: string[];
    score?: number;
    evidence?: string[];
  }>;
  reasoning: {
    belief: {
      summary: string;
      status: string;
      confidence: number;
      supportingKinds: string[];
    };
    hypotheses: Array<{
      id: string;
      title: string;
      status: string;
      confidence: number;
      rationale: string;
      evidence: string[];
    }>;
    priorityHypothesisId: string | null;
    nextInference: string;
  };
  plan: {
    objective: string;
    steps: Array<{
      id: string;
      title: string;
      status: string;
      rationale: string;
      taskType: string;
      commandHint: string;
      outputs: string[];
    }>;
    guarded: boolean;
  };
  taskRuns: Array<{
    stepId: string;
    taskType: string;
    commandHint: string;
    status: string;
    attempt: number;
    summary: string;
    produced: string[];
    executedAt: string;
  }>;
  critic: {
    verdict: string;
    summary: string;
    riskFlags: string[];
    policyMatches?: Array<{
      flag: string;
      action: string;
      matched: boolean;
      note: string;
    }>;
    recommendedAction: string;
  };
  decision: {
    status: string;
    rationale: string;
    blockers: string[];
    primaryBlockerReason?: PolicyDecisionDetail | null;
    nextStep: string;
  };
  dryRun?: DryRunReport;
  generatedAt: string;
};

export type DryRunActionClass =
  | "network-isolation"
  | "config-hardening"
  | "service-restart"
  | "access-rotation"
  | "logging-enable"
  | "no-op";

export type DryRunActionStatus =
  | "blocked"
  | "awaiting-approval"
  | "auto-eligible";

export type DryRunBlastRadius = "narrow" | "moderate" | "wide";

export type DryRunAction = {
  id: string;
  riskId: string;
  class: DryRunActionClass;
  target: string;
  intent: string;
  reversible: boolean;
  blastRadius: DryRunBlastRadius;
  evidenceRequired: string[];
  status: DryRunActionStatus;
  blockedReason: string | null;
};

export type DryRunReport = {
  actions: DryRunAction[];
  summary: string;
  attemptedAt: string;
  executableCount: number;
  awaitingApprovalCount: number;
  blockedCount: number;
  blockedByPolicy: boolean;
  blockedByIntegrity: boolean;
  blockedByTrust: boolean;
};

export type PersistentTrustRecord = {
  key: string;
  scope: "environment" | "action";
  successCount: number;
  triageCount: number;
  lastStatus: string | null;
  lastConfidenceScore: number | null;
  updatedAt: string;
};

export type PolicyDecisionDetail = {
  flag: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  status: "matched" | "pending" | "informational";
  priority: number;
  line: string;
};

export type PolicyDecisionExplanation = {
  summary: string;
  details: string[];
  structuredDetails: PolicyDecisionDetail[];
  primaryBlockerReason: PolicyDecisionDetail | null;
};

export type PlatformLogSource = {
  id: string;
  category: string;
  label: string;
  path: string;
  exists: boolean;
  readable?: boolean;
  sourceType?: "file" | "directory" | "command";
  command?: string;
  detectionMethod?: string;
  priorityScore?: number;
  preferred?: boolean;
  recommended: boolean;
};

export type PlatformProfile = {
  osFamily: "linux" | "macos" | "windows" | "unknown";
  platform: string;
  architecture: string;
  hostname: string;
  homeDir: string;
  logSources: PlatformLogSource[];
};
