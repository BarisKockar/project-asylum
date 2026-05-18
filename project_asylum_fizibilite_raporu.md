# Project Asylum 2026-2028 Butce, Fizibilite, Lisans/Uyum ve Gelir Yol Haritasi

## Dokuman amaci

Bu rapor, Project Asylum icin giris, orta ve ileri duzeyde butce, teknik fizibilite, pazar yol haritasi, lisans/uyum gereksinimleri, test laboratuvari ihtiyaclari ve gelir kapilarini tek bir planda toplamak icin hazirlandi.

Bu metin stratejik planlama amaclidir; hukuki ve mali konularda son karar oncesi hukuk muhasebe ve belgelendirme uzmanindan teyit alinmalidir.

---

## 1. Yonetici ozeti

Project Asylum, local-first ve self-hosted bir siber guvenlik urunu olarak dogru bir bosluga oynuyor: dis inference API bagimsizligi, aciklanabilir karar zinciri, policy-aware triage ve zamanla earned autonomy modeline ilerleme. Proje bugun fikir asamasini gecmis, prototip ve pilot-hazirlik asamasina girmis durumda. Mevcut dokumanlar urunun observation -> risk -> reasoning -> critic -> policy -> trust -> planning -> decision omurgasina sahip oldugunu, customer-mode installer ve multi-OS pilot hedeflerine dogru ilerledigini gosteriyor.

Buna karsin ticari basariyi belirleyecek asil darbohaz artik sadece kod gelistirme degil; test ortami, sahada dogrulama, kurulum guvenilirligi, lisans/uyum disiplini, code signing, log ve veri yonetimi, kurumsal guven ve pilot gelisimi olacak.

Bu nedenle Project Asylum icin ilk 12-18 ayda en dogru strateji sunlardir:

1. guclu bir test/gelistirme istasyonu ve minimum bir fiziksel test filosu kurmak,
2. Windows ve Linux uzerinde gercek cihaz kurulum dogrulamasini bitirmek,
3. observe-only ve explainable-security kimligini netlestirip riskli otomasyon vaadini ertelemek,
4. once pilot kurulum ve hizmet destekli satisla gelir uretmek,
5. daha sonra sertifikasyon ve kurumsal guven katmanlarini ekleyerek orta olcekte lisansli urune donusmek.

Bu planla Project Asylum, erken donemde dusuk sermaye ile isleyen bir guvenlik urunu haline gelebilir; ancak bunu ancak "guvenilir demo + saglam kurulum + yasal/uyum duzeni + kontrollu gelir modeli" dengesini kurarsa yapabilir.

---

## 2. Projenin mevcut teknik konumu

### 2.1 Ust seviye teknik durum

Mevcut dosyalara gore Project Asylum:

- local-first ve self-hosted tasarim prensibine sahip,
- ucuncu taraf inference API bagimsizligi hedefliyor,
- kararlarini aciklanabilir bir pipeline ile uretiyor,
- observe-only kurulum guvencesi sagliyor,
- customer-mode installer ve multi-OS bundle hedefliyor,
- trust/autonomy modelini daha simdiden mimariye koyuyor,
- backend odakli prototipten pilot-ready urune gecis asamasinda bulunuyor.

Urun omurgasinda su zincir acik sekilde tanimli:

prompt -> observation -> risk -> reasoning -> critic -> policy -> trust -> planning -> task runs -> decision

Bu mimari klasik tarama aracindan farkli olarak sadece bulgu cikarmayi degil, karar gerekcesi ve politika/guven baglamini da urunun merkezine koyuyor.

### 2.2 Teknik gucler

- local-first ve self-hosted yaklasim sayesinde veri egemenligi kuvvetli,
- explainable pipeline sayesinde kurumsal satis dili guclu,
- observe-only kurulum sayesinde ilk guven bariyeri dusuk,
- customer-mode installer sayesinde pilot kurulumlar urunlesmeye yakin,
- trust/autonomy modelinin erken kurgulanmis olmasi uzun vadeli fark yaratiyor,
- lisans politikasinda MIT/Apache/BSD/ISC cizgisi korunuyor.

### 2.3 Teknik darbohazlar

Mevcut dokumanlara gore kritik eksikler sunlar:

- Windows ve Linux gercek cihaz testi,
- self-check ve health report zincirinin saha tekrarli dogrulamasi,
- installer signing/notarization,
- confidence/trust persistence derinlestirme,
- dry-run remediation iskeleti,
- JSON persistence'tan daha olgun veritabanina gecis,
- urun seviyesinde desteklenebilir hata/diagnostic akisi.

### 2.4 Uretime yakinlik seviyesi

Bugunku seviyeyi su sekilde ozetlemek dogru olur:

- urun fikri: tamam
- prototip mimarisi: tamam
- demo kabiliyeti: guclu
- pilot hazirlik: kismen hazir
- kurumsal production readiness: henuz tamam degil

Yani Project Asylum "satis denemesi yapilabilir" seviyeye yakindir; ancak "genis olcekli kurumsal dagitim" seviyesinde degildir.

---

## 3. Temel varsayimlar ve planlama prensipleri

Bu rapordaki butce ve yol haritasi su varsayimlara dayanir:

