import { getDashboardSnapshot } from "@/lib/domain/system-snapshot";
import {
  describeDecisionStatus,
  getCognitiveTraceSummary,
  mapDecisionStatusTone
} from "@/lib/cognitive/episode";
import { getMissionControlState } from "@/lib/orchestrator/mission-control";

const severityOrder = {
  critical: "Kritik",
  high: "Yuksek",
  medium: "Orta",
  low: "Dusuk"
};

export default function HomePage() {
  const { snapshot, blueprint, metrics } = getDashboardSnapshot();
  const missionControl = getMissionControlState();
  const cognitiveTrace = getCognitiveTraceSummary();

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Project Asylum</span>
          <h1>AI ile acik bul, karar ver, kontrollu onar.</h1>
          <p>{snapshot.mission}</p>
        </div>
        <div className="hero-card">
          <p className="card-label">Runtime policy</p>
          <strong>{blueprint.runtimePolicy.localOnly ? "Local Only" : "Hybrid"}</strong>
          <p>
            Dis API yok. Kritik degisiklikler icin insan onayi ve geri alinabilir
            playbook akisi esas alinacak.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <span>Bulgu sayisi</span>
          <strong>{metrics.findingCount}</strong>
        </article>
        <article className="stat-card">
          <span>Playbook</span>
          <strong>{metrics.playbookCount}</strong>
        </article>
        <article className="stat-card">
          <span>Aktif asama</span>
          <strong>{metrics.activeStages}</strong>
        </article>
        <article className="stat-card">
          <span>Siradaki adim</span>
          <strong>{missionControl.nextStage}</strong>
        </article>
        <article className="stat-card">
          <span>Cognitive karar</span>
          <strong>{cognitiveTrace.decisionCount}</strong>
        </article>
      </section>

      <section className="panel-grid">
        <article className="panel">
          <h2>Koruma hedefleri</h2>
          <ul className="list">
            {snapshot.protectionGoals.map((goal) => (
              <li key={goal}>{goal}</li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2>Is akisi</h2>
          <div className="workflow">
            {snapshot.workflow.map((stage) => (
              <div key={stage.name} className="workflow-item">
                <div className="workflow-topline">
                  <strong>{stage.name}</strong>
                  <span data-status={stage.status}>
                    {stage.status === "active"
                      ? "Aktif"
                      : stage.status === "blocked"
                        ? "Bloklu"
                        : "Planlandi"}
                  </span>
                </div>
                <p>{stage.description}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel-grid">
        <article className="panel">
          <div className="section-heading">
            <h2>Reasoning Trace</h2>
            <p>Deterministic motorun son dusunme izi.</p>
          </div>
          <div className="workflow">
            <div className="workflow-item">
              <div className="workflow-topline">
                <strong>Son karar</strong>
                <span data-status={mapDecisionStatusTone(cognitiveTrace.latestDecision?.status)}>
                  {describeDecisionStatus(cognitiveTrace.latestDecision?.status)}
                </span>
              </div>
              <p>{cognitiveTrace.latestDecision?.justification ?? "Henüz karar kaydi yok."}</p>
            </div>
            <div className="workflow-item">
              <div className="workflow-topline">
                <strong>Son plan</strong>
                <span className="mode">{cognitiveTrace.latestPlan?.status ?? "none"}</span>
              </div>
              <p>{cognitiveTrace.latestPlan?.rationale ?? "Henüz plan kaydi yok."}</p>
            </div>
            <div className="workflow-item">
              <div className="workflow-topline">
                <strong>Critic verdict</strong>
                <span
                  data-status={
                    cognitiveTrace.critique.verdict === "approve"
                      ? "active"
                      : cognitiveTrace.critique.verdict === "block"
                        ? "blocked"
                        : "planned"
                  }
                >
                  {cognitiveTrace.critique.verdict}
                </span>
              </div>
              <p>{cognitiveTrace.critique.reasons.join(" ")}</p>
            </div>
            <div className="workflow-item">
              <div className="workflow-topline">
                <strong>Son outcome</strong>
                <span
                  data-status={
                    (cognitiveTrace.latestOutcome?.status ?? "partial") === "success"
                      ? "active"
                      : (cognitiveTrace.latestOutcome?.status ?? "partial") === "failed"
                        ? "blocked"
                        : "planned"
                  }
                >
                  {cognitiveTrace.latestOutcome?.status ?? "yok"}
                </span>
              </div>
              <p>{cognitiveTrace.latestOutcome?.actualResult ?? "Henüz outcome kaydi yok."}</p>
            </div>
            <div className="workflow-item">
              <div className="workflow-topline">
                <strong>Memory summary</strong>
                <span className="mode">
                  {cognitiveTrace.memorySummary.totalOutcomes} outcome
                </span>
              </div>
              <p>{cognitiveTrace.memorySummary.effect}</p>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="section-heading">
            <h2>Sistem bilesenleri</h2>
            <p>Yerel ve self-hosted mimariyi olusturan ilk moduller.</p>
          </div>
          <div className="workflow">
            {blueprint.components.map((component) => (
              <div key={component.id} className="workflow-item">
                <div className="workflow-topline">
                  <strong>{component.name}</strong>
                  <span className="mode">{component.kind}</span>
                </div>
                <p>{component.responsibility}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="section-heading">
            <h2>Mission control</h2>
            <p>Ilk yerel orkestrasyon durumu.</p>
          </div>
          <div className="workflow">
            <div className="workflow-item">
              <div className="workflow-topline">
                <strong>Aktif run</strong>
                <span data-status="active">{missionControl.activeRun.status}</span>
              </div>
              <p>Hedef: {missionControl.activeRun.target}</p>
              <p>Asama: {missionControl.activeRun.currentStage}</p>
            </div>
            <div className="workflow-item">
              <div className="workflow-topline">
                <strong>Oncelikli bulgu</strong>
                <span className={`badge severity-${missionControl.priorityFinding.severity}`}>
                  {severityOrder[missionControl.priorityFinding.severity]}
                </span>
              </div>
              <p>{missionControl.priorityFinding.title}</p>
              <p>{missionControl.priorityFinding.recommendedAction}</p>
            </div>
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Ornek bulgular</h2>
          <p>Gercek tarama motoru eklenene kadar domain modelini test eden seed veri.</p>
        </div>
        <div className="finding-grid">
          {snapshot.findings.map((finding) => (
            <article key={finding.id} className="finding-card">
              <div className="finding-header">
                <span className={`badge severity-${finding.severity}`}>
                  {severityOrder[finding.severity]}
                </span>
                <span className="asset">{finding.asset}</span>
              </div>
              <h3>{finding.title}</h3>
              <p>{finding.summary}</p>
              <ul className="list compact">
                {finding.evidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="recommendation">{finding.recommendedAction}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Playbook kutuphanesi</h2>
          <p>Otomasyon seviyesini ve geri donus kabiliyetini acikca tanimliyoruz.</p>
        </div>
        <div className="playbook-grid">
          {snapshot.playbooks.map((playbook) => (
            <article key={playbook.id} className="playbook-card">
              <div className="workflow-topline">
                <h3>{playbook.title}</h3>
                <span className="mode">{playbook.automationLevel}</span>
              </div>
              <p>
                Etki alani: <strong>{playbook.blastRadius}</strong> | Rollback:{" "}
                <strong>{playbook.rollbackReady ? "Hazir" : "Yok"}</strong>
              </p>
              <ol className="steps">
                {playbook.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
