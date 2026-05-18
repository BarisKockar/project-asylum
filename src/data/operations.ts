import {
  AssetRecord,
  AuditLogRecord,
  PolicyRecord,
  ScanRecord
} from "@/types/security";

const now = "2026-04-17T05:05:00+03:00";

export const seedAssets: AssetRecord[] = [
  {
    id: "asset-localhost-core",
    name: "Local Core Host",
    kind: "host",
    target: "localhost",
    environment: "development",
    criticality: "high",
    owner: "project-asylum",
    tags: ["local", "bootstrap", "trusted"],
    createdAt: now,
    updatedAt: now
  }
];

export const seedScans: ScanRecord[] = [
  {
    id: "scan-discovery-localhost-001",
    assetId: "asset-localhost-core",
    kind: "discovery",
    status: "completed",
    startedAt: now,
    finishedAt: now,
    summary: "Bootstrap discovery kaydi olusturuldu. Gercek collector entegrasyonu sonraki adimda genisletilecek."
  }
];

export const seedPolicies: PolicyRecord[] = [
  {
    id: "policy-high-risk-approval",
    name: "High Risk Approval Gate",
    description: "Yuksek etki alani olan onarimlar insan onayi olmadan uygulanamaz.",
    mode: "assist",
    enabled: true,
    scope: "remediation",
    createdAt: now
  },
  {
    id: "policy-local-only-runtime",
    name: "Local Only Runtime",
    description: "Dis API cagrilari ve ucuncu taraf veri cikisi engellenir.",
    mode: "observe",
    enabled: true,
    scope: "runtime",
    createdAt: now
  }
];

export const seedAuditLogs: AuditLogRecord[] = [
  {
    id: "audit-bootstrap-001",
    actor: "system",
    action: "bootstrap_storage",
    targetType: "database",
    targetId: "project-asylum.db",
    level: "info",
    details: "SQLite storage katmani migration ve seed verilerle baslatildi.",
    createdAt: now
  }
];