1. Ilk 12 ayda cekirdek ekip kucuk kalacak.
2. Once urun + pilot gelistirilecek, sonra buyuk pazarlama harcamasina gidilecek.
3. Ilk musteri tipleri KOBI, teknoloji sirketleri ve kendi altyapisini yoneten ekipler olacak.
4. Kurulum guvenilirligi ve explainability, pazarlama mesajindan daha onemli olacak.
5. Uygulamanin erken donem gelir modeli "lisans + kurulum + pilot destek" karmasi olacak.
6. Urun ilk fazda observation/triage tarafinda kalacak; tam otomasyon gec acilacak.

---

## 4. Pazar problemi ve konumlandirma

### 4.1 Cekirdek problem

Pazar problemi basitce su:

- Kurumlarin guvenlik sinyali cok,
- Yetiskin analist zamani az,
- Araclar tespit yapiyor ama karar aciklamiyor,
- Kucuk ekiplerin 7/24 guvenlik omurgasi kurmasi pahali,
- Dis servis bagimliligi veri egemenligi kaygisi doguruyor.

### 4.2 Project Asylum'un farki

Project Asylum'u farkli yapan ana hatlar:

- local-first calisma,
- self-hosted deployment,
- explainable decision chain,
- policy-aware triage,
- trust-based autonomy roadmap,
- observe-only ve safe-by-default kurulum ilkesi.

### 4.3 Hedef segmentler

Ilk hedef segmentler:

1. 20-250 calisanli teknoloji sirketleri,
2. MSP/MSSP benzeri servis yapilari,
3. kendi sunucusunu yoneten yazilim firmalari,
4. veri egemenligi hassas kuruluslar,
5. guvenlik ekibi kucuk ama denetim baskisi buyuyen isletmeler.

Daha ileri segmentler:

- kritik altyapi tedarik zincirleri,
- buyuk kurumsal kurum ici SOC ekipleri,
- regule sektorler,
- kamu ve kamuya yakin yapilar.

---

## 5. Urun yol haritasi: giris / orta / ileri

## 5.1 Giris duzeyi urun (0-9 ay)

### Amac
Pilot-ready, guvenilir, demonstre edilebilir, kurulum dostu bir security intelligence urunu ortaya cikarmak.

### Kapsam
- observation
- risk triage
- reasoning/critic/policy gorunurlugu
- explainable dashboard
- installer + preflight + doctor + postcheck
- health report ve diagnostics export
- demo senaryolari
- observe-only operasyon

### Cikabilecek satis tipi
- pilot lisansi
- paid PoC
- kurulum + demo + tuning hizmeti

### Teknik odak
- Windows/Linux gercek cihaz testleri
- preflight/install tutarliligi
- error UX
- code signing temeli
- telemetry ve log source guvenilirligi

## 5.2 Orta duzey urun (9-18 ay)

### Amac
Pilotlardan cikan verilerle false positive'i azaltmis, birden fazla musteriye kurulabilir, desteklenebilir ve satin alinabilir hale gelmis urun.

### Kapsam
- daha iyi persistence
- tenant/profile mantigi
- policy profile secimi
- raporlama
- daha guclu collector'lar
- rollback'siz ama kontrollu dry-run remediation
- onboarding ve admin guide

### Cikabilecek satis tipi
- yillik lisans
- destek paketi
- MSSP/partner pilotu
- premium deployment paketi

## 5.3 Ileri duzey urun (18-36 ay)

### Amac
Kurumsal guven standardi yuksek, sertifikasyon ve procurement sureclerine girebilen, moduler gelir ureten bir urun.

### Kapsam
- action-level trust modeli
- secili alanlarda low-risk auto
- daha formal RBAC/tenant/security model
- daha formal audit trail
- sertifikasyon hazirligi
- kamu/kritik altyapi guveni icin belge setleri

### Cikabilecek satis tipi
- enterprise lisans
- moduler eklenti geliri
- premium support/SLA
- dikey paketler
- kamu/kurumsal proje bazli satis

---

## 6. Teknik fizibilite analizi

## 6.1 Urun-gerceklik uyumu

Project Asylum teknik olarak yapilabilir bir urun. Sebepler:

- mevcut prototip birden fazla cekirdek modulu calistiriyor,
- customer-mode kurulum mantigi var,
- testler ve demo yuzeyi mevcut,
- urun farkliligi sadece UI'a degil mimari omurgaya dayaniyor.

Teknik yapilabilirlik yuksek; operasyonel uygulanabilirlik ise orta seviyede. Yani kod yazmak mumkun, fakat urunu tekrarli ve desteklenebilir sekilde kurmak ayrica emek istiyor.

## 6.2 En buyuk teknik riskler

1. Multi-OS kurulum guvenilirligi.
2. Gercek log kaynagi farkliliklari.
3. Yanlis pozitiflerin ticari etki yaratmasi.
4. Early automation vaadinin guven riski dogurmasi.
5. JSON tabanli persistence'in uzun vadede yetersiz kalmasi.

## 6.3 Teknik fizibilite puani

- Prototip fizibilitesi: yuksek
- Pilot fizibilitesi: orta-yuksek
- Kurumsal production fizibilitesi: orta
- Kisa vadeli (0-12 ay) gelir fizibilitesi: orta-yuksek
- Buyuk olcek kurumsal satis fizibilitesi: orta, ama sertifikasyon ve saha kaniti gerektirir

---

## 7. Test laboratuvari ve ilk asama altyapi ihtiyaci

