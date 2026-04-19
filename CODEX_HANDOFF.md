# CODEX HANDOFF

Bu belge Project Asylum için yaşayan handoff kaydıdır. Bu klasörü açan herhangi bir Codex önce bu dosyayı, ardından `AGENTS.md` dosyasını okumalıdır. Her anlamlı teknik değişiklikten sonra bu belge güncellenmelidir.

## Canonical Workspace

- Canonical çalışma dizini: `/Users/bariskockar/Desktop/bilet-app/project asylum`
- Kullanıcı masaüstünde symlink veya farklı kısa yol görebilir; geliştirme ve referans için canonical path kullanılmalıdır.

## Product Direction

Project Asylum:
- local-first
- self-hosted
- third-party inference API bağımsız
- ticari kullanıma uygun lisans çizgisinde
- observation -> risk -> reasoning -> critic -> decision zinciri kurulan
- uzun vadede otonom ama güvenlik kapıları olan bir siber güvenlik ajanı
- earned autonomy modeliyle güven kazandıkça yetki artışı hedefleyen bir ürün

Şu an odak UI değil, backend bilişsel omurgadır.

## Current State

Şu an çalışan çekirdek akış:
1. Prompt analiz edilir.
2. Local observation toplanır.
3. Risk skorlama yapılır.
4. Reasoning trace üretilir.
5. Critic verdict hazırlanır.
6. Plan adımları local task run kayıtlarına dönüştürülür.
7. Decision ve blocker’lar yazılır.
8. Execution report local JSON store içinde kalıcı olarak saklanır.

## Important Files

### Agent backend

- `/Users/bariskockar/Desktop/bilet-app/project asylum/src/types/agent.ts`
- `/Users/bariskockar/Desktop/bilet-app/project asylum/src/lib/agent/prompt-engine.ts`
- `/Users/bariskockar/Desktop/bilet-app/project asylum/src/lib/agent/observation-engine.ts`
- `/Users/bariskockar/Desktop/bilet-app/project asylum/src/lib/agent/risk-engine.ts`
- `/Users/bariskockar/Desktop/bilet-app/project asylum/src/lib/agent/reasoning-engine.ts`
- `/Users/bariskockar/Desktop/bilet-app/project asylum/src/lib/agent/critic-engine.ts`
- `/Users/bariskockar/Desktop/bilet-app/project asylum/src/lib/agent/policy-engine.ts`
- `/Users/bariskockar/Desktop/bilet-app/project asylum/src/lib/agent/decision-engine.ts`
- `/Users/bariskockar/Desktop/bilet-app/project asylum/src/lib/agent/execution-engine.ts`
- `/Users/bariskockar/Desktop/bilet-app/project asylum/src/lib/agent/execution-store.ts`
- `/Users/bariskockar/Desktop/bilet-app/project asylum/src/lib/agent/runtime.ts`

### Architecture docs

- `/Users/bariskockar/Desktop/bilet-app/project asylum/TRUST_AND_AUTONOMY_MODEL.md`

### API surface

- `/Users/bariskockar/Desktop/bilet-app/project asylum/src/app/api/analyze/route.ts`
- `/Users/bariskockar/Desktop/bilet-app/project asylum/src/app/api/execute/route.ts`
- `/Users/bariskockar/Desktop/bilet-app/project asylum/src/app/api/executions/route.ts`
- `/Users/bariskockar/Desktop/bilet-app/project asylum/src/app/api/executions/[id]/route.ts`
- `/Users/bariskockar/Desktop/bilet-app/project asylum/src/app/api/system-summary/route.ts`
- `/Users/bariskockar/Desktop/bilet-app/project asylum/src/app/api/cognitive-summary/route.ts`

## Backend Capabilities Implemented

### 1. Prompt analysis

`prompt-engine` şu alanları çıkarıyor:
- intent
- targets
- mode
- urgency
- response style
- constraints
- plan summary

### 2. Observation engine

`observation-engine` gerçek local sinyaller topluyor:
- process sample
- listening TCP services
- config/env signals
- host runtime
- policy context
- plan context

Observation kayıtları artık `metadata` taşıyor.

Örnek metadata:
- `sampledProcesses`
- `reviewProcesses`
- `listeningServices`
- `ports`
- `reviewPorts`
- `riskySignals`

### 3. Risk engine

`risk-engine` observation metadata’dan somut risk üretiyor:
- `risk-network-exposure`
- `risk-process-review`
- `risk-config-hardening`
- `risk-admin-surface`
- `risk-safe-first-gate`

Her risk için artık:
- severity
- score
- evidence
- sourceKinds

üretiliyor.

### 4. Reasoning engine

