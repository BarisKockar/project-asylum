import os from "node:os";
import {
  AssetRecord,
  AuditLogRecord,
  CollectorTelemetry,
  CollectorSummary,
  ScanRecord
} from "@/types/security";
import {
  getCollectorSummary,
  insertAsset,
  insertAuditLog,
  insertScan,
  listAssets
} from "@/lib/storage/repositories/system-repository";

function sanitizeId(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

function safeSystemRead<T>(reader: () => T, fallback: T) {
  try {
    return reader();
  } catch {
    return fallback;
  }
}

function resolveOrCreateLocalAsset(target: string) {
  const existing = listAssets().find((asset) => asset.target === target);
  if (existing) {
    return existing;
  }

  const timestamp = new Date().toISOString();
  const hostname = os.hostname();
  const asset: AssetRecord = {
    id: `asset-${sanitizeId(target)}-${sanitizeId(hostname)}`,
    name: `${hostname} ${target === "localhost" ? "Local Host" : "Managed Host"}`,
    kind: "host",
    target,
    environment: target === "localhost" ? "development" : "managed",
    criticality: "high",
    owner: "project-asylum",
    tags: ["collected", "local-runtime", target],
    createdAt: timestamp,
    updatedAt: timestamp
  };

  return insertAsset(asset);
}

function buildCollectorTelemetry(): CollectorTelemetry {
  const networkInterfaceNames = Object.entries(
    safeSystemRead(() => os.networkInterfaces(), {})
  )
    .filter(([, addresses]) => (addresses ?? []).some((address) => !address.internal))
    .map(([name]) => name)
    .sort();

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    uptimeSeconds: Math.round(safeSystemRead(() => os.uptime(), 0)),
    cpuCount: safeSystemRead(() => os.cpus().length, 0),
    loadAverage: safeSystemRead(() => os.loadavg(), [0, 0, 0]).map((value) =>
      Number(value.toFixed(2))
    ),
    primaryUser: safeSystemRead(() => os.userInfo().username, "sandbox"),
    networkInterfaceNames
  };
}

export function collectLocalSystemSnapshot(target = "localhost"): CollectorSummary {
  const timestamp = new Date().toISOString();
  const asset = resolveOrCreateLocalAsset(target);
  const telemetry = buildCollectorTelemetry();

  const scan: ScanRecord = {
    id: `scan-discovery-${sanitizeId(target)}-${Date.now()}`,
    assetId: asset.id,
    kind: "discovery",
    status: "completed",
    startedAt: timestamp,
    finishedAt: timestamp,
    summary: `Yerel collector ${target} icin host, runtime ve network kimligini kaydetti.`
  };

  const auditLog: AuditLogRecord = {
    id: `audit-collector-${sanitizeId(target)}-${Date.now()}`,
    actor: "local-collector",
    action: "collect_local_system_snapshot",
    targetType: "asset",
    targetId: asset.id,
    level: "info",
    details: `Collector ${target} hedefi icin asset ve discovery scan kaydi olusturdu.`,
    createdAt: timestamp
  };

  insertScan(scan);
  insertAuditLog(auditLog);

  return {
    ...getCollectorSummary(),
    telemetry
  };
}
