# Cognitive Architecture

Project Asylum klasik bir scanner değil, bilişsel akış taşıyan bir güvenlik ajanı olarak tasarlanır.

## Çekirdek Akış

1. Observation
2. Risk
3. Reasoning
4. Critic
5. Planning
6. Task Runs
7. Decision
8. Persistence

## Observation

Sistem yerel sinyal toplar:

- process
- network
- configuration
- runtime
- policy

## Reasoning

Reasoning katmanı şunları üretir:

- belief
- hypotheses
- priority hypothesis
- next inference

## Critic

Critic katmanı:

- risk bayrakları
- verdict
- policy eşleşmeleri
- recommended action

üretir.

## Planning

Planning katmanı:

- objective
- steps
- taskType
- commandHint
- outputs

taşır.

## Durum Semantiği

Karar statüleri:

- `completed`
- `needs-triage`
- `awaiting-approval`

Bu ayrım SOC operasyonlarına uygun görünürlük sağlar.

## Trust Katmanı

İleride decision üstüne ayrı bir trust/autonomy katmanı eklenecektir.

Bu katman:

- confidence score
- action trust
- environment trust
- approval eligibility

gibi alanları taşıyacak ve otomatik aksiyon seviyesini belirleyecektir.

Detay tasarım:

- `/Users/bariskockar/Desktop/bilet-app/project asylum/TRUST_AND_AUTONOMY_MODEL.md`