Bu bolum kritik. Cunku Project Asylum klasik SaaS dashboard degil; kurulum, runtime, bundled node, offline dagitim, Windows/Linux/macos akislarini gercekten test etmesi gereken bir siber guvenlik urunu.

Ustelik mevcut production-readiness hedeflerinde en az birer gercek cihazda kurulum, Node'suz ortam, offline bundle ve tekrarli kurulum basarisi acikca hedefleniyor. Bu nedenle ilk asama yatirimin merkezinde test laboratuvari olmalidir.

## 7.1 Mutlaka alinmasi gereken cihazlar

### A. Ana gelistirme ve sanallastirma istasyonu (zorunlu)

Bu makine hem gelistirme hem de VM test merkezi olacak.

#### Onerilen minimum
- 8 performans cekirdegi esdegeri CPU
- 32 GB RAM
- 1 TB NVMe SSD
- ikinci SSD veya hizli harici SSD ile yedek alan

#### Onerilen dogru seviye
- Ryzen 9 veya i9 sinifi CPU
- 64 GB RAM
- 2 TB NVMe SSD
- duzenli image/backup alani

#### Neden gerekli?
- Windows VM
- Linux VM
- installer paketleri
- build/test akislarinin ayni anda kosmasi
- log simulasyonu
- ekran kaydi ve demo hazirligi

Bu cihaz Project Asylum icin "luxury" degil, cekirdek gelistirme aracidir.

### B. Gercek Windows test cihazi (neredeyse zorunlu)

Windows VM faydalidir ama yeterli degildir. Mevcut hedeflerde gercek Windows cihaz testi acikca bir sonraki onceliklerden biridir.

#### Oneri
- kullanilmis/refurbished kurumsal laptop veya mini PC
- 16 GB RAM
- 512 GB SSD
- Windows 11 Pro

#### Amac
- installer exe acilisi
- code signing sonrasi gercek davranis
- Defender/SmartScreen etkileri
- localhost/popup UI testleri
- kullanici deneyimi

### C. Gercek Linux test cihazi (guclu tavsiye)

Linux VM yeterli olmayabilir; farkli distro ve sistem servis davranislari fiziksel testte ayri sinyal verir.

#### Oneri
- mini PC veya ikinci el ThinkCentre/OptiPlex
- 16 GB RAM
- 512 GB SSD

#### Amac
- auth.log/syslog/journal davranisi
- permission ve installer akis testi
- command fallback testleri

### D. Mevcut Mac ana cihaz korunmali

Eger gelistirme Mac uzerindeyse onu ana kontrol merkezi olarak korumak mantiklidir. Cunku notarization, dmg/app davranisi, Apple Silicon ve bundle testleri icin bu ayrica gereklidir.

## 7.2 Sanal test ortami

### Gerekli sanal ortamlar
- Windows 11 x64 VM
- Ubuntu LTS VM
- istege bagli ikinci Linux distro
- temiz snapshot'lar
- internet var/yok senaryolari

### Gerekli yazilimlar
- UTM, VMware veya benzeri
- disk image yedekleme
- ekran kayit araci
- hash ve artifact kontrol araclari

## 7.3 Test laboratuvari ilave ekipmanlari

- UPS veya en azindan surge protection
- harici SSD/NAS yedekleme
- donanim test notlari icin ikinci monitor
- installer artifact arsivi
- seri numara ve lisans envanteri takibi

## 7.4 Neden bu kadar ciddi bir lab lazim?

Cunku Project Asylum bir siber guvenlik urunu olarak:

- kurulumda guven vermeli,
- sistem degistirmeden calismali,
- false positive'i azaltmali,
- teknik delil ve health report uretebilmeli,
- satis oncesi "gosterilebilir" olmali,
- saha sorunlarini tekrarli sekilde yeniden uretebilmeli.

Bunlar iyi bir test laboratuvari olmadan yapilamaz.

---

## 8. Butce plani

Asagidaki rakamlar 2026 kosullarinda aralik bazli planlama sayilaridir. Marka ve tik bazli fiyat degil, karar destegi icin kullanilmalidir.

## 8.1 Giris duzeyi butce (0-9 ay)

### 8.1.1 Donanim ve test lab

| Kalem | Minimum TL | Gercekci TL | Not |
|---|---:|---:|---|
| Ana test/gelistirme istasyonu | 40000 | 85000 | 64 GB RAM tercih edilmeli |
| Gercek Windows test cihazi | 15000 | 30000 | Refurbished olabilir |
| Gercek Linux test cihazi | 12000 | 25000 | Mini PC yeterli |
| Harici SSD / yedekleme | 4000 | 12000 | Artifact ve image icin |
| UPS / elektrik koruma | 3000 | 8000 | Tavsiye |
| Ikinci monitor / aksesuar | 5000 | 15000 | Verimlilik |

#### Alt toplam
- Minimum: 79000 TL
- Gercekci: 175000 TL

### 8.1.2 Gelistirme ve urunlesme

| Kalem | Minimum TL | Gercekci TL | Not |
|---|---:|---:|---|
| Domain / web / e-posta | 1500 | 6000 | Yillik |
| Demo sunum/landing page | 3000 | 15000 | Dis kaynak alinabilir |
| Test ve artifact storage | 0 | 12000 | NAS/Cloud/backups |
| Kod imzalama hazirlik giderleri | 5000 | 30000 | Sertifika ve surec hazirligi |
| Pentest/light review butcesi | 0 | 40000 | Erken dis denetim |

