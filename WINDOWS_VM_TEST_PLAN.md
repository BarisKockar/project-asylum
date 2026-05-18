# Windows VM Test Plan

Bu belge, Project Asylum customer-mode bundle'in Windows sanal cihaz uzerindeki ilk pilot kurulum dogrulama planidir.

## Hedef

Amaç:

- `Project Asylum Installer x64.exe` gercekten aciliyor mu
- bundled runtime ile Node'suz ortamda kurulabiliyor mu
- `Preflight -> Full Install -> Self-check -> Popup UI` zinciri geciyor mu

## Ortam

Onerilen sanal cihaz:

- Windows 11 x64
- temiz kurulum
- tercihen sistemde Node yüklü olmadan test

Mac tarafında kullanılan VM araci:

- `UTM`

## Teste Girmeden Once

Windows VM içine şu klasör kopyalanmış olmalı:

- `/Users/bariskockar/Desktop/Project-Asylum-Customer-Mode-Kit/release/customer-mode`

Bundle içinde beklenen kritik dosyalar:

- `Project Asylum Installer x64.exe`
- `runtime/windows/node/x64/.../node.exe`
- `app/`
- `scripts/`
- `release/customer-mode-manifest.json`

## Test Adimlari

### 1. EXE Acilisi

- `Project Asylum Installer x64.exe` calistirilir

Beklenen:

- pencere acilmali
- kurulum ekrani gelmeli
- anlik cokme olmamali

### 2. Preflight

- installer icinden `Preflight` calistirilir

Beklenen:

- platform `win32/x64`
- bundled runtime tespit edilmeli
- `readyForCustomerInstall: true`

### 3. Full Install

- installer icinden `Install Baslat` calistirilir

Beklenen:

- preflight
- setup
- bootstrap
- doctor
- postcheck
- self-check

adimlari hatasiz gecmeli

### 4. Self-check

Kurulumdan sonra acilip kontrol edilir:

- `release/self-check-report.json`

Beklenen:

- `overallStatus: "pass"`

### 5. Popup UI

Beklenen:

- dashboard tarayici sekmesi yerine uygulama penceresi gibi acilmali veya en azindan localhost paneline ulasilmali
- `http://localhost:3002`

### 6. Yeniden Acilis

- installer kapatilir
- tekrar acilir
- panel tekrar acilabilir mi kontrol edilir

## Toplanacak Kanitlar

Hata cikarsa sunlar alinmali:

- installer console ciktilari
- `release/self-check-report.json`
- `release/app-launch.json`
- ekran goruntusu

## Basari Kriteri

Windows VM testi gecti sayilmasi icin:

1. `.exe` acilmali
2. `Preflight` yesil donmeli
3. `Full Install` tamamlanmali
4. `self-check-report.json` pass donmeli
5. panel acilmali

## Mevcut Durum

- macOS tarafi aktif dogrulandi
- `UTM` bu Mac'e kuruldu
- Windows VM testi icin siradaki blok:
  - resmi Windows 11 ARM/x64 imajinin temini
  - VM olusturulmasi

Not:

Windows VM testi production readiness icin faydali ve hizli bir ara adimdir; yine de son asamada en az bir gercek Windows cihaz testi gerekecektir.
