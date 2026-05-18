import { ProjectBlueprint } from "@/types/security";

export const projectBlueprint: ProjectBlueprint = {
  runtimePolicy: {
    localOnly: true,
    externalApisAllowed: false,
    approvalRequiredForHighRisk: true,
    allowedExecutionTargets: [
      "local-agent-runtime",
      "sandboxed-worker",
      "approved-server-connector"
    ]
  },
  components: [
    {
      id: "frontend-console",
      name: "Security Console",
      kind: "frontend",
      responsibility:
        "Analist paneli, karar akisi, raporlar ve playbook gorunumu saglar.",
      localOnly: true,
      dependencies: ["api-gateway"]
    },
    {
      id: "api-gateway",
      name: "Local Control API",
      kind: "api",
      responsibility:
        "UI ile orkestrasyon servisleri arasinda tek giris noktasi olur.",
      localOnly: true,
      dependencies: ["mission-orchestrator", "report-store"]
    },
    {
      id: "mission-orchestrator",
      name: "Mission Orchestrator",
      kind: "orchestrator",
      responsibility:
        "Tarama, dogrulama, karar ve onarim asamalarini sira ve politika ile yonetir.",
      localOnly: true,
      dependencies: [
        "discovery-engine",
        "verification-engine",
        "decision-engine",
        "remediation-engine"
      ]
    },
    {
      id: "discovery-engine",
      name: "Discovery Engine",
      kind: "engine",
      responsibility:
        "Hedef sistemde servis, port, dependency, config ve runtime izlerini toplar.",
      localOnly: true,
      dependencies: ["local-collectors"]
    },
    {
      id: "verification-engine",
      name: "Verification Engine",
      kind: "engine",
      responsibility:
        "Bulgulari guvenli ve sinirli testlerle dogrulama katmani sunar.",
      localOnly: true,
      dependencies: ["sandbox-worker"]
    },
    {
      id: "decision-engine",
      name: "Decision Engine",
      kind: "engine",
      responsibility:
        "Risk, etki alani, rollback ve onay ihtiyacina gore aksiyon karari verir.",
      localOnly: true,
      dependencies: ["policy-registry", "report-store"]
    },
    {
      id: "remediation-engine",
      name: "Remediation Engine",
      kind: "engine",
      responsibility:
        "Playbook tabanli duzeltmeleri geri alinabilir sekilde uygular.",
      localOnly: true,
      dependencies: ["sandbox-worker", "policy-registry"]
    },
    {
      id: "report-store",
      name: "Report Store",
      kind: "storage",
      responsibility:
        "Bulgu, run, karar ve audit kayitlarini ileride SQLite/Postgres ile tutar.",
      localOnly: true,
      dependencies: []
    }
  ],
  currentRuns: [
    {
      id: "run-bootstrap-001",
      target: "localhost",
      status: "running",
      currentStage: "discovery",
      startedAt: "2026-04-17T04:45:00+03:00",
      summary:
        "Temel platform iskeleti kuruluyor; henuz gercek tarama baglayicilari eklenmedi."
    }
  ]
};
