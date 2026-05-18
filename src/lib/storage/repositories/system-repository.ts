import {
  AssetRecord,
  AuditLogRecord,
  CollectorSummary,
  Finding,
  PipelineRun,
  PlatformComponent,
  PolicyRecord,
  ProjectBlueprint,
  RemediationPlaybook,
  RuntimePolicy,
  ScanRecord,
  SecurityWorkflowStage,
  SystemSnapshot
} from "@/types/security";
import { bootstrapStorage } from "@/lib/storage/bootstrap";

type FindingRow = {
  id: string;
  title: string;
  asset: string;
  severity: Finding["severity"];
  confidence: number;
  summary: string;
  recommended_action: string;
  requires_approval: number;
};

export function getRuntimePolicy(): RuntimePolicy {
  const db = bootstrapStorage();
  const row = db.prepare("SELECT * FROM runtime_policy WHERE id = 1").get() as {
    local_only: number;
    external_apis_allowed: number;
    approval_required_for_high_risk: number;
    allowed_execution_targets_json: string;
  };

  return {
    localOnly: Boolean(row.local_only),
    externalApisAllowed: Boolean(row.external_apis_allowed),
    approvalRequiredForHighRisk: Boolean(row.approval_required_for_high_risk),
    allowedExecutionTargets: JSON.parse(row.allowed_execution_targets_json) as string[]
  };
}

export function listWorkflowStages(): SecurityWorkflowStage[] {
  const db = bootstrapStorage();
  return db
    .prepare(
      "SELECT name, description, status FROM workflow_stages ORDER BY rowid ASC"
    )
    .all() as SecurityWorkflowStage[];
}

export function listFindings(): Finding[] {
  const db = bootstrapStorage();
  const findings = db.prepare("SELECT * FROM findings ORDER BY rowid ASC").all() as FindingRow[];
  const evidenceStatement = db.prepare(
    `
      SELECT evidence
      FROM finding_evidence
      WHERE finding_id = ?
      ORDER BY position ASC
    `
  );

  return findings.map((row) => ({
    id: row.id,
    title: row.title,
    asset: row.asset,
    severity: row.severity,
    confidence: row.confidence,
    summary: row.summary,
    evidence: evidenceStatement
      .all(row.id)
      .map((entry) => (entry as { evidence: string }).evidence),
    recommendedAction: row.recommended_action,
    requiresApproval: Boolean(row.requires_approval)
  }));
}

export function listPlaybooks(): RemediationPlaybook[] {
  const db = bootstrapStorage();
  const stepsStatement = db.prepare(
    `
      SELECT step
      FROM playbook_steps
      WHERE playbook_id = ?
      ORDER BY position ASC
    `
  );

  return db
    .prepare("SELECT * FROM playbooks ORDER BY rowid ASC")
    .all()
    .map((row) => {
      const playbook = row as {
        id: string;
        title: string;
        blast_radius: RemediationPlaybook["blastRadius"];
        rollback_ready: number;
        automation_level: RemediationPlaybook["automationLevel"];
      };

      return {
        id: playbook.id,
        title: playbook.title,
        blastRadius: playbook.blast_radius,
        rollbackReady: Boolean(playbook.rollback_ready),
        automationLevel: playbook.automation_level,
        steps: stepsStatement
          .all(playbook.id)
          .map((entry) => (entry as { step: string }).step)
      };
    });
}

export function listComponents(): PlatformComponent[] {
  const db = bootstrapStorage();
  const dependencyStatement = db.prepare(
    `
      SELECT dependency_id
      FROM component_dependencies
      WHERE component_id = ?
      ORDER BY position ASC
    `
  );

  return db
    .prepare("SELECT * FROM platform_components ORDER BY rowid ASC")
    .all()
    .map((row) => {
      const component = row as {
        id: string;
        name: string;
        kind: PlatformComponent["kind"];
        responsibility: string;
        local_only: number;
      };

      return {
        id: component.id,
        name: component.name,
        kind: component.kind,
        responsibility: component.responsibility,
        localOnly: Boolean(component.local_only),
        dependencies: dependencyStatement
          .all(component.id)
          .map((entry) => (entry as { dependency_id: string }).dependency_id)
      };
    });
}

export function listRuns(): PipelineRun[] {
  const db = bootstrapStorage();
  return db
    .prepare("SELECT * FROM pipeline_runs ORDER BY started_at DESC")
    .all()
    .map((row) => {
      const run = row as {
        id: string;
        target: string;
        status: PipelineRun["status"];
        current_stage: string;
        started_at: string;
        summary: string;
      };

      return {
        id: run.id,
        target: run.target,
        status: run.status,
        currentStage: run.current_stage,
        startedAt: run.started_at,
        summary: run.summary
      };
    });
}

