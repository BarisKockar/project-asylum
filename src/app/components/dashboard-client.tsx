"use client";

import { useEffect, useState, useTransition } from "react";
import type {
  CognitiveSummary,
  PromptAnalysis,
  PromptExecution,
  SystemSummary
} from "../lib/platform-data";
import type { DemoRuntime, DemoScenario } from "../../lib/agent/demo-scenarios";

type DashboardClientProps = {
  initialSystem: SystemSummary;
  initialCognitive: CognitiveSummary;
  initialExecutions: PromptExecution[];
  initialDemoScenarios: DemoScenario[];
};

type InstallStepId = "setup" | "bootstrap" | "doctor" | "postcheck";

type InstallStepResult = {
  step: InstallStepId;
  ok: boolean;
  payload?: Record<string, unknown>;
  error?: string;
};

const INSTALL_STEPS: Array<{
  id: InstallStepId;
  title: string;
  description: string;
}> = [
  {
    id: "setup",
    title: "1. Setup",
    description: ".env, data klasoru ve kurulum manifestini hazirlar."
  },
  {
    id: "bootstrap",
    title: "2. Bootstrap",
    description: "OS, log kaynaklari ve execution store yolunu kesfeder."
  },
  {
    id: "doctor",
    title: "3. Doctor",
    description: "Observe-only guvenlik ve log erisimi kontrollerini dogrular."
  },
  {
    id: "postcheck",
    title: "4. Postcheck",
    description: "Kurulum sonrasi dosya ve guvenli varsayimlari tekrar kontrol eder."
  }
];