#### Alt toplam
- Minimum: 9500 TL
- Gercekci: 103000 TL

### 8.1.3 Operasyon ve sirketlesme

| Kalem | Minimum TL | Gercekci TL | Not |
|---|---:|---:|---|
| Sirket kurulus ve muhasebe | 15000 | 40000 | Ture gore degisir |
| Marka/isim arastirma + basvuru | 5000 | 25000 | Tavsiye edilir |
| Sozlesme, KVKK ve hukuki dokuman | 15000 | 60000 | Asla hafife alinmamali |
| Temel tasarim ve tanitim materyali | 5000 | 20000 | Pilot icin yeterli |

#### Alt toplam
- Minimum: 40000 TL
- Gercekci: 145000 TL

### Giris duzeyi genel toplam
- Minimum: yaklasik 130000 TL
- Gercekci: yaklasik 423000 TL

## 8.2 Orta duzey butce (9-18 ay)

Bu asamada asil maliyet yazilimdan cok desteklenebilirlik, pilot onboarding, false positive tuning, raporlama ve sertifikasyon hazirligidir.

| Kalem | Aralik TL |
|---|---:|
| Ek gelistirici / freelance destek | 180000 - 700000 |
| Guvenlik danismanligi / pentest / architecture review | 50000 - 250000 |
| Musteri pilot kurulum ve saha destegi | 50000 - 200000 |
| Signing/notarization/surec sertligi | 25000 - 100000 |
| Kurumsal dokumantasyon ve destek merkezi | 30000 - 120000 |
| Ilk uyum ve bilgi guvenligi standardi hazirligi | 50000 - 250000 |

### Orta duzey genel toplam
- Lean: 385000 TL civari
- Gercekci: 1200000 TL civari
- Rahat: 1600000+ TL

## 8.3 Ileri duzey butce (18-36 ay)

| Kalem | Aralik TL |
|---|---:|
| Enterprise productization | 400000 - 1500000 |
| Sertifikasyon ve belgelendirme paketleri | 150000 - 1000000+ |
| Satis ve partner yapisi | 250000 - 1500000 |
| SLA/Support operasyonu | 150000 - 800000 |
| Kamu/kurumsal procurement hazirligi | 100000 - 750000 |

### Ileri duzey genel toplam
- Yaklasik 1050000 TL ile baslar
- Kurumsal olcekte 5M TL ve ustune rahat cikabilir

---

## 9. Gelir kapilari ve yapilabilirlik yol haritasi

Bu bolum Project Asylum icin en kritik kisimlardan biridir. Cunku her teknik kabiliyet gelir yaratmaz; her gelir tipi de her olgunluk seviyesinde satilamaz.

Aciq prensip:

- Giris fazinda en kolay satilan sey "urun + kurulum + tuning + rapor" karmasidir.
- Orta fazda "yillik lisans + destek" mantigi devreye girer.
- Ileri fazda ise "moduler gelir + enterprise destek + partner kanali" mantikli olur.

## 9.1 Giris duzeyi gelir kapilari (0-9 ay)

### 1. Paid pilot / PoC geliri

#### Tanim
Musteriye 30-90 gunluk sinirli pilot kurulum yapilir; urun observe-only modda calisir; raporlar, triage ve kurulum guvenilirligi gosterilir.

#### Fiyat araligi
- 50000 - 250000 TL / pilot

#### Yapilabilirlik
Yuksek. Cunku musteri tam urun degil, kontrollu deneme satin alir.

#### Gerekenler
- temiz demo
- kurulum guvenilirligi
- tanilama raporu
- net scope
- guven veren sozlesme

#### Risk
Pilottan urun lisansina donusemeyen "danismanlik girdabi".

### 2. Kurulum ve onboarding hizmeti

#### Tanim
Project Asylum lisansi yaninda kurulum, log source map, guvenli ilk ayar ve dashboard anlatimi satilir.

#### Fiyat araligi
- 25000 - 150000 TL / kurulum

#### Yapilabilirlik
Yuksek. Erken asamada musteri urunden cok dogru kurulum satin alir.

#### Not
Bu, ilk gelir icin en saglam kanal olabilir.

### 3. Guvenlik posture review raporu

#### Tanim
Asylum'un output'lari kullanilarak aciklanabilir teknik posture review dokumani satilir.

#### Fiyat araligi
- 20000 - 100000 TL

#### Yapilabilirlik
Orta-yuksek. Urun henuz tam otomasyon satmiyorken raporlama ve triage degeri satabilir.

### 4. Demo-day / teknik proof workshop

#### Tanim
Ozellikle teknoloji firmalarina 1 gunluk canli kurulum ve security visibility workshop'u yapilir.

#### Fiyat araligi
- 10000 - 50000 TL

#### Yapilabilirlik
Orta. Lead generation icin iyi ama olceklenmesi zayif.

## 9.2 Orta duzey gelir kapilari (9-18 ay)

### 5. Yillik lisans

#### Tanim
Self-hosted urun lisansi, yillik abonelik ya da yillik yenilenen kullanim hakki olarak satilir.

#### Fiyat araligi
- KOBI: 120000 - 500000 TL / yil
- Orta olcek: 500000 - 1500000 TL / yil