`reasoning-engine` risklerden inanç ve hipotez zinciri kuruyor:
- belief summary
- belief status
- belief confidence
- supporting kinds
- hypotheses[]
- priority hypothesis
- next inference

Canlı doğrulamada son örnek:
- belief status: `tentative`
- priority hypothesis: `risk-config-hardening`

### 5. Critic engine

`critic-engine` reasoning + risk + prompt kısıtlarından verdict çıkarıyor:
- `approve`
- `revise`

Risk bayrakları örnekleri:
- `safe-first-validation`
- `network-exposure-review`
- `critical-surface-review`
- `high-risk-triage`

### 6. Planning layer

`planning-engine` reasoning ve critic çıktısından yapılandırılmış plan üretiyor:
- objective
- guarded
- steps[]

Plan adımları artık çalıştırılabilir local task ipuçları taşıyor: collector, reasoning ve critic görevleri için `taskType`, `commandHint` ve beklenen `outputs` alanları var.

Plan adımları execution sırasında `taskRuns` kayıtlarına dönüşüyor:
- hangi step çalıştı
- hangi command hint kullanıldı
- ne üretti
- blocked mı completed mı

Collector görevleri artık gerçekten command hint bazlı ayrılıyor:
- `port-scan-lite` -> network observation
- `config-snapshot` -> config observation
- `runtime-snapshot` -> host runtime observation

Reasoning ve critic görevleri de artık yeniden hesaplanan trace üstünden task run üretiyor; yani sadece mevcut state’i yazmak yerine rerun yolunu simüle ediyorlar.

Tekrarlı collector ve reasoning kanıtı geldikçe bazı geçici blocker'lar yumuşatılabiliyor; örneğin review port bulunmayan tekrar çalıştırmalarda `network-exposure-review` kaldırılabiliyor ve düşük yoğunluklu config sinyallerinde `high-risk-triage` daralabiliyor. Bu davranış artık açık bir blocker policy tablosuyla yönetiliyor.

Blocker policy mantığı artık critic dosyasının içine gömülü değil; `/src/lib/agent/policy-engine.ts` içinde ayrı bir modül olarak tutuluyor. Bu modül:
- policy context üretir
- tekrar deneme sayısı ve observation metadata’dan blocker policy eşleşmelerini hesaplar
- ileride tenant veya SOC bazlı özelleştirme için ayrı genişleme noktası sağlar

Varsayılan blocker policy ayarları artık yerel config dosyasından da okunur:
- `/Users/bariskockar/Desktop/bilet-app/project asylum/data/blocker-policies.json`

Bu dosya artık profile-aware yapıdadır:
- `activeProfile`
- `profiles.default`
- `profiles.strict-soc`
- `profiles.lenient-lab`

Aktif profil gerektiğinde `PROJECT_ASYLUM_POLICY_PROFILE` environment variable ile override edilebilir. Bu sayede farklı SOC kurulumlarında blocker eşikleri kod değiştirmeden ayarlanabilir.

Aktif policy profili artık execution zinciri boyunca görünür taşınıyor:
- `PromptExecution.policyProfile`
- `PromptExecutionReport.policyProfile`
- `SystemSummary.policyProfile`
- `CognitiveSummary.policyProfile`

Execution listesi artık filtrelenebilir:
- `status`
- `policyProfile`

`/api/executions` route'u artık `?status=...&policyProfile=...` query parametrelerini birlikte destekliyor.

Execution detail ve summary yanıtlarında artık policy etkisi açıklanıyor:
- `PromptExecutionReport.policyInsight`
  - `profile`
  - `posture`
  - `explanation`
  - `context`
  - `thresholds`
  - `evaluations`
  - `matchedRules`
  - `pendingRules`
- detail route payload’ı artık `{ report, policy }` şekline sahip
- `SystemSummary` ve `CognitiveSummary` içine `policyPosture` ve `policyExplanation` eklendi
- ayrıca detail ve summary katmanları artık `policyDecisionLines` döndürüyor; bunlar insan-dili satırlar halinde hangi policy kuralının neden geçtiğini ya da beklediğini anlatıyor
- ayrıca policy açıklaması artık iki katmanlı:
  - `policyDecisionSummary`
  - `policyDecisionLines`
  - `policyDecisionDetails`
  - `primaryBlockerReason`

### 7. Decision layer

Decision hâlâ action uygulamıyor. Şu an:
- status
- rationale
- blockers
- nextStep

üretiyor.

Discovery akışında critic `revise` verirse decision status artık `needs-triage` olabiliyor; bu, tamamlanmış gibi görünen ama aslında ek doğrulama bekleyen akışları daha dürüst temsil ediyor.

Yani sistem şu an otomatik düzeltme yapmıyor, ama karar ve blokaj modelini taşıyor.

## Verified Behavior