export function insertRun(run: PipelineRun) {
  const db = bootstrapStorage();
  db.prepare(
    `
      INSERT OR REPLACE INTO pipeline_runs (
        id,
        target,
        status,
        current_stage,
        started_at,
        summary
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(run.id, run.target, run.status, run.currentStage, run.startedAt, run.summary);

  return run;
}

export function listAssets(): AssetRecord[] {
  const db = bootstrapStorage();
  return db
    .prepare("SELECT * FROM assets ORDER BY created_at DESC")
    .all()
    .map((row) => {
      const asset = row as {
        id: string;
        name: string;
        kind: AssetRecord["kind"];
        target: string;
        environment: string;
        criticality: AssetRecord["criticality"];
        owner: string;
        tags_json: string;
        created_at: string;
        updated_at: string;
      };

      return {
        id: asset.id,
        name: asset.name,
        kind: asset.kind,
        target: asset.target,
        environment: asset.environment,
        criticality: asset.criticality,
        owner: asset.owner,
        tags: JSON.parse(asset.tags_json) as string[],
        createdAt: asset.created_at,
        updatedAt: asset.updated_at
      };
    });
}

export function listScans(): ScanRecord[] {
  const db = bootstrapStorage();
  return db
    .prepare("SELECT * FROM scans ORDER BY started_at DESC")
    .all()
    .map((row) => {
      const scan = row as {
        id: string;
        asset_id: string;
        kind: ScanRecord["kind"];
        status: ScanRecord["status"];
        started_at: string;
        finished_at: string | null;
        summary: string;
      };

      return {
        id: scan.id,
        assetId: scan.asset_id,
        kind: scan.kind,
        status: scan.status,
        startedAt: scan.started_at,
        finishedAt: scan.finished_at,
        summary: scan.summary
      };
    });
}

export function isOperationalScan(scan: ScanRecord) {
  return !scan.summary.toLowerCase().includes("bootstrap discovery");
}

export function listOperationalScans(assetId?: string) {
  return listScans().filter((scan) => {
    if (!isOperationalScan(scan)) {
      return false;
    }

    return assetId ? scan.assetId === assetId : true;
  });
}

export function listPolicies(): PolicyRecord[] {
  const db = bootstrapStorage();
  return db
    .prepare("SELECT * FROM policies ORDER BY created_at ASC")
    .all()
    .map((row) => {
      const policy = row as {
        id: string;
        name: string;
        description: string;
        mode: PolicyRecord["mode"];
        enabled: number;
        scope: string;
        created_at: string;
      };

      return {
        id: policy.id,
        name: policy.name,
        description: policy.description,
        mode: policy.mode,
        enabled: Boolean(policy.enabled),
        scope: policy.scope,
        createdAt: policy.created_at
      };
    });
}

export function listAuditLogs(): AuditLogRecord[] {
  const db = bootstrapStorage();
  return db
    .prepare("SELECT * FROM audit_logs ORDER BY created_at DESC")
    .all()
    .map((row) => {
      const log = row as {
        id: string;
        actor: string;
        action: string;
        target_type: string;
        target_id: string;
        level: AuditLogRecord["level"];
        details: string;
        created_at: string;
      };

      return {
        id: log.id,
        actor: log.actor,
        action: log.action,
        targetType: log.target_type,
        targetId: log.target_id,
        level: log.level,
        details: log.details,
        createdAt: log.created_at
      };
    });
}

export function insertAsset(asset: AssetRecord) {
  const db = bootstrapStorage();
  db.prepare(
    `
      INSERT OR REPLACE INTO assets (
        id,
        name,
        kind,
        target,
        environment,
        criticality,
        owner,
        tags_json,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    asset.id,
    asset.name,
    asset.kind,
    asset.target,
    asset.environment,
    asset.criticality,
    asset.owner,
    JSON.stringify(asset.tags),
    asset.createdAt,
    asset.updatedAt
  );

  return asset;
}

export function insertScan(scan: ScanRecord) {
  const db = bootstrapStorage();
  db.prepare(
    `
      INSERT OR REPLACE INTO scans (
        id,
        asset_id,
        kind,
        status,
        started_at,
        finished_at,
        summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    scan.id,
    scan.assetId,
    scan.kind,
    scan.status,
    scan.startedAt,
    scan.finishedAt,
    scan.summary
  );

  return scan;
}

export function insertAuditLog(log: AuditLogRecord) {
  const db = bootstrapStorage();
  db.prepare(
    `
      INSERT OR REPLACE INTO audit_logs (
        id,
        actor,
        action,
        target_type,
        target_id,
        level,
        details,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    log.id,
    log.actor,
    log.action,
    log.targetType,
    log.targetId,
    log.level,
    log.details,
    log.createdAt
  );

  return log;
}

export function getCollectorSummary(): CollectorSummary {
  return {
    assets: listAssets(),
    scans: listScans(),
    policies: listPolicies(),
    auditLogs: listAuditLogs()
  };
}

export function getSystemSnapshot(): SystemSnapshot {
  return {
    productName: "Project Asylum",
    mission:
      "AI destekli siber guvenlik orkestrasyonu ile zafiyetleri tespit eden, dogrulayan, onceliklendiren ve kontrollu sekilde onaran guvenlik platformu.",
    protectionGoals: [
      "Sunucu ve servis varliklarini surekli gozlemlemek",
      "Yanlis pozitifleri azaltacak dogrulama katmani kurmak",
      "Kontrollu otomasyonla hizli ve geri alinabilir onarim yapmak",
      "Tum aksiyonlari audit uyumlu sekilde raporlamak"
    ],
    workflow: listWorkflowStages(),
    findings: listFindings(),
    playbooks: listPlaybooks()
  };
}

export function getProjectBlueprint(): ProjectBlueprint {
  return {
    runtimePolicy: getRuntimePolicy(),
    components: listComponents(),
    currentRuns: listRuns()
  };
}
