# Project Blueprint

Project Asylum şirket SOC ortamlarına kurulabilecek yerel bir güvenlik ajanı olarak tasarlanır.

## İlkeler

- local-first
- self-hosted
- API bağımsız
- açıklanabilir karar akışı
- audit edilebilir davranış
- kademeli otomasyon
- earned autonomy

## Ürün Yönü

Amaç:

- güvenlik sinyallerini toplamak
- riskleri açıklanabilir şekilde sıralamak
- blocker ve policy durumlarını görünür kılmak
- ileride dry-run remediation’a zemin hazırlamak

## Mevcut Omurga

- prompt analysis
- observation engine
- risk engine
- reasoning engine
- critic engine
- planning engine
- task runner
- decision engine
- persistent local execution store

## Sonraki Büyük Adımlar

- policy modülünü ayrıştırmak
- trust/confidence katmanı
- remediation dry-run katmanı
- daha güçlü collector modülleri
- kalıcı operasyon veritabanı
