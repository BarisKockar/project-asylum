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
Ancak ilk müşteri kurulumu için anlaşılır demo/dashboard yüzeyi de artık aktif olarak şekillendirilmektedir.

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

Son turdaki önemli ekleme:
- demo senaryoları artık sabit örnek veri döndürmüyor
- özellikle brute force demosu her çalıştırmada değişen çoklu IP ve çoklu başarısız giriş denemesi üretiyor
- UI tarafında demo çalışınca terminal benzeri bir akış paneli açılıyor ve satırlar zaman içinde akıyormuş gibi gösteriliyor
- bu akış hâlâ `observe-only`; hiçbir gerçek remediation veya sistem değişikliği tetiklemiyor
- log kaynağı etiketleri artık doğrudan canlı OS keşfinden değil, `release/bootstrap-profile.json` içinden okunuyor
- bu sayede bootstrap öncesi UI `Belirlenemedi / Yedek kaynak yok` gösteriyor; bootstrap sonrası kaynaklar görünür hale geliyor
- UI artık iki aşamalı:
  - kurulum tamamlanmadan sadece installer ekranı, kaynak yolları ve kurulum butonları görünür
  - setup + bootstrap + doctor + postcheck tamamlandıktan sonra tam dashboard açılır
  - kritik düzeltme: artık yalnızca `.env` veya `bootstrap-profile.json` varlığı yeterli değildir; tam UI için `release/install-state.json` içindeki adım durumları gerekir
  - kurulum adımları artık zorunlu sırayla çalışır; kullanıcı `1 -> 2 -> 3 -> 4` dışına çıkamaz

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
- `/Users/bariskockar/Desktop/bilet-app/project asylum/src/app/api/demo-scenarios/route.ts`
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
- log/telemetry preview
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
- `sampledLogSources`
- `securitySignals`

Demo senaryoları overlay ile telemetry observation içine ek sinyal basabiliyor; bu sayede UI gerçek panel verisini aynı summary zincirinden üretmeye devam ediyor.

Kurulum görünürlüğü için yeni kural:
- `scripts/bootstrap-install.ts` artık `release/bootstrap-profile.json` üretir
- `scripts/setup-install.ts` bu dosya varsa temizler
- `src/app/lib/platform-data.ts` aktif/yedek log kaynağını yalnızca bu bootstrap profili varsa summary’ye taşır
- amaç: ilk kurulum videosunda kaynak keşfi gerçekten bootstrap adımında olmuş gibi görünmeli
- `SystemSummary.installation` artık şunları taşır:
  - `ready`
  - `setupComplete`
  - `bootstrapComplete`
  - `doctorComplete`
  - `postcheckComplete`
  - `sourcePaths`
- `src/app/components/dashboard-client.tsx` bu installation state’e göre render yapar
- kurulum scriptleri artık `release/install-state.json` yazar:
  - `setup-install.ts` -> `setupComplete`
  - `bootstrap-install.ts` -> `bootstrapComplete`
  - `install-doctor.ts` -> `doctorComplete`
  - `postinstall-check.ts` -> `postcheckComplete`
- testler bu state dosyasını kirletmesin diye `PROJECT_ASYLUM_SKIP_INSTALL_STATE_WRITE=1` ile script doğrulaması yapar
- `src/app/api/install/route.ts` artık sıra kontrolü yapar ve yanlış adımı `409` ile reddeder
- `src/app/components/dashboard-client.tsx` kilitli adımlarda:
  - butonda `Onceki adimi tamamla`
  - açıklamada `Bu adim bir onceki adim tamamlanmadan acilmaz.`
  yazar

### 3. Risk engine

`risk-engine` observation metadata’dan somut risk üretiyor:
- `risk-network-exposure`
- `risk-process-review`
- `risk-config-hardening`
- `risk-admin-surface`
- `risk-log-anomaly`
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

Demo katmanı için ayrıca `/src/lib/agent/demo-scenarios.ts` içinde:
- `DemoRuntime`
- `DemoTerminalEvent`

tipleri eklendi. `runDemoScenario()` artık yalnızca execution/report dönmüyor; aynı zamanda terminal panelinde gösterilecek canlı demo akışını da döndürüyor.

Özellikle:
- `brute-force-watch`:
  - 14-28 arası değişen başarısız giriş sinyali
  - 3-5 arası değişen saldırgan IP
  - auth log benzeri terminal akışı
