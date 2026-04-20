# Project Asylum Installation

Bu belge, Project Asylum'u `linux`, `macos` veya `windows` üzerinde yerel olarak ayağa kaldırmak için temel kurulum akışını açıklar.

## Amaç

Kurulum akışı aşağıdaki işleri otomatikleştirmeyi hedefler:
- işletim sistemi ailesini tespit etmek,
- önerilen yerel log kaynaklarını keşfetmek,
- Asylum için kalıcı veri dizinini hazırlamak,
- ilk doğrulama (`doctor`) çıktısını üretmek.

## Güvenlik İlkesi

Kurulum aşaması **yalnızca observation mode** olarak çalışır.

Bu şu anlama gelir:
- kurulum sırasında hiçbir remediation uygulanmaz,
- sistem üzerinde güvenlik politikası değiştiren aksiyon çalıştırılmaz,
- servis kapatma, konfigürasyon yazma, firewall değiştirme veya otomatik düzeltme yapılmaz,
- log kaynakları yalnızca tespit edilir ve raporlanır.

Kurulumun amacı sistemi güvenli biçimde ayağa kaldırmak ve Asylum'a gözlem kaynaklarını tanıtmaktır. İlk kurulum sırasında yeni bir güvenlik açığı üretmemesi ve mevcut sistemi bozmaması temel tasarım ilkesidir.

## Hızlı Kurulum

1. Bağımlılıkları kur:

```bash
npm install
```

2. Setup çalıştır:

```bash
npm run install:setup
```

3. Bootstrap çalıştır:

```bash
npm run install:bootstrap
```

4. Kurulum doğrulamasını çalıştır:

```bash
npm run install:doctor
```

5. Post-install kontrolünü çalıştır:

```bash
npm run install:postcheck
```

6. Testleri çalıştır:

```bash
npm test
```

7. Uygulamayı başlat:

```bash
npm run dev
```

## Setup Çıktıları

`npm run install:setup` şu işleri yapar:
- `data/` dizinini oluşturur,
- `.env.example` dosyasını temel alarak eksikse `.env` üretir,
- `release/install-manifest.json` dosyasını oluşturur,
- kurulum modunun `observe-only` olduğunu açıkça kaydeder.

## Platform ve Log Keşfi

Kurulum sırasında sistem otomatik olarak:
- `linux`
- `macos`
- `windows`

ayrımını yapar ve o platform için önerilen log kaynaklarını listeler.

Örnek kaynaklar:

- macOS:
  - `/var/log/system.log`
  - `/var/log/install.log`
  - `~/Library/Logs`

- Linux:
  - `/var/log/syslog`
  - `/var/log/auth.log`
  - `/var/log/journal`

- Windows:
  - `C:\Windows\System32\winevt\Logs`
  - `C:\ProgramData\Microsoft\Windows Defender\Support`

Bu yolların varlık durumu bootstrap ve doctor çıktısında `exists` alanı ile raporlanır.

## Not

Bu aşamada log kaynakları otomatik **tespit edilip kayıt altına alınır**; doğrudan tam log ingestion boru hattı henüz tamamlanmamıştır. Ama installer katmanı, Asylum'un hangi platformda hangi log kaynaklarıyla başlaması gerektiğini backend'e iletir.

Bootstrap ve doctor çıktılarında şu alanlar açıkça yer alır:
- `installationMode: "observe-only"`
- `safeByDefault: true`
- `remediationEnabled: false`

Post-install kontrolü de aynı güvenlik ilkesini tekrar doğrular.
