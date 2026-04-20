"use client";

import { useState, useTransition } from "react";
import type {
  CognitiveSummary,
  PromptAnalysis,
  PromptExecution,
  SystemSummary
} from "../lib/platform-data";
import type { DemoScenario } from "../../lib/agent/demo-scenarios";

type DashboardClientProps = {
  initialSystem: SystemSummary;
  initialCognitive: CognitiveSummary;
  initialExecutions: PromptExecution[];
  initialDemoScenarios: DemoScenario[];
};

export function DashboardClient({
  initialSystem,
  initialCognitive,
  initialExecutions,
  initialDemoScenarios
}: DashboardClientProps) {
  const [system] = useState(initialSystem);
  const [cognitive] = useState(initialCognitive);
  const [prompt, setPrompt] = useState(
    "localhost üzerindeki admin yüzeyini analiz et ve riskleri açıkla"
  );
  const [result, setResult] = useState<PromptAnalysis | null>(null);
  const [executions, setExecutions] = useState(initialExecutions);
  const [demoScenarios] = useState(initialDemoScenarios);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const assistantMessage = result
    ? result.assistantResponse
    : "Buraya bir analiz isteği yazdığında sistem onu yorumlayıp sana ne yapacağını, hangi hedefleri gördüğünü ve neden o yoldan gideceğini açıklayacak.";
  const priorityIssues = cognitive.exposure.problemSignals.slice(0, 4);
  const exposedPorts = cognitive.exposure.openPorts.slice(0, 6);
  const highlightedPorts = cognitive.exposure.highlightedPorts.slice(0, 6);
  const bruteForceSignals = cognitive.exposure.bruteForceSignals.slice(0, 3);

  const handleAnalyze = () => {
    startTransition(async () => {
      setError(null);
      setActiveScenarioId(null);

      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setResult(null);
        setError(payload.error ?? "Analiz basarisiz oldu.");
        return;
      }

      const payload = (await response.json()) as {
        analysis: PromptAnalysis;
        execution: PromptExecution;
      };
      setResult(payload.analysis);
      setExecutions((current) => [payload.execution, ...current].slice(0, 12));
    });
  };

  const handleRunScenario = (scenarioId: string) => {
    startTransition(async () => {
      setError(null);
      setActiveScenarioId(scenarioId);

      const response = await fetch("/api/demo-scenarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ scenarioId })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Demo senaryosu calistirilamadi.");
        setActiveScenarioId(null);
        return;
      }

      const payload = (await response.json()) as {
        scenario: DemoScenario;
        execution: PromptExecution;
        report: { execution: PromptExecution };
      };

      setPrompt(payload.scenario.prompt);
      setExecutions((current) => [payload.execution, ...current].slice(0, 12));
      setResult((current) =>
        current
          ? {
              ...current,
              assistantResponse: `${payload.scenario.title} senaryosu calistirildi. Sistem bu senaryo icin ${payload.execution.status} durumunda bir execution olusturdu.`
            }
          : null
      );
      setActiveScenarioId(null);
    });
  };

  return (
    <>
      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">Project Asylum</p>
          <h1>Yerel çalışan yapay zeka tabanlı siber güvenlik çekirdeği</h1>
          <p className="lead">
            Bu arayüz, sistemin şu an ne düşündüğünü, neden beklediğini ve senin
            yazdığın analiz komutunu nasıl aksiyon planına çevirdiğini açıkça
            gösterir.
          </p>
        </div>

        <aside className="heroStatus">
          <span className="statusBadge">
            {system.status === "healthy" ? "Server healthy" : system.status}
          </span>
          <dl className="metricList">
            <div>
              <dt>Şu anki durum</dt>
              <dd>İnsan onayı bekleniyor</dd>
            </div>
            <div>
              <dt>Teknik karar</dt>
              <dd>Plan onaylandı</dd>
            </div>
            <div>
              <dt>Çalışma modu</dt>
              <dd>{system.mode}</dd>
            </div>
            <div>
              <dt>Host</dt>
              <dd>{system.host}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="section">
        <article className="panel promptPanel">
          <div className="sectionHeading compact">
            <p className="sectionEyebrow">Prompt</p>
            <h2>Yapay zekaya ne analiz ettirmek istiyorsun?</h2>
          </div>

          <p className="bodyText">
            Buraya örneğin “localhost üzerindeki admin panelini tara”, “açık
            portları kontrol et”, “yanlış config arayıp riskleri sırala” gibi
            komutlar yazabilirsin.
          </p>

          <textarea
            className="promptInput"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Örn: localhost üzerindeki admin panelini analiz et ve hangi sinyallere baktığını göster"
          />

          <div className="promptActions">
            <button
              type="button"
              className="primaryButton"
              onClick={handleAnalyze}
              disabled={isPending}
            >
              {isPending ? "Analiz ediliyor..." : "Analizi çalıştır"}
            </button>
            <span className="helperText">
              İstek önce hedefe çevrilir, sonra önerilen aksiyon zinciri üretilir.
            </span>
          </div>

          {error ? <p className="errorText">{error}</p> : null}

          {result ? (
            <div className="analysisGrid">
              <article className="analysisCard">
                <h3>Yorumlanan hedef</h3>
                <p>{result.normalizedGoal}</p>
              </article>
              <article className="analysisCard">
                <h3>Önerilen mod</h3>
                <p>{result.suggestedMode}</p>
              </article>
              <article className="analysisCard">
                <h3>Risk seviyesi</h3>
                <p>{result.riskLevel}</p>
              </article>
              <article className="analysisCard">
                <h3>Niyet</h3>
                <p>{result.intent}</p>
              </article>
              <article className="analysisCard">
                <h3>Aciliyet</h3>
                <p>{result.urgency}</p>
              </article>
              <article className="analysisCard">
                <h3>Cevap tarzı</h3>
                <p>{result.responseStyle}</p>
              </article>
              <article className="analysisCard wide">
                <h3>Tespit edilen hedefler</h3>
                <div className="chipRow compactRow">
                  {result.detectedTargets.length ? (
                    result.detectedTargets.map((target) => (
                      <span key={target} className="chip">
                        {target}
                      </span>
                    ))
                  ) : (
                    <span className="chip">genel-analiz</span>
                  )}
                </div>
              </article>
              <article className="analysisCard wide">
                <h3>Üreteceği aksiyonlar</h3>
                <ul className="simpleList">
                  {result.actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </article>
              <article className="analysisCard wide">
                <h3>Açıklama</h3>
                <p>{result.explanation}</p>
              </article>
              <article className="analysisCard wide">
                <h3>Beklenen çıktı</h3>
                <p>{result.expectedOutput}</p>
              </article>
              <article className="analysisCard wide">
                <h3>Kısıtlar</h3>
                <div className="chipRow compactRow">
                  {result.constraints.length ? (
                    result.constraints.map((constraint) => (
                      <span key={constraint} className="chip">
                        {constraint}
                      </span>
                    ))
                  ) : (
                    <span className="chip">explicit-constraint-yok</span>
                  )}
                </div>
              </article>
              <article className="analysisCard wide">
                <h3>Plan özeti</h3>
                <p>{result.planSummary}</p>
              </article>
            </div>
          ) : null}

          <div className="assistantReply">
            <div className="assistantReplyHeader">
              <span className="assistantDot" />
              <strong>Project Asylum yanıtı</strong>
            </div>
            <p>{error ? "İstek işlenemedi. Prompt'u düzeltip tekrar dene." : assistantMessage}</p>
          </div>
        </article>
      </section>

      <section className="section">
        <div className="sectionHeading">
          <p className="sectionEyebrow">Demo Senaryolari</p>
          <h2>Kritik anlari tek tikla goster</h2>
        </div>
        <div className="scenarioGrid">
          {demoScenarios.map((scenario) => (
            <article key={scenario.id} className="scenarioCard">
              <div className="scenarioHeader">
                <div>
                  <p className="scenarioLabel">{scenario.customerLabel}</p>
                  <h3>{scenario.title}</h3>
                </div>
                <button
                  type="button"
                  className="secondaryButton"
                  onClick={() => handleRunScenario(scenario.id)}
                  disabled={isPending}
                >
                  {activeScenarioId === scenario.id ? "Calisiyor..." : "Senaryoyu calistir"}
                </button>
              </div>
              <p className="scenarioSummary">{scenario.summary}</p>
              <div className="chipRow compactRow">
                {scenario.expectedSignals.map((signal) => (
                  <span key={signal} className="chip">
                    {signal}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="sectionHeading">
          <p className="sectionEyebrow">İlk Bakış</p>
          <h2>Müşteriye gösterilecek güvenlik panelleri</h2>
        </div>
        <div className="securityGrid">
          <article className="securityPanel emphasisPanel">
            <div className="securityPanelHeader">
              <p className="securityLabel">Açık Portlar</p>
              <strong>{system.exposure.openPortCount}</strong>
            </div>
            <p className="securityBody">
              Sistem şu an dinleyen servisleri görüyor. Özellikle inceleme isteyen
              portlar müşteriye net biçimde ayrılıyor.
            </p>
            <div className="chipRow compactRow">
              {highlightedPorts.length ? (
                highlightedPorts.map((port) => (
                  <span key={port} className="chip warningChip">
                    port {port}
                  </span>
                ))
              ) : exposedPorts.length ? (
                exposedPorts.map((port) => (
                  <span key={port} className="chip">
                    port {port}
                  </span>
                ))
              ) : (
                <span className="chip">port sinyali yok</span>
              )}
            </div>
          </article>

          <article className="securityPanel">
            <div className="securityPanelHeader">
              <p className="securityLabel">Brute Force / Giriş Denemeleri</p>
              <strong>{system.exposure.bruteForceSignalCount}</strong>
            </div>
            <p className="securityBody">
              Log preview katmanı başarısız giriş, invalid user ve authentication
              failure benzeri sinyalleri sayıyor.
            </p>
            <ul className="signalList">
              {bruteForceSignals.length ? (
                bruteForceSignals.map((signal) => <li key={signal}>{signal}</li>)
              ) : (
                <li>Şu an belirgin brute force sinyali görünmüyor.</li>
              )}
            </ul>
          </article>

          <article className="securityPanel">
            <div className="securityPanelHeader">
              <p className="securityLabel">Dikkat Gerektiren Durumlar</p>
              <strong>{system.exposure.attentionCount}</strong>
            </div>
            <p className="securityBody">
              Policy blocker, yüksek risk ve dikkat isteyen log/port sinyalleri tek
              yerde toplanıyor.
            </p>
            <ul className="signalList">
              {priorityIssues.length ? (
                priorityIssues.map((signal) => <li key={signal}>{signal}</li>)
              ) : (
                <li>Şu an kritik dikkat sinyali görünmüyor.</li>
              )}
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="sectionHeading">
          <p className="sectionEyebrow">Execution</p>
          <h2>Çalıştırılan prompt geçmişi</h2>
        </div>
        <div className="executionList">
          {executions.map((execution) => (
            <article key={execution.id} className="executionCard">
              <div className="executionHeader">
                <strong>{execution.mode}</strong>
                <span>{execution.status}</span>
              </div>
              <p className="executionPrompt">{execution.prompt}</p>
              <p className="executionSummary">{execution.summary}</p>
              <div className="executionMeta">
                <span>{new Date(execution.createdAt).toLocaleString("tr-TR")}</span>
                <span>risk: {execution.riskLevel}</span>
              </div>
              <div className="chipRow compactRow">
                {execution.targets.map((target) => (
                  <span key={target} className="chip">
                    {target}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="sectionHeading">
          <p className="sectionEyebrow">Canlı Durum</p>
          <h2>Sistemin şu anki özeti</h2>
        </div>
        <div className="cardGrid">
          <article className="card">
            <h3>Collector kapsamı</h3>
            <p>
              Son collector çalışması:{" "}
              {new Date(system.lastCollectorRun).toLocaleString("tr-TR")}
            </p>
          </article>
          <article className="card">
            <h3>Critique</h3>
            <p>{cognitive.critique}</p>
          </article>
          <article className="card">
            <h3>Decision</h3>
            <p>{cognitive.decision}</p>
          </article>
          <article className="card">
            <h3>Confidence</h3>
            <p>%{Math.round(cognitive.confidence * 100)}</p>
          </article>
          <article className="card">
            <h3>Log kaynakları</h3>
            <p>{system.telemetry.sampledLogSourceCount} kaynak örneklendi</p>
          </article>
          <article className="card">
            <h3>Log sinyalleri</h3>
            <p>{system.telemetry.securitySignalCount} güvenlik sinyali görüldü</p>
          </article>
          <article className="card">
            <h3>Öne çıkan kaynak</h3>
            <p>{system.telemetry.topLogSourceLabel ?? "Henüz etiketli log kaynağı yok"}</p>
          </article>
          <article className="card">
            <h3>Otomasyon seviyesi</h3>
            <p>{cognitive.automationEligibility}</p>
          </article>
        </div>
      </section>

      <section className="section layoutSplit">
        <article className="panel">
          <div className="sectionHeading compact">
            <p className="sectionEyebrow">Karar İzi</p>
            <h2>Akıl yürütme zinciri</h2>
          </div>
          <div className="timeline">
            {cognitive.reasoning.map((item) => (
              <div key={item.label} className="timelineRow">
                <div className="timelineMarker" />
                <div>
                  <div className="timelineHeader">
                    <strong>{item.label}</strong>
                    <span>{item.value}</span>
                  </div>
                  <p>{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="sectionHeading compact">
            <p className="sectionEyebrow">Kanıt</p>
            <h2>Karara giren sinyaller</h2>
          </div>
          <p className="bodyText">
            Bu özet artık API’den geliyor; ekran doğrudan cognitive summary
            verisine bağlı.
          </p>
          <div className="chipRow">
            {cognitive.signals.map((signal) => (
              <span key={signal} className="chip">
                {signal}
              </span>
            ))}
          </div>
          <div className="callout">
            <strong>Aktif blokaj</strong>
            <p>
              Teknik onay mevcut, fakat politika katmanı şu an{" "}
              <code>{cognitive.blocker}</code> nedeniyle otomatik uygulamayı
              bekletiyor.
            </p>
          </div>
        </article>
      </section>
    </>
  );
}