- `open-port-exposure`:
  - değişken port kümesi
  - dikkat portları ve terminal akışı
- `critical-posture-review`:
  - brute force + config + port sinyallerini birleştiren karma demo akışı

Bu sayede müşteri demosunda sonuçlar her seferinde aynı görünmüyor ve daha inandırıcı bir “canlı sistem” hissi oluşuyor.

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
- `npm test` şu an `14/14` geçiyor.
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
- execution observations artık platforma göre log kaynaklarını keşfediyor ve salt-okunur preview ile telemetry observation üretiyor.
- telemetry observation içindeki güvenlik sinyallerinden `risk-log-anomaly` türetilmesi testle doğrulandı.
- `SystemSummary` ve `CognitiveSummary` artık telemetry ve exposure alanları taşıyor:
  - açık port sayısı
  - review port listesi
  - brute-force benzeri log sinyalleri
  - dikkat gerektiren durum sayısı
  - brute-force yapan IP adresleri
  - port bazlı önerilen kapatma/erişim kısıtlama aksiyonları
  - ekranda doğrudan gösterilebilecek acil aksiyon listesi
- dashboard artık müşteriye ilk kurulum sırasında gösterilebilecek üç net panel içeriyor:
  - Açık Portlar
  - Brute Force / Giriş Denemeleri
  - Dikkat Gerektiren Durumlar
- bu paneller artık daha açıklayıcı hale getirildi:
  - brute force kartında saldırgan IP'ler görünür
  - açık port kartında port bazlı ne yapılmalı önerisi yazılı gelir
  - dikkat kartında “hemen ne yapılmalı” maddeleri gösterilir
- dashboard, prompt veya demo senaryosu çalıştıktan sonra `/api/system-summary` ve `/api/cognitive-summary` üzerinden kendini yeniler; yani paneller artık canlı şekilde güncellenir.
- dashboard artık ayrıca tek tıkla çalıştırılabilen müşteri demo senaryoları içeriyor:
  - `brute-force-watch`
  - `open-port-exposure`
  - `critical-posture-review`
- demo senaryoları observe-only overlay uygular; gerçek remediation yapmaz, ama müşteriye kritik anlarda sistemin nasıl sinyal verdiğini görünür kılar.
- terminalden tek komutlu demo doğrulaması hazır:
  - `npm run demo:scenarios`
  - çıktı içinde senaryo bazında `status`, `riskCount`, `blockerCount`, `openPortCount`, `securitySignalCount` görülür.
- platform/log keşif katmanı güçlendirildi:
  - artık sadece sabit yol tahmini yapmıyor
  - `exists` yanında `readable` bilgisi de taşıyor
  - `sourceType` olarak `file | directory | command` ayrımı yapıyor
  - macOS için `log show`, Linux için `journalctl`, Windows için `wevtutil` gibi komut fallback'leri de profile ekleniyor
- `install:doctor` artık ek olarak `log-fallback-available` kontrolü yapıyor; yani sabit dosya yolu zayıf olsa bile komut tabanlı log erişimi doğrulanabiliyor.
- log kaynakları artık `priorityScore` ile puanlanıyor ve tek bir `preferred` kaynak işaretleniyor.
- `collectLogObservation()` önce bu `preferred` kaynağı kullanıyor; böylece installer, observation ve UI aynı kaynağa hizalanıyor.
- `SystemSummary` ve `CognitiveSummary` artık `preferredLogSourceLabel` taşıyor; UI'da “şu anda hangi kaynaktan okunuyor” satırı üretmek için hazır.
- summary katmanı artık ayrıca `fallbackLogSourceLabel` da taşıyor; UI'da aktif kaynak yanında yedek/fallback kaynak da gösterilebiliyor.

## Demo Surface

Demo senaryoları için ana dosyalar:
- `/Users/bariskockar/Desktop/bilet-app/project asylum/src/lib/agent/demo-scenarios.ts`
- `/Users/bariskockar/Desktop/bilet-app/project asylum/src/app/api/demo-scenarios/route.ts`
- `/Users/bariskockar/Desktop/bilet-app/project asylum/scripts/run-demo-scenarios.ts`

Amaç:
- müşteriye prompt yazdırmadan sistemi göstermek
- kritik an simülasyonlarını güvenli biçimde yüzeye çıkarmak
- observe-only mod bozulmadan brute-force, açık port ve kritik posture örnekleri üretmek