Bu workspace’te doğrulanan son backend davranışları:
- `npx tsc --noEmit --incremental false` geçti.
- `node --import tsx --eval ... executePrompt(...)` ile policy modülü ayrıldıktan sonra smoke test tekrar geçti.
- `data/blocker-policies.json` okuyan policy-engine ile smoke test tekrar geçti.
- profile-aware policy-engine ile hem varsayılan profil hem `strict-soc` override testi geçti.
- execution/report/system/cognitive summary içinde `policyProfile` alanı doğrulandı.
- execution listesinde `status + policyProfile` birlikte filtreleme doğrulandı.
- persistent store normalize edilerek eski kayıtlarda eksik `policyProfile` alanları `default` olarak dolduruldu.
- `policyInsight` smoke testinde `profile=default`, `posture=balanced`, `matchedRules=[network-exposure-review, high-risk-triage]` doğrulandı.
- `policyInsight.thresholds` smoke testinde default ve `strict-soc` profilleri için eşik farkları sayısal olarak doğrulandı.
- `policyInsight.context` ve `policyInsight.evaluations` smoke testinde aynı execution context’in strict profilde neden takıldığını gösterdi; örneğin `high-risk-triage` için `riskySignalsSatisfied=false` açıkça görüldü.
- `policyDecisionLines` strict profil smoke testinde şu açıklamayı üretti: `high-risk-triage kuralı beklemede; riskli sinyal yoğunluğu yüksek (3/2).`
- `policyDecisionSummary` strict profil smoke testinde şu kısa özeti üretti: `strict-soc profili altında high-risk-triage kuralı hâlâ beklemede.`
- `policyDecisionDetails` structured çıktı olarak priority ve severity taşıyor; örneğin `high-risk-triage` artık `severity=high`, `priority=1` ile en üstte geliyor.
- `primaryBlockerReason` strict profil smoke testinde `high-risk-triage` olarak doğrulandı; yani backend artık tek alanla en kritik bekleyen policy sebebini expose ediyor.
- decision modeli artık `policyInsight.pendingRules` ile hizalı; strict smoke testte `decision.status=needs-triage`, `decision.blockers=[high-risk-triage]` ve `primaryBlockerReason=high-risk-triage` aynı anda doğrulandı.
- `decision.primaryBlockerReason` alanı eklendi; artık consumer katmanları bu bilgiyi tekrar hesaplamadan doğrudan report içinden alabiliyor.
- `policyInsight.riskContext` alanı eklendi; blocker severity artık mümkün olduğunca gerçek risk skorları ve risk id’leriyle ilişkilendiriliyor.
- blocker `priority` değeri artık yalnızca sabit map değil; risk severity ve score etkisi de priority hesabına katılıyor.
- ilk trust/confidence iskeleti eklendi; execution report artık `trust` alanı içinde confidence ve automation eligibility taşıyor.
- trust engine artık sınırlı historical feedback kullanıyor; aynı prompt/ortam tekrarlandıkça geçmiş `completed` ve `needs-triage` sonuçları confidence hesabını etkiliyor.
- `npx tsx --eval ... executePrompt(...)` çağrısı çalıştı.
- Execution summary örneği:
  - `7 observation, 4 risk, 4 hipotez ve 3 plan adımı üretildi`
- Observation’lar artık portları ayrıştırıyor:
  - örnek portlar: `64568`, `7000`, `5000`, `57343`
- Süreç yanlış pozitiflerinden biri düzeltildi:
  - `launchd` artık `nc` alt dizesi yüzünden şüpheli sayılmıyor.