#### Yapilabilirlik
Orta. Bunun icin kurulum ve desteklenebilirlik netlesmeli.

#### Gerekenler
- versiyonlama
- destek kanali
- dokumantasyon
- deployment runbook
- lisanslama modeli

### 6. Destek ve bakim paketi

#### Tanim
Yillik lisansin ustune e-posta/uzaktan destek, update guidance, issue triage, health-check eklenir.

#### Fiyat araligi
- lisansin %15 - %25'i

#### Yapilabilirlik
Yuksek. SaaS olmayan self-hosted urunlerde cok mantiklidir.

### 7. Premium hardening / tuning paketi

#### Tanim
Musteri ortamina ozel policy profile tuning, false positive tuning, log source duzeltme, dashboard ve rapor ayarlari.

#### Fiyat araligi
- 50000 - 300000 TL

#### Yapilabilirlik
Yuksek. Ozellikle ilk 10 musteride degerlidir.

### 8. MSSP/partner enablement

#### Tanim
Project Asylum'u bir guvenlik hizmet saglayicisinin kendi musterilerine sunmasi icin partner modeli.

#### Fiyat araligi
- partner lisansi + gelir paylasimi

#### Yapilabilirlik
Orta. Urun yeterince stabil olmadan erken olabilir.

## 9.3 Ileri duzey gelir kapilari (18-36 ay)

### 9. Moduler enterprise paketler

#### Ornek moduller
- advanced audit trail
- advanced trust/automation controls
- regulated environment pack
- SOC analytics pack
- premium reporting/export

#### Yapilabilirlik
Orta. Once cekirdek urun yeterince netlesmeli.

### 10. Dikey cozum paketleri

#### Ornek
- teknoloji firmalari icin baseline paket
- MSSP paketi
- regule kurum uyum odakli paket

#### Yapilabilirlik
Orta-yuksek. Dogru dikey secilirse guclu olabilir.

### 11. Kurumsal SLA ve incident advisory

#### Tanim
Ilave destek seviyesi, hizli cevap, versiyon gecis yardimi, denetim oncesi hazirlik.

#### Yapilabilirlik
Yuksek. Ancak operasyon kapasitesi ister.

### 12. Kamu ve kritik altyapi satislari

#### Tanim
Daha yuksek guven belgesi, formal procurement, belgelendirme ve test raporlari ile yapilan satis.

#### Yapilabilirlik
Dusuk-orta (erken donemde). Uzun vadede cok degerli ama giris bariyeri yuksek.

## 9.4 Gelir yol haritasi ozet tablosu

| Donem | Gelir kapisi | Yapilabilirlik | Tahmini kapanis suresi | On kosul |
|---|---|---|---|---|
| 0-6 ay | Paid pilot | Yuksek | 1-3 ay | Stabil demo + kurulum |
| 0-9 ay | Kurulum/onboarding | Yuksek | 2-8 hafta | Installer ve tanilama |
| 0-9 ay | Posture review raporu | Orta-yuksek | 2-6 hafta | Aciklanabilir output |
| 6-12 ay | Yillik lisans ilk versiyon | Orta | 2-6 ay | Dokumantasyon + destek |
| 9-18 ay | Destek/bakim | Yuksek | Lisansla birlikte | Support sureci |
| 9-18 ay | Tuning/professional services | Yuksek | 1-2 ay | Saha deneyimi |
| 12-24 ay | MSSP/partner | Orta | 3-9 ay | Stabil urun + partner modeli |
| 18-36 ay | Enterprise moduller | Orta | 4-12 ay | Urun segmentasyonu |
| 18-36 ay | Kamu/kritik altyapi | Dusuk-orta | 6-18 ay | Sertifikasyon ve referans |

---

## 10. Gelir projeksiyonu senaryolari

## 10.1 Temkinli senaryo

### Yil 1
- 2 paid pilot x 100000 TL = 200000 TL
- 3 kurulum/tuning isi x 50000 TL = 150000 TL
- 2 review raporu x 30000 TL = 60000 TL

#### Toplam
410000 TL

Bu senaryo Project Asylum'un kendini ispatlamasi icin yeterlidir ama buyume icin ek sermaye gerekebilir.

## 10.2 Gercekci senaryo

### Yil 1
- 3 paid pilot x 150000 TL = 450000 TL
- 2 yillik lisans x 250000 TL = 500000 TL
- destek/tuning/kurulum = 350000 TL

#### Toplam
1300000 TL

Bu seviye, cekirdek operasyonu donduren ama hala dikkatli harcanmasi gereken gelir seviyesidir.

## 10.3 Guclu senaryo

### Yil 2 civari
- 5 yillik lisans x 500000 TL = 2500000 TL
- destek/bakim = 500000 TL
- tuning/pro services = 600000 TL
- partner gelirleri = 400000 TL

#### Toplam
4000000 TL

Bu senaryo ancak urun desteklenebilirlik ve saha guveni kazandiginda gercekci olur.

---

## 11. Lisans, mevzuat ve uyum perspektifi

Bu bolumde ozellikle bir ayrim yapmak gerekir:

- **zorunlu yasal yukumlulukler**
- **sektorel/kurumsal satis icin fiilen gerekli belgeler**
- **guven arttirici ama zorunlu olmayan sertifikasyonlar**