## Installation Surface

Kurulum yüzeyi hazır ve güvenli varsayılanlarla çalışıyor:
- `scripts/setup-install.ts`
- `scripts/bootstrap-install.ts`
- `scripts/install-doctor.ts`
- `scripts/postinstall-check.ts`
- `scripts/install.sh`
- `scripts/install.ps1`
- `INSTALLATION.md`

Kurulum garantileri:
- `observe-only`
- `safe-by-default`
- `remediation disabled`
- platform ayrımı: `linux | macos | windows`
- log kaynakları otomatik keşfedilir, ama sadece okunur preview alınır
- UI içinde de artık bir kurulum sihirbazı var:
  - `setup`
  - `bootstrap`
  - `doctor`
  - `postcheck`
  adımları butonlarla sırayla çalıştırılabiliyor
- bu sihirbaz `/src/app/api/install/route.ts` üzerinden script'leri güvenli whitelist ile çağırıyor ve JSON sonuçlarını ekranda gösteriyor.

## Current UI Demo Surface

Mevcut dashboard müşteriye ilk kurulumda sistemin çalıştığını göstermek için artık şu özetleri verir:
- dinleyen açık port sayısı ve öne çıkan review portlar
- brute-force / authentication failure benzeri log sinyali sayısı
- policy blocker + yüksek risk + log/port sinyalinden türetilmiş dikkat göstergeleri
- örneklenen log kaynağı sayısı ve öne çıkan log kaynağı

Bu yüzey henüz tam ürün UI’ı değil; amaç ilk kurulum ve ilk demo anında teknik boğuculuk olmadan “sistem gerçekten veri görüyor” hissini vermektir.
- `policyDecisionDetails` structured çıktı olarak priority ve severity taşıyor; örneğin `high-risk-triage` artık `severity=high`, `priority=1` ile en üstte geliyor.
- `primaryBlockerReason` strict profil smoke testinde `high-risk-triage` olarak doğrulandı; yani backend artık tek alanla en kritik bekleyen policy sebebini expose ediyor.
- decision modeli artık `policyInsight.pendingRules` ile hizalı; strict smoke testte `decision.status=needs-triage`, `decision.blockers=[high-risk-triage]` ve `primaryBlockerReason=high-risk-triage` aynı anda doğrulandı.
- `decision.primaryBlockerReason` alanı eklendi; artık consumer katmanları bu bilgiyi tekrar hesaplamadan doğrudan report içinden alabiliyor.
- `policyInsight.riskContext` alanı eklendi; blocker severity artık mümkün olduğunca gerçek risk skorları ve risk id’leriyle ilişkilendiriliyor.
- blocker `priority` değeri artık yalnızca sabit map değil; risk severity ve score etkisi de priority hesabına katılıyor.
- ilk trust/confidence iskeleti eklendi; execution report artık `trust` alanı içinde confidence ve automation eligibility taşıyor.
- trust engine artık sınırlı historical feedback kullanıyor; aynı prompt/ortam tekrarlandıkça geçmiş `completed` ve `needs-triage` sonuçları confidence hesabını etkiliyor.
- trust engine artık yalnızca aynı prompt’a bakmıyor; host/runtime observation metadata’sından türetilen environment fingerprint ile aynı environment + action-type sınıfındaki geçmiş başarı/triage kayıtlarını ayrı ağırlıklarla confidence hesabına katıyor.
- trust trend artık yalnızca hesaplanan anlık değer değil; execution store ve kalıcı JSON persistence içine `trustRecords` olarak yazılıyor.
- trust trend summary katmanı eklendi; backend artık en güçlü environment/action kayıtlarını ve en zayıf alanları tek özetten çıkarabiliyor.
- trust trend summary artık `trustRatio` da taşıyor; güçlü/zayıf environment ve action alanları oran bazlı karşılaştırılabiliyor.
- ilk formal test katmanı eklendi; `npm test` artık `tests/agent-backend.test.ts` üzerinden geçiyor.
- test kapsamı şu an üç kritik alanı kilitliyor:
  - strict profile altında primary blocker sıralaması
  - trust score'un history success / triage etkisi
  - policy insight içinde matched / pending rule ayrımı