export function DashboardClient({
  initialSystem,
  initialCognitive,
  initialExecutions,
  initialDemoScenarios
}: DashboardClientProps) {
  const [system, setSystem] = useState(initialSystem);
  const [cognitive, setCognitive] = useState(initialCognitive);
  const [prompt, setPrompt] = useState(
    "localhost üzerindeki admin yüzeyini analiz et ve riskleri açıkla"
  );
  const [result, setResult] = useState<PromptAnalysis | null>(null);
  const [executions, setExecutions] = useState(initialExecutions);
  const [demoScenarios] = useState(initialDemoScenarios);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [activeDemoRuntime, setActiveDemoRuntime] = useState<DemoRuntime | null>(null);
  const [visibleTerminalLines, setVisibleTerminalLines] = useState(0);
  const [activeInstallStep, setActiveInstallStep] = useState<InstallStepId | null>(null);
  const [installResults, setInstallResults] = useState<InstallStepResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const assistantMessage = result
    ? result.assistantResponse
    : "Buraya bir analiz isteği yazdığında sistem onu yorumlayıp sana ne yapacağını, hangi hedefleri gördüğünü ve neden o yoldan gideceğini açıklayacak.";
  const priorityIssues = cognitive.exposure.problemSignals.slice(0, 4);
  const exposedPorts = cognitive.exposure.openPorts.slice(0, 6);
  const highlightedPorts = cognitive.exposure.highlightedPorts.slice(0, 6);
  const bruteForceSignals = cognitive.exposure.bruteForceSignals.slice(0, 3);
  const attackerIps = cognitive.exposure.attackerIps.slice(0, 4);
  const immediateActions = cognitive.exposure.immediateActions.slice(0, 4);
  const portRecommendations = cognitive.exposure.portRecommendations.slice(0, 4);
  const installChecklist = [
    {
      label: "Setup",
      complete: system.installation.setupComplete
    },
    {
      label: "Bootstrap",
      complete: system.installation.bootstrapComplete
    },
    {
      label: "Doctor",
      complete: system.installation.doctorComplete
    },
    {
      label: "Postcheck",
      complete: system.installation.postcheckComplete
    }
  ];
  const nextRequiredStep: InstallStepId | null = !system.installation.setupComplete
    ? "setup"
    : !system.installation.bootstrapComplete
      ? "bootstrap"
      : !system.installation.doctorComplete
        ? "doctor"
        : !system.installation.postcheckComplete
          ? "postcheck"
          : null;

  const isInstallStepUnlocked = (step: InstallStepId) => {
    if (step === "setup") {
      return true;
    }

    if (step === "bootstrap") {
      return system.installation.setupComplete;
    }

    if (step === "doctor") {
      return system.installation.setupComplete && system.installation.bootstrapComplete;
    }

    return (
      system.installation.setupComplete &&
      system.installation.bootstrapComplete &&
      system.installation.doctorComplete
    );
  };

  useEffect(() => {
    if (!activeDemoRuntime) {
      setVisibleTerminalLines(0);
      return;
    }

    setVisibleTerminalLines(1);
    const interval = window.setInterval(() => {
      setVisibleTerminalLines((current) => {
        if (current >= activeDemoRuntime.terminal.length) {
          window.clearInterval(interval);
          return current;
        }

        return current + 1;
      });
    }, 180);

    return () => window.clearInterval(interval);
  }, [activeDemoRuntime]);

  const refreshSummaries = async () => {
    const [systemResponse, cognitiveResponse] = await Promise.all([
      fetch("/api/system-summary"),
      fetch("/api/cognitive-summary")
    ]);

    if (systemResponse.ok) {
      const systemPayload = (await systemResponse.json()) as SystemSummary;
      setSystem(systemPayload);
    }

    if (cognitiveResponse.ok) {
      const cognitivePayload = (await cognitiveResponse.json()) as CognitiveSummary;
      setCognitive(cognitivePayload);
    }
  };

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
      setActiveDemoRuntime(null);
      await refreshSummaries();
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
        runtime: DemoRuntime;
      };

      setPrompt(payload.scenario.prompt);
      setExecutions((current) => [payload.execution, ...current].slice(0, 12));
      setActiveDemoRuntime(payload.runtime);
      setResult((current) =>
        current
          ? {
              ...current,
              assistantResponse: `${payload.scenario.title} senaryosu calistirildi. ${payload.runtime.summary}`
            }
          : {
              input: payload.scenario.prompt,
              normalizedGoal: payload.scenario.prompt,
              detectedTargets: payload.execution.targets,
              suggestedMode: payload.execution.mode,
              actions: [],
              riskLevel: payload.execution.riskLevel,
              explanation: payload.runtime.summary,
              intent: "demo-scenario",
              expectedOutput: "Terminal akisi ve guvenlik panellerinde canli demo sonucu",
              assistantResponse: `${payload.scenario.title} senaryosu calistirildi. ${payload.runtime.summary}`,
              urgency: "elevated",
              responseStyle: "demo",
              constraints: ["observe-only"],
              planSummary: "Demo terminalini ac ve guvenlik panellerindeki sonucu gozden gecir."
            }
      );
      await refreshSummaries();
      setActiveScenarioId(null);
    });
  };

  const handleInstallStep = (step: InstallStepId) => {
    startTransition(async () => {
      setError(null);
      setActiveInstallStep(step);

      const response = await fetch("/api/install", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ step })
      });

      const payload = (await response.json()) as InstallStepResult;

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Kurulum adimi basarisiz oldu.");
        setInstallResults((current) => [
          payload,
          ...current.filter((entry) => entry.step !== step)
        ]);
        setActiveInstallStep(null);
        return;
      }

      setInstallResults((current) => [
        payload,
        ...current.filter((entry) => entry.step !== step)
      ]);
      await refreshSummaries();
      setActiveInstallStep(null);
    });
  };

  return (
    <>
      {!system.installation.ready ? (
        <>
          <section className="hero installHero">
            <div className="heroCopy">
              <p className="eyebrow">Project Asylum Installer</p>
              <h1>Kurulum tamamlanana kadar sadece hazirlik ekrani gosterilir</h1>
              <p className="lead">
                Once kaynak yollarini ve kurulum hazirlik durumunu kontrol et. Tum
                adimlar tamamlandiginda ana guvenlik paneli otomatik olarak acilacak.
              </p>
            </div>

            <aside className="heroStatus">
              <span className="statusBadge">
                {system.installation.ready ? "ready" : "install-required"}
              </span>
              <dl className="metricList">
                <div>
                  <dt>Kuruluma hazir mi?</dt>
                  <dd>{system.installation.ready ? "Evet" : "Hayir"}</dd>
                </div>
                <div>
                  <dt>Aktif log kaynagi</dt>
                  <dd>{system.telemetry.preferredLogSourceLabel ?? "Belirlenemedi"}</dd>
                </div>
                <div>
                  <dt>Yedek kaynak</dt>
                  <dd>{system.telemetry.fallbackLogSourceLabel ?? "Yedek kaynak yok"}</dd>
                </div>
                <div>
                  <dt>Calisma modu</dt>
                  <dd>observe-only</dd>
                </div>
              </dl>
            </aside>
          </section>

          <section className="section">
            <div className="sectionHeading">
              <p className="sectionEyebrow">Hazirlik</p>
              <h2>Kaynak yolları ve kurulum durumu</h2>
            </div>
            <div className="sourceHealthGrid">
              {system.installation.sourcePaths.map((source) => (
                <article key={`${source.label}-${source.path}`} className="sourceHealthCard">
                  <p className="sourceHealthLabel">{source.label}</p>
                  <strong>{source.status === "detected" ? "Hazir" : "Bekleniyor"}</strong>
                  <p>{source.path}</p>
                </article>
              ))}
            </div>
            <div className="chipRow compactRow installChecklistRow">
              {installChecklist.map((item) => (
                <span
                  key={item.label}
                  className={`chip ${item.complete ? "successChip" : "warningChip"}`}
                >
                  {item.label}: {item.complete ? "tamam" : "bekliyor"}
                </span>
              ))}
            </div>
          </section>

          <section className="section">
            <div className="sectionHeading">
              <p className="sectionEyebrow">Kurulum Sihirbazi</p>
              <h2>Adimlari sirasiyla tamamla</h2>
            </div>
            <p className="bodyText">
              Siradaki zorunlu adim:{" "}
              <strong>{nextRequiredStep ? nextRequiredStep.toUpperCase() : "tamamlandi"}</strong>
            </p>
            <div className="installGrid">
              {INSTALL_STEPS.map((step) => {
                const latestResult =
                  installResults.find((entry) => entry.step === step.id) ?? null;
                const unlocked = isInstallStepUnlocked(step.id);

                return (
                  <article key={step.id} className="installCard">
                    <div className="installCardHeader">
                      <div>
                        <p className="installLabel">{step.title}</p>
                        <strong>{step.description}</strong>
                      </div>
                      <button
                        type="button"
                        className="secondaryButton"
                        onClick={() => handleInstallStep(step.id)}
                        disabled={isPending || !unlocked}
                      >
                        {activeInstallStep === step.id
                          ? "Calisiyor..."
                          : unlocked
                            ? "Calistir"
                            : "Onceki adimi tamamla"}
                      </button>
                    </div>
                    <p className="installStatus">
                      {!unlocked
                        ? "Bu adim bir onceki adim tamamlanmadan acilmaz."
                        : latestResult
                        ? latestResult.ok
                          ? "Son durum: basarili"
                          : "Son durum: hata"
                        : "Henuz calistirilmadi"}
                    </p>
                    {latestResult?.payload ? (
                      <div className="installOutput">
                        <code>{JSON.stringify(latestResult.payload, null, 2)}</code>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
            {error ? <p className="errorText">{error}</p> : null}
          </section>
        </>
      ) : (
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
            <div>
              <dt>Aktif log kaynağı</dt>
              <dd>{system.telemetry.preferredLogSourceLabel ?? "Belirlenemedi"}</dd>
            </div>
            <div>
              <dt>Yedek kaynak</dt>
              <dd>{system.telemetry.fallbackLogSourceLabel ?? "Yedek kaynak yok"}</dd>
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
          <p className="sectionEyebrow">Kaynak Sağlığı</p>
          <h2>Log keşfi şu an nasıl çalışıyor?</h2>
        </div>
        <div className="sourceHealthGrid">
          <article className="sourceHealthCard">
            <p className="sourceHealthLabel">Aktif Kaynak</p>
            <strong>{system.telemetry.preferredLogSourceLabel ?? "Belirlenemedi"}</strong>
            <p>
              Sistem şu an telemetry ve güvenlik sinyallerini öncelikle bu kaynaktan
              okumaya çalışıyor.
            </p>
          </article>
          <article className="sourceHealthCard">
            <p className="sourceHealthLabel">Yedek Kaynak</p>
            <strong>{system.telemetry.fallbackLogSourceLabel ?? "Yedek kaynak yok"}</strong>
            <p>
              Aktif kaynak zayıflarsa veya okunamaz hale gelirse sistem bu kaynağa
              kayabilir.
            </p>
          </article>
          <article className="sourceHealthCard">
            <p className="sourceHealthLabel">Keşif Sağlığı</p>
            <strong>
              {system.telemetry.sampledLogSourceCount > 0 ? "Saglikli" : "Sinirli"}
            </strong>
            <p>
              {system.telemetry.sampledLogSourceCount} kaynak örneklendi,{" "}
              {system.telemetry.securitySignalCount} güvenlik sinyali çıkarıldı.
            </p>
          </article>
        </div>
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
        {activeDemoRuntime ? (
          <article className="demoTerminalPanel">
            <div className="demoTerminalHeader">
              <div>
                <p className="sectionEyebrow">Canli Demo Akisi</p>
                <h3>Project Asylum terminal gorunumu</h3>
              </div>
              <span className="demoTerminalBadge">observe-only</span>
            </div>
            <p className="demoTerminalSummary">{activeDemoRuntime.summary}</p>
            <div className="demoTerminalMeta">
              <span>
                Supheli IP:{" "}
                {activeDemoRuntime.attackerIps.length
                  ? activeDemoRuntime.attackerIps.join(", ")
                  : "yok"}
              </span>
              <span>
                Dikkat portu:{" "}
                {activeDemoRuntime.highlightedPorts.length
                  ? activeDemoRuntime.highlightedPorts.join(", ")
                  : "yok"}
              </span>
            </div>
            <div className="demoTerminalWindow">
              {activeDemoRuntime.terminal.slice(0, visibleTerminalLines).map((entry) => (
                <div key={`${entry.at}-${entry.line}`} className={`demoTerminalLine ${entry.level}`}>
                  <span className="demoTerminalTime">{entry.at}</span>
                  <span className="demoTerminalText">{entry.line}</span>
                </div>
              ))}
            </div>
          </article>
        ) : null}
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
            <div className="actionBlock">
              <strong>Ne yapilmali?</strong>
              <ul className="signalList">
                {portRecommendations.length ? (
                  portRecommendations.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li>Su an kapatma onerisi gerektiren belirgin bir port yok.</li>
                )}
              </ul>
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
            <div className="actionBlock">
              <strong>Supheli IP</strong>
              <div className="chipRow compactRow">
                {attackerIps.length ? (
                  attackerIps.map((ip) => (
                    <span key={ip} className="chip warningChip">
                      {ip}
                    </span>
                  ))
                ) : (
                  <span className="chip">IP cikarilamadi</span>
                )}
              </div>
            </div>
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
            <div className="actionBlock">
              <strong>Hemen ne yapilmali?</strong>
              <ul className="signalList">
                {immediateActions.length ? (
                  immediateActions.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li>Su an icin acil aksiyon onerisi bulunmuyor.</li>
                )}
              </ul>
            </div>
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
            <h3>Aktif log kaynağı</h3>
            <p>{system.telemetry.preferredLogSourceLabel ?? "Belirlenemedi"}</p>
          </article>
          <article className="card">
            <h3>Yedek log kaynağı</h3>
            <p>{system.telemetry.fallbackLogSourceLabel ?? "Yedek kaynak yok"}</p>
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
      )}
    </>
  );
}
