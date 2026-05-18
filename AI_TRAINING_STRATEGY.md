# AI Training Strategy

Project Asylum için ilk hedef sıfırdan model eğitmek değil, açıklanabilir bir güvenlik ajanı kurmaktır.

## Aşama 1

- Kurallı observation
- Risk skorlama
- Reasoning
- Critic
- Planning
- Task runs
- Decision

Bu aşamada eğitim yok, mimari zeka var.

## Aşama 2

Yerel model yardımı:

- log yorumlama
- hipotez çeşitlendirme
- açıklama kalitesi
- plan alternatifleri

Bu da yine local çalışmalıdır.

## Aşama 3

Kendi veri birikimimizle uzmanlaştırma:

- observation geçmişi
- risk geçmişi
- reasoning trace
- critic verdict
- blocker temizleme örnekleri
- false positive / false negative kayıtları

## Kural

Önce veri modeli ve operasyon hafızası doğru kurulur, eğitim sonra gelir.
