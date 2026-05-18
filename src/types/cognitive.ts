export type ObservationKind =
  | "network"
  | "process"
  | "package"
  | "configuration"
  | "identity"
  | "filesystem"
  | "runtime"
  | "log";

export type ConfidenceBand = "high" | "medium" | "low";
export type BeliefStatus = "supported" | "tentative" | "contradicted" | "stale";
export type HypothesisStatus = "candidate" | "prioritized" | "discarded" | "validated";
export type PlanStatus = "draft" | "critic-review" | "approved" | "rejected" | "executed";
export type DecisionStatus = "proposed" | "accepted" | "blocked" | "deferred" | "awaiting-approval";
export type OutcomeStatus = "success" | "partial" | "failed" | "rolled-back";
export type GoalKind = "observe" | "verify" | "contain" | "remediate" | "report";
export type CriticVerdict = "approve" | "revise" | "block";

export interface CognitiveObservation {
  id: string;
  targetId: string;
  kind: ObservationKind;
  source: string;
  summary: string;
  evidence: string[];
  confidence: ConfidenceBand;
  observedAt: string;
}

export interface CognitiveBelief {
  id: string;
  targetId: string;
  statement: string;
  basisObservationIds: string[];
  confidence: number;
  status: BeliefStatus;
  updatedAt: string;
}

export interface CognitiveHypothesis {
  id: string;
  targetId: string;
  title: string;
  explanation: string;
  supportingBeliefIds: string[];
  riskScore: number;
  uncertaintyScore: number;
  status: HypothesisStatus;
  updatedAt: string;
}

export interface CognitiveGoal {
  id: string;
  targetId: string;
  kind: GoalKind;
  intent: string;
  priority: number;
  createdAt: string;
}

export interface CognitivePlanStep {
  id: string;
  title: string;
  actionType: string;
  requiresApproval: boolean;
  rollbackHint: string | null;
}

export interface CognitivePlan {
  id: string;
  targetId: string;
  goalId: string;
  hypothesisIds: string[];
  rationale: string;
  blastRadius: "restricted" | "moderate" | "broad";
  confidence: number;
  status: PlanStatus;
  steps: CognitivePlanStep[];
  createdAt: string;
}

export interface CognitiveDecision {
  id: string;
  targetId: string;
  selectedPlanId: string | null;
  status: DecisionStatus;
  justification: string;
  blockedBy: string[];
  createdAt: string;
}

export interface CognitiveOutcome {
  id: string;
  targetId: string;
  planId: string | null;
  status: OutcomeStatus;
  expectedResult: string;
  actualResult: string;
  lessons: string[];
  recordedAt: string;
}

export interface CognitiveEpisode {
  targetId: string;
  observations: CognitiveObservation[];
  beliefs: CognitiveBelief[];
  hypotheses: CognitiveHypothesis[];
  goals: CognitiveGoal[];
  plans: CognitivePlan[];
  decisions: CognitiveDecision[];
  outcomes: CognitiveOutcome[];
}

export interface CognitiveCritique {
  id?: string;
  targetId: string;
  planId: string | null;
  verdict: CriticVerdict;
  reasons: string[];
  riskFlags: string[];
  createdAt: string;
}

export interface CognitiveMemorySummary {
  targetId: string;
  totalOutcomes: number;
  partialOutcomes: number;
  failedOutcomes: number;
  lastOutcomeStatus: OutcomeStatus | null;
  effect: string;
  updatedAt?: string;
}
