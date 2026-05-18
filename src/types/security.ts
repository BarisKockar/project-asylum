export type Severity = "critical" | "high" | "medium" | "low";

export type RemediationMode = "observe" | "assist" | "auto-remediate";
export type WorkflowStatus = "active" | "planned" | "blocked";
export type ComponentKind =
  | "frontend"
  | "api"
  | "orchestrator"
  | "worker"
  | "engine"
  | "storage"
  | "integration";
export type RunStatus = "idle" | "queued" | "running" | "completed" | "failed";
export type AssetCriticality = "critical" | "high" | "medium" | "low";
export type AssetKind = "host" | "service" | "container" | "application";
export type ScanKind = "discovery" | "detection" | "verification" | "remediation";
export type ScanStatus = "queued" | "running" | "completed" | "failed";
export type AuditLevel = "info" | "warning" | "error";

export interface Finding {
  id: string;
  title: string;
  asset: string;
  severity: Severity;
  confidence: number;
  summary: string;
  evidence: string[];
  recommendedAction: string;
  requiresApproval: boolean;
}

export interface RemediationPlaybook {
  id: string;
  title: string;
  blastRadius: "restricted" | "moderate" | "broad";
  rollbackReady: boolean;
  automationLevel: RemediationMode;
  steps: string[];
}

export interface SecurityWorkflowStage {
  name: string;
  description: string;
  status: WorkflowStatus;
}

export interface SystemSnapshot {
  productName: string;
  mission: string;
  protectionGoals: string[];
  workflow: SecurityWorkflowStage[];
  findings: Finding[];
  playbooks: RemediationPlaybook[];
}

export interface PlatformComponent {
  id: string;
  name: string;
  kind: ComponentKind;
  responsibility: string;
  localOnly: boolean;
  dependencies: string[];
}

export interface RuntimePolicy {
  localOnly: boolean;
  externalApisAllowed: boolean;
  approvalRequiredForHighRisk: boolean;
  allowedExecutionTargets: string[];
}

export interface PipelineRun {
  id: string;
  target: string;
  status: RunStatus;
  currentStage: string;
  startedAt: string;
  summary: string;
}

export interface ProjectBlueprint {
  runtimePolicy: RuntimePolicy;
  components: PlatformComponent[];
  currentRuns: PipelineRun[];
}

export interface AssetRecord {
  id: string;
  name: string;
  kind: AssetKind;
  target: string;
  environment: string;
  criticality: AssetCriticality;
  owner: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ScanRecord {
  id: string;
  assetId: string;
  kind: ScanKind;
  status: ScanStatus;
  startedAt: string;
  finishedAt: string | null;
  summary: string;
}

export interface PolicyRecord {
  id: string;
  name: string;
  description: string;
  mode: RemediationMode;
  enabled: boolean;
  scope: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  actor: string;
  action: string;
  targetType: string;
  targetId: string;
  level: AuditLevel;
  details: string;
  createdAt: string;
}

export interface CollectorTelemetry {
  hostname: string;
  platform: string;
  release: string;
  arch: string;
  uptimeSeconds: number;
  cpuCount: number;
  loadAverage: number[];
  primaryUser: string;
  networkInterfaceNames: string[];
}

export interface CollectorSummary {
  assets: AssetRecord[];
  scans: ScanRecord[];
  policies: PolicyRecord[];
  auditLogs: AuditLogRecord[];
  telemetry?: CollectorTelemetry | null;
}