- test kapsamı aynı gün iki uçtan uca davranışla genişletildi:
  - `executePrompt()` çağrısının persisted report + trust + policy insight üretmesi
  - execution filtrelerinin `status + policyProfile` birlikte doğru çalışması
- test kapsamı ayrıca aynı environment/action-type içindeki farklı promptların trust history’den faydalanmasını da doğruluyor.
- bu doğrulama artık kaba `localhost` etiketi yerine gerçek host/runtime fingerprint mantığıyla yapılıyor.
- ek olarak `executePrompt()` sonrası environment ve action scope’lu trust trend kayıtlarının hem memory store’da hem disk üstündeki JSON dosyasında oluştuğu da testle doğrulanıyor.
- ayrıca `getTrustTrendSummary()` üzerinden top/weak trust alanlarının sıralandığı da testle doğrulanıyor.
- `SystemSummary` ve `CognitiveSummary` artık trust trend anahtarları ve ratio alanlarını da dışa açıyor.
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
- `package.json` içine `npm test` scripti eklendi ve Node test runner + `tsx` üzerinden TypeScript testleri koşuluyor.
- `src/lib/agent/execution-store.ts` içine testler için `resetExecutionStoreForTests()` yardımcısı eklendi.
- `src/lib/agent/persistent-store.ts` ve `src/lib/agent/execution-store.ts` artık `trustRecords` alanı taşıyor.
- `src/app/api/trust-summary/route.ts` eklendi; trust trend summary artık API yüzeyinden de alınabiliyor.
- `src/app/lib/platform-data.ts` trust trend özetini system/cognitive summary katmanına bağlıyor.
- `src/lib/agent/platform-profile.ts` eklendi; sistem artık `linux/macos/windows` ayrımı yapıp önerilen log kaynaklarını structured olarak tespit ediyor.
- `src/lib/agent/observation-engine.ts` artık keşfedilen log kaynaklarından salt-okunur preview alıp `telemetry` observation üretiyor.
- `src/lib/agent/risk-engine.ts` artık log preview içindeki temel güvenlik sinyallerinden `risk-log-anomaly` türetebiliyor.
- `src/app/lib/platform-data.ts` artık telemetry özetini de `SystemSummary` ve `CognitiveSummary` içine bağlıyor.
- `src/app/api/platform-profile/route.ts` eklendi; platform profili ve log source listesi artık API yüzeyinden alınabiliyor.
- `scripts/bootstrap-install.ts` ve `scripts/install-doctor.ts` eklendi; kurulum bootstrap ve doctor akışı JSON çıktısı veriyor.
- `scripts/setup-install.ts` ve `scripts/postinstall-check.ts` eklendi; setup `.env` ve release manifest üretip post-install doğrulaması yapıyor.
- `README.md`, `release/README.md`, `release/VERSION.json`, `scripts/install.sh` ve `scripts/install.ps1` eklendi; proje artık daha profesyonel bir release ve onboarding yüzeyi sunuyor.
- `INSTALLATION.md` eklendi; kurulum komutları ve platform bazlı log kaynakları dokümante edildi.
- `package.json` içine `install:bootstrap` ve `install:doctor` scriptleri eklendi.
- `package.json` içine `install:setup` ve `install:postcheck` scriptleri de eklendi.
- `.env.example` eklendi; observe-only güvenlik varsayımları ve temel runtime değişkenleri dokümante edildi.
- test kapsamı platform profile tespiti ve install script JSON çıktısını da kapsıyor.
- test kapsamı telemetry/log discovery observation ve log anomaly risk türetimini de kapsıyor.
- test kapsamı summary katmanındaki telemetry alanlarını da doğruluyor.
- test kapsamı release surface ve profesyonel proje dokümantasyon dosyalarının varlığını da kapsıyor.
- kurulum güvenlik ilkesi netleştirildi: installer/doctor varsayılan olarak `installationMode=observe-only`, `safeByDefault=true`, `remediationEnabled=false` döndürüyor.
- bu alanlar testle sabitlendi; kurulum sırasında sistem yalnızca keşif/gözlem yapmalı, aktif düzeltme ya da riskli değişiklik yapmamalı.
- `TUBITAK_1812_BIGG_BASVURU_TASLAGI.md` eklendi; 1812 BiGG için resmî çağrı ve PRODİS mantığına yakın doldurulmuş başvuru metni taslağı hazırlandı.
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
