# Trust And Autonomy Model

Project Asylum için otomatik aksiyon modeli `earned autonomy` mantığıyla tasarlanır.

Amaç, sistemi baştan sınırsız otomasyonla çalıştırmak değil; güven kazandıkça yetki alanını kontrollü şekilde genişletmektir.

## Temel İlke

Sistem her aksiyon için:

- confidence
- trust history
- policy eligibility
- approval requirement

üretmelidir.

Confidence yüksek olsa bile policy sınırlarını aşamaz.

## Neden Gerekli

Bu model şu riskleri azaltır:

- yanlış pozitif üzerinden otomatik aksiyon alma
- henüz yeterince öğrenilmemiş ortamlarda aşırı güven
- kritik üretim aksiyonlarında erken otomasyon
- kurumlar arası farklı risk toleranslarını tek şablonla yönetmeye çalışma

## Katmanlar

### 1. Decision Confidence

Her decision ve önerilen aksiyon için ayrı confidence hesaplanır.

Confidence şu girdilerden beslenir:

- observation kalitesi
- risk netliği
- critic verdict
- policy uyumu
- geçmiş benzer execution sonuçları
- false positive geçmişi
- aynı ortamda başarı oranı

Confidence tek global sayı değil, aksiyon bazlı olmalıdır.

Örnek:

- config remediation confidence
- network isolation confidence
- service restart confidence
- package patch confidence

### 2. Environment Trust

Sistem güveni genel değil, ortama özel kazanmalıdır.

Trust şu seviyelerde tutulabilir:

- company / tenant
- environment
- host
- service
- action type

Örnek:

- bir ortamda config hardening için yüksek güven
- aynı ortamda firewall değişikliği için düşük güven

## Yetki Seviyeleri

### Level 0: Observe Only

- yalnızca gözlem
- rapor
- triage
- aksiyon yok

### Level 1: Recommend Only

- aksiyon öner
- insan onayı iste
- risk ve confidence açıkla

### Level 2: Low-Risk Auto

- rollback’i kolay
- blast radius düşük
- doğrulanabilir düşük riskli aksiyonlar otomatik uygulanabilir

### Level 3: Conditional Auto

- belirli aksiyon tiplerinde
- yeterli trust history sonrası
- policy izin veriyorsa
- otomatik uygulanabilir

### Level 4: Restricted High Autonomy

- yalnızca çok dar kapsamlı
- yüksek doğrulukla kanıtlanmış
- kurumun açık policy izni verdiği alanlarda

Bu seviyede bile bazı aksiyonlar hiçbir zaman serbest bırakılmaz.

## Confidence Eşikleri

Başlangıç örneği:

- `0.00 - 0.59`
  observe / report only
- `0.60 - 0.79`
  öneri + onay gerekli
- `0.80 - 0.89`
  düşük riskli aksiyonlar otomatik olabilir
- `0.90+`
  sadece dar, rollback’i kolay aksiyonlarda yüksek otomasyon

Bu eşikler ürün içinde tenant bazlı özelleştirilebilir olmalıdır.

## Policy Üstünlüğü

Confidence, policy’yi override etmez.

Örnek:

- confidence yüksek olsa bile
- aksiyon tipi kritikse
- tenant policy insan onayı gerektiriyorsa

sistem otomatik uygulama yapmaz.

## Asla Tam Otomatik Olmaması Gereken Alanlar

Varsayılan olarak şunlar doğrudan tam otomatik olmamalıdır:

- IAM / yetki değişiklikleri
- production DB erişim değişiklikleri
- geniş kapsamlı firewall değişiklikleri
- secret rotation
- customer-facing servis shutdown
- yüksek blast radius taşıyan remediation işlemleri

## Öğrenme ve Güven Artışı

Trust score zaman içinde şu verilerle güncellenir:

- aksiyon başarı oranı
- rollback gerekip gerekmediği
- servis kesintisi yaratıp yaratmadığı
- analist onay / red oranı
- benzer execution’ların sonucu
- false positive / false negative geçmişi

## Veri Modeli Önerisi

İleride eklenmesi gereken alanlar:

- `confidenceScore`
- `confidenceFactors`
- `environmentTrustScore`
- `actionTrustScore`
- `automationEligibility`
- `approvalRequirementReason`
- `trustHistory`
- `outcomeFeedback`

## Şu Anki Konum

Project Asylum şu anda:

- observation
- risk
- reasoning
- critic
- policy
- decision

omurgasını kurmuş durumda.

Henüz eksik olanlar:

- confidence hesabı
- trust persistence
- action class modeli
- remediation dry-run executor
- rollback güvenliği

Yani bu model şu an otomatik aksiyon başlatmak için değil, mimari yönü şimdiden doğru kurmak için eklenmektedir.

## Sonuç

Doğru yaklaşım:

- önce trust modelini tasarlamak
- sonra confidence alanlarını veri modeline eklemek
- ardından dry-run seviyesinde denemek
- en son düşük riskli otomasyona geçmektir

Bu model Project Asylum’u daha güvenli, daha satılabilir ve kurumsal ortamlarda daha kabul edilebilir hale getirir.