Project Asylum bir siber guvenlik urunu oldugu icin "hicbir belge gerekmez" demek yanlistir. Ama "tek bir lisans alip satarsin" demek de yanlistir. Gereken sey hedef pazara, veri isleme modeline, deployment seklina ve musterinin regule olup olmadigina gore degisir.

## 11.1 Genel sonuc: tek bir evrensel urun lisansi yok

Turkiye'de yazilim urunu olarak satilan her siber guvenlik cozumunun once alinmasi gereken tek bir genel "siber guvenlik urunu satis lisansi" oldugunu gosteren resmi bir genel lisans rejimine ulasamadim. Buna karsin resmi kaynaklar; veri koruma, siber guvenlik, internet yayini/yer saglayici rolleri ve urun belgelendirme/certification alanlarinda parcali ama ciddi yukumlulukler ortaya koyuyor. Dolayisiyla dogru yaklasim sudur:

> Project Asylum icin mesele tek bir lisans degil; faaliyet modeline gore degisen bir **uyum ve guven paketi** kurmaktir.

## 11.2 Zorunluya yakin uyum basliklari

### A. KVKK uyumu

Project Asylum log, auth event, user/process bilgisi, IP adresi, cihaz ve kullanici iliskili kayitlar gibi kisisel veri veya kisiyle iliskilendirilebilir veri isleyebilir. Bu nedenle KVKK kapsam disi varsayilmamalidir.

Yapilmasi gerekenler:
- veri isleme envanteri,
- veri kategorileri ve isleme amaci matrisi,
- saklama-imha politikasi,
- erisim yetki matrisi,
- teknik/idari tedbirler,
- aydinlatma metinleri ve sozlesme eki veri maddeleri,
- gerekiyorsa veri isleyen / veri sorumlusu rollerinin sozlesmede ayrimi.

KVKK resmi kaynaklari veri sorumlularinin gerekli teknik ve idari tedbirleri almasi gerektigini, veri guvenligi rehberinin buna yon gosterdigini belirtiyor.

### B. VERBIS degerlendirmesi

VERBIS konusunda resmi cizgi su: veri sorumlulari icin sicile kayit yukumlulugu vardir; ancak herkes icin otomatik olarak degil, kapsam ve esikler dahilinde degerlendirilir. Bu nedenle Project Asylum'u gelistiren sirket kendi is modeli acisindan VERBIS yukumlulugunu muhasebe/hukuk ile netlestirmelidir.

Ozellikle su senaryolarda konu ciddilesir:
- sirket kendi pazarlama/satis/IK datalarini isliyorsa,
- destek portalinda musteri kullanici verisi tutuyorsa,
- telemetri/log/diagnostic dosyalarini kendi sisteminde depoluyorsa,
- bulut tabanli destek katmani kuruyorsa.

### C. 7545 sayili Siber Guvenlik Kanunu kapsam etkisi

Resmi Gazete'de yayimlanan 7545 sayili Siber Guvenlik Kanunu genis bir kapsama sahip. Kanunun kapsam maddesi; siber uzayda varlik gosteren, faaliyet yuruten, hizmet sunan kamu ve ozel aktorleri genis bicimde kapsiyor. Bu durum, Project Asylum'un faaliyet gosterecegi ekosistemin daha duzenlemeli bir zemine girdigini gosteriyor. Urunun kritik altyapi, kamu veya stratejik musterilere satisinda bu alan daha da onem kazanacak.

Bu nedenle gereken aksiyonlar:
- yeni ikincil duzenlemeleri takip etmek,
- urun/servis tanimlarini hukuken netlestirmek,
- loglama, raporlama, olay bildirim ve veri saklama sureclerini olgunlastirmak,
- sozlesmelere sorumluluk ve kullanim siniri maddeleri eklemek.

### D. 5651 etkisi (rol bazli)

Project Asylum'un kendisi dogrudan bir "yer saglayici" olmayabilir. Ancak urunle beraber portal, cloud update servisi, support portal, web panel veya online rapor saklama gibi bilesenler olusursa 5651 kapsamindaki rollerin dogup dogmadigi degerlendirilmelidir. Burada teknik urun mimarisi ile hukuki rol tanimi birlikte dusunulmelidir.

### E. Ticari sozlesme ve sorumluluk sinirlari

Siber guvenlik urunlerinde teknik risk kadar hukuki risk de vardir. Asagidaki dokumanlar erken donemde hazir olmalidir:
- lisans sozlesmesi,
- destek ve SLA sozlesmesi,
- veri isleyen/veri sorumlusu ekleri,
- PoC/pilot scope dokumani,
- sorumluluk siniri ve observe-only kapsami,
- otomatik remediation yoksa bunun acik beyanı,
- log/diagnostic dosya paylasim onayi.

## 11.3 Kurumsal satis icin fiilen gereken belgeler ve guven unsurlari

### A. Kod imzalama ve notarization

Bu teknik bir detay gibi gorunur ama fiilen satisa etki eder.

Project Asylum'un roadmap'inde zaten macOS code signing/notarization ve Windows code signing kritik release sertlestirme maddeleri arasinda. Ozellikle Windows tarafinda unsigned installer, pilot satisi bile baltalayabilir.

Bu nedenle:
- Windows code signing,
- macOS signing/notarization,
- release manifest ve hash disiplini,
- imzali artifact zinciri,
- installer provenance raporu