- Critic örneği:
  - `verdict: revise`
  - `riskFlags: network-exposure-review, high-risk-triage`
  - ilk çalıştırmada `policyMatches` değerleri `matched: false` döndü; yani blocker policy yalnızca yeterli tekrar kanıtı oluşunca devreye girecek şekilde ayrılmış durumda
  - tekrar çalıştırmalarda `data/blocker-policies.json` üzerinden gelen kurallarla `policyMatches` değerleri `matched: true` olabiliyor ve status `completed` seviyesine çıkabiliyor
  - `strict-soc` profili altında aynı zincir farklı note/eşiklerle çalışıyor; örneğin `network-exposure-review` eşleşirken `high-risk-triage` eşleşmesi daha geç davranabiliyor
  - varsayılan smoke testte `executionPolicyProfile`, `reportPolicyProfile`, `systemPolicyProfile`, `cognitivePolicyProfile` hepsi `default` döndü
  - filtre testinde `defaultProfiles` yalnızca `default` döndü; eski persistence kayıtları normalize edildi
  - detail ve summary yanıtları artık aynı kararın hangi policy postüründe üretildiğini açıkça taşıyor
  - policy insight artık `minCollectorAttempts`, `minReasoningAttempts`, `maxRiskySignals` gibi eşikleri de taşıyor
  - policy insight artık bu eşiklerin mevcut execution context tarafından geçilip geçilmediğini de taşıyor
  - detail/system/cognitive summary artık bu evaluation farkını okunabilir Türkçe karar satırlarına dönüştürüyor
  - kısa özet ve detay ayrımı sayesinde aynı karar hem hızlı okunur hem de derin açıklanabilir hale geldi
  - structured detail katmanı sayesinde backend artık severity ve öncelik bazlı karar açıklaması döndürüyor
  - summary ve detail katmanları artık tek bakışta kullanılabilecek `primaryBlockerReason` alanını da taşıyor
  - decision/blocker modeli artık policy değerlendirme zinciriyle daha tutarlı çalışıyor
  - execution report artık `decision.primaryBlockerReason` ile tek alanlı kritik blocker özetini kalıcı taşıyor
  - policy detail severity değerleri artık sabit haritadan ziyade risk engine çıktılarıyla daha doğrudan besleniyor
  - blocker sıralaması artık risk ağırlığını da yansıtıyor
  - trust/confidence katmanı artık backend omurgasına ilk kez bağlandı
  - trust/confidence artık geçmiş execution sonucuna duyarlı ilk öğrenme sinyalini aldı
- Plan örneği:
  - `objective: Config hardening ihtiyacı`
  - adımlar: `Ek collector kaniti topla -> Reasoning zincirini yenile -> Critic ve policy gate değerlendir`
- Task run örneği:
  - `collector -> completed`
  - `reasoning -> completed`
  - `critic -> blocked`
- Retry örneği:
  - aynı prompt ikinci kez çalışınca step `attempt` değeri artıyor

## Known Issues

- Next dev/build ortamı zaman zaman kararsız olabiliyor.
- Bazı eski dosyalar geçmişte `Operation timed out` verdi; bu dosya temiz kopya olarak yeniden oluşturuldu.
- 2026-04-19 tarihinde proje GitHub'a güvenli yayın için kullanıcı home dizinini kapsayan eski üst repo yerine bu klasörde bağımsız git deposu olarak yeniden başlatıldı.
- Aynı gün `scripts/init-storage.ts`, `scripts/run-local-collector.ts`, `scripts/run-local-cycle.ts`, `scripts/run-reasoning.ts` dosyaları okunamayan bozuk kopyalardan ayrılıp temiz wrapper sürümleriyle yeniden oluşturuldu.
- Execution store `globalThis` üstünde cache’leniyor ama `/Users/bariskockar/Desktop/bilet-app/project asylum/data/agent-executions.json` dosyasına kalıcı yazılıyor.
- Execution listesi artık status bazlı filtrelenebiliyor; örneğin `needs-triage`, `awaiting-approval`, `completed`.
- System ve cognitive summary katmanı artık bu status geçmişinden besleniyor; bekleyen işler summary tarafında görünür.
- Real collector / reasoner / critic / remediation zinciri henüz SQLite tarafına persist edilmiyor.

## Deliberately Not Implemented Yet

- gerçek remediation playbook yürütme
- rollback motoru
- policy-backed action executor
- kalıcı execution/history storage
- multi-step autonomous planning
- outcome learning persistence
- confidence / trust persistence
- action-level autonomy gating

## Trust / Autonomy Direction

Yeni eklenen `/Users/bariskockar/Desktop/bilet-app/project asylum/TRUST_AND_AUTONOMY_MODEL.md` belgesi otomatik aksiyon yönünü sabitliyor.

Karar:

- şu anda gerçek otomatik remediation’a geçilmeyecek
- önce trust ve confidence modeli mimari olarak yerleştirilecek
- confidence, policy’yi override etmeyecek
- earned autonomy mantığı kullanılacak

Plan:

1. confidence alanlarını veri modeline eklemek
2. environment / action trust skorları tanımlamak
3. önce dry-run seviyesinde uygulamak
4. yalnızca düşük riskli aksiyonlarda kontrollü otomasyona açmak

## Best Next Steps

En doğru sıradaki işler:
1. history etkisini prompt düzeyinden çıkarıp environment / host / action-type seviyesine genişletmek
2. JSON execution store’u daha sonra SQLite ile senkronize etmek
3. collector’ı daha güvenlik odaklı local sinyallerle genişletmek
4. remediation engine için dry-run only iskelet kurmak
5. policy profile seçimini runtime configuration/UI kontrolüne bağlamak

## Rule

Bu dosya yaşayan belgedir. Anlamlı backend, data model, automation, reasoning veya remediation değişikliğinden sonra güncellenmelidir.
