# Production Readiness Checklist

Project Asylum customer-mode installer icin production readiness hedefi, demo calismasindan farkli olarak coklu cihaz ve coklu OS uzerinde tekrarlanabilir, guvenli ve desteklenebilir kurulum saglamaktir.

## Mevcut Seviye

- `macOS`: guclu pilot seviyesi
- `Windows`: customer-mode bundle hazir, saha dogrulamasi gerekli
- `Linux`: customer-mode bundle hazir, saha dogrulamasi gerekli

## Production Ready Demeden Once

Asagidaki maddeler gecmeden sistem genis olcekli musteri dagitimina hazir kabul edilmemelidir.

### 1. Cihaz Duzeyi Kurulum Testleri

- [ ] macOS Apple Silicon temiz cihaz kurulumu
- [ ] macOS Intel temiz cihaz kurulumu
- [ ] Windows x64 temiz cihaz kurulumu
- [ ] Windows arm64 temiz cihaz kurulumu (varsa)
- [ ] Linux x64 temiz cihaz kurulumu
- [ ] Linux arm64 temiz cihaz kurulumu (varsa)

### 2. Runtime ve Offline Dagitim Testleri

- [ ] Node kurulu olmayan cihazda bundled runtime ile kurulum
- [ ] Internet kapali ortamda offline bundle ile kurulum
- [ ] `app/node_modules` ve `.next` ile bundle icinden calisma
- [ ] Installer kapanip yeniden acildiginda state tutarliligi

### 3. Guvenlik ve Guvenilirlik Testleri

- [ ] kurulum suresince `observe-only` kilidi aktif
- [ ] remediation varsayilan olarak kapali
- [ ] log kaynaklari sadece okunur sekilde test ediliyor
- [ ] system modification yapilmadigi self-check raporunda gorunuyor
- [ ] kurulum sonrasi health report otomatik olusuyor

### 4. UX ve Desteklenebilirlik

- [ ] hatalar kullanici dostu dille aciklaniyor
- [ ] `Preflight` sonucu ile `Install` sonucu birbiriyle tutarli
- [ ] kurulum bitince panel otomatik aciliyor
- [ ] self-check sonucu installer icinde gorunuyor
- [ ] destek icin paylasilabilir tanilama raporu bulunuyor

### 5. Release Sertlestirme

- [ ] macOS code signing / notarization
- [ ] Windows code signing
- [ ] Linux paketleme/delivery netlestirme
- [ ] surum numarasi ve manifest senkronu
- [ ] release notlari ve rollback talimati

## Pilot Customer %100 Hedefi

Pilot musteri seviyesinde `%100` demek icin asgari hedef:

1. macOS, Windows ve Linux icin en az birer gercek cihazda kurulumun tam gecmesi
2. bundled runtime ile Node'suz kurulumun dogrulanmasi
3. installer -> preflight -> full install -> self-check -> popup UI akisinin sorunsuz calismasi
4. health report ve install log'larin destek ekibi tarafindan okunabilir olmasi
5. 10+ tekrarda kritik kurulum hatasi cikmamasi

## Sonraki Teknik Oncelik

1. Customer-mode self-check ve health report
2. Windows gercek cihaz testi
3. Linux gercek cihaz testi
4. installer hata metinlerini sadeleştirme
5. notarization / signing