erken asamada gereklidir.

### B. SBOM ve ucuncu taraf lisans takibi

Project Asylum'un ticari lisans cizgisi dogru secilmis: MIT/Apache/BSD/ISC uyumlu bir yon ciziliyor. Bunun urun paketine donusmesi gerekir.

Gerekenler:
- dependency envanteri,
- SBOM,
- ucuncu taraf lisans tablosu,
- open source notices,
- release bazli bagimlilik review.

### C. Pentest ve guvenlik incelemesi

Siber guvenlik urunu satarken musterinin soracagi ilk seylerden biri su olur:

"Sizin urununuzun guvenligi nasil dogrulandi?"

Bu nedenle en azindan su katmanlar olmali:
- ic guvenlik checklist,
- dependency scan,
- temel threat model,
- dis pentest/light review,
- hardening guide.

## 11.4 Guven arttirici sertifikasyonlar

### A. TS ISO/IEC 27001

TSE resmi olarak TS ISO/IEC 27001 belgelendirmesi sundugunu belirtiyor. Bu belge Project Asylum'un urunu icin degil, sirketin bilgi guvenligi yonetim sistemi icin kritik olabilir. Erken asamada zorunlu degildir; ancak kurumsal satista ciddi guven unsuru yaratir.

### B. Common Criteria / Ortak Kriterler

TSE, Ortak Kriterler (TS EN ISO/IEC 15408) kapsaminda bilişim urun guvenligi belgelendirme hizmetleri sundugunu acikca belirtiyor. Bu, ozellikle kamu, kritik altyapi veya yuksek guven isteyen kurumlara satis dusunuluyorsa Project Asylum icin uzun vadede cok degerli olabilir.

Ancak gercekci olmak gerekirse:
- pahali,
- zaman alan,
- kapsam tanimi isteyen,
- urunun belli seviyede stabil olmasini gerektiren
bir surectir.

Yani bu belge giris asamasinda degil, ileri fazda dusunulmelidir.

### C. TSE/TURKAK akredite surecler ve denetim dostu dokumantasyon

Kurumsal satişta belge kadar surec de satilir. Asagidaki unsurlar sertifika olmasa da procurement gucunu artirir:
- secure development policy,
- release checklist,
- test evidence,
- incident response plan,
- support process,
- change management.

## 11.5 Hangi lisans/uyum basligi ne zaman alinmali?

| Baslik | Durum | Zamanlama | Not |
|---|---|---|---|
| Sirket kurulus/muhasebe | Zorunlu | Hemen | Ticari faaliyet icin |
| KVKK uyum paketi | Zorunluya yakin | Hemen | Veri modeline bagli |
| VERBIS degerlendirmesi | Duruma bagli ama onemli | Hemen | Esik ve role gore |
| Lisans/Sozlesme seti | Zorunluya yakin | Hemen | Pilot dahil |
| Windows code signing | Fiilen gerekli | 0-6 ay | Satis guveni icin |
| macOS notarization | Fiilen gerekli | 0-6 ay | Apple dagitimi icin |
| SBOM + OSS lisans dosyasi | Fiilen gerekli | 0-6 ay | Procurement ve guven |
| Pentest/light security review | Guclu tavsiye | 3-9 ay | Guven arttirir |
| ISO 27001 | Guclu tavsiye | 9-18 ay | Kurumsal guven |
| Common Criteria | Secici/ileri faz | 18+ ay | Kamu/critical sales icin |

---

## 12. Operasyonel yol haritasi

## 12.1 Ilk 90 gun

### Hedef
Pilot-ready temel paket

### Yapilacaklar
- test bilgisayari ve fiziksel test cihazlarini almak,
- Windows VM test planini bitirmek,
- Linux gercek cihaz testi yapmak,
- install-state/self-check/diagnostic akisini sabitlemek,
- ilk commercial dokumanlari yazmak,
- veri akisi ve KVKK mapping cikarmak,
- imzalama sureci arastirmasini baslatmak.

### Basari olcutleri
- 10+ tekrarli kurulum testi
- 1 gercek Windows cihazda tam install
- 1 gercek Linux cihazda tam install
- standart demo scripti ve standard pilot paketi

## 12.2 3-6 ay

### Hedef
Paid pilot satabilecek durum

### Yapilacaklar
- website ve urun anlatimi,
- pilot SoW/scope dokumani,
- support & diagnostics standardi,
- ilk pentest/light review,
- signed build pipeline,
- baseline pricing.

### Basari olcutleri
- 3 hedef musteri toplantisi
- 1-2 paid pilot
- release checklist'in oturmasi

## 12.3 6-12 ay

### Hedef
Ilk yillik lisans satilabilir durum

### Yapilacaklar
- deployment runbook,
- support package,
- policy/tuning paketleri,
- persistence olgunlastirma,
- dokumantasyon paketi,
- partner gorusmeleri.

### Basari olcutleri
- 2+ aktif kurulum
- 1+ yillik lisans
- false positive geri bildirim dongusunun kurulmasi

## 12.4 12-24 ay

### Hedef
Kurumsal guven ve orta olcekli gelir

### Yapilacaklar
- ISO 27001 hazirligi,
- premium support modeli,
- product packaging segmentation,
- regulated environment dokumantasyonu,
- dikey cozumler.

### Basari olcutleri
- tekrar eden gelir
- referans musteri
- denetim ve procurement sorularina hazir belge seti

## 12.5 24-36 ay

### Hedef
Kamu/critical infra/enterprise expansion

### Yapilacaklar
- ihtiyaca gore Common Criteria feasibility,
- kapsamli threat modeling,
- olgun procurement belgeleri,
- partner/kanal modeli,
- moduler enterprise urunler.

---

## 13. Personel ve yetkinlik ihtiyaci

## 13.1 Kurucu-asama minimum kadro

Ilk asamada tam zamanli buyuk ekip gerekmez. Ama roller gerekir.

### Zorunlu roller
- urun ve teknik liderlik
- backend/security engineering
- kurulum/test owner
- hukuk/muhasebe dis destek

### Part-time/dis kaynak roller
- tasarim ve sunum
- sozlesme/KVKK hukuku
- pentest/review
- marka ve kurumsal kimlik

## 13.2 Orta asama ekipleme

- 1 backend/full-stack engineer
- 1 security/research engineer
- 1 field engineer / customer success technical owner
- 1 yarim zamanli sales/BD destek

---

## 14. Risk matrisi

| Risk | Etki | Olasilik | Yonetim stratejisi |
|---|---|---|---|
| Windows/Linux kurulum sorunlari | Yuksek | Yuksek | Test lab + imzalama + tekrarli test |
| False positive fazlaligi | Yuksek | Orta-yuksek | Pilot tuning + explainability + dar scope |
| Erken otomasyon beklentisi | Yuksek | Orta | Observe-only pozisyonunu koru |
| Hukuki/veri uyumu eksigi | Yuksek | Orta | KVKK ve sozlesme paketini erken cikar |
| Gelirin sadece hizmete donmesi | Orta-yuksek | Yuksek | Hizmeti lisansa bagla |
| Sertifikasyon maliyetinin erken yuk bindirmesi | Orta | Orta | ISO/CC adimlarini geciktir |
| Procurement'da unsigned artifact guvensizligi | Yuksek | Yuksek | Signing/notarization'i erken al |

---

## 15. Stratejik kararlar: neyi simdi yap, neyi ertele

## 15.1 Simdi yap
- guclu test bilgisayari al
- gercek Windows test cihazi edin
- Linux fiziksel test kur
- signed build ve release disiplini olustur
- KVKK/veri akisi/sozlesme iskeletini hazirla
- pilot urun paketini tanimla
- fiyatlandirmayi baslat

## 15.2 6-12 ay icine koy
- yillik lisans modeli
- destek paketi
- deployment dokumani
- temel dis guvenlik incelemesi
- musteriye yonelik dokuman paketi

## 15.3 Ertele ama planla
- ileri otomasyon vaatleri
- buyuk cloud operasyonu
- pahali sertifikasyonlar
- kamu hedefli procurement hazirligi
- buyuk satis ekibi

---

## 16. Sonuc ve nihai tavsiye

Project Asylum teknik olarak anlamli ve ticari olarak umut verici bir siber guvenlik urunudur. Ancak onu degerli kilacak sey sadece algoritmik zeka ya da dashboard degildir. Asil deger su dortluden dogacaktir:

1. guvenilir kurulum,
2. aciklanabilir guvenlik gorunurlugu,
3. mevzuat ve sozlesme disiplini,
4. dogru sirayla acilan gelir kanallari.

Bu nedenle bugun icin en dogru hareket plani sudur:

### Faz 1: Uretilebilir guven
- test laboratuvari kur
- Windows/Linux gercek cihaz testlerini tamamla
- signed artifact surecini baslat
- observe-only pozisyonunu netlestir

### Faz 2: Satin alinabilir guven
- paid pilot sat
- kurulum ve tuning hizmetiyle ilk geliri al
- destek dokumani ve lisans sozlesmelerini netlestir

### Faz 3: Olceklenebilir guven
- yillik lisans modeline gec
- ISO 27001 ve procurement-ready paketleri kur
- partner ve enterprise modullerini ac

En kritik tek cümlelik tavsiye:

> Project Asylum icin ilk buyuk harcama pazarlama degil, **test laboratuvari + kurulum guvenilirligi + hukuki/uyum zemini** olmalidir.

Cunku siber guvenlik urunlerinde satis once reklama degil, once guvene dayanir.

---

## 17. Ek: 12 aylik ozet butce ve gelir gorunumu

| Baslik | Minimum TL | Gercekci TL |
|---|---:|---:|
| Test laboratuvari ve cihazlar | 79000 | 175000 |
| Urunlesme, signing, review | 9500 | 103000 |
| Hukuk, muhasebe, marka, temel kurumsallik | 40000 | 145000 |
| Pilot saha giderleri | 30000 | 120000 |
| Dokumantasyon / web / sunum | 10000 | 50000 |

### Ilk 12 ay toplam
- Minimum: 168500 TL
- Gercekci: 593000 TL

### Ilk 12 ay temkinli gelir hedefi
- 410000 TL

### Ilk 12 ay gercekci gelir hedefi
- 1300000 TL

Bu tabloya gore Project Asylum, disiplinli ilerlerse ilk 12 ayda kendini finanse etme sansina sahiptir. Ancak bunun yolu once urunu degil, **guveni urunlestirmekten** gecer.

---


