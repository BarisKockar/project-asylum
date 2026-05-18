# Project Asylum

Project Asylum is a local-first, self-hosted security intelligence platform designed to help organizations observe, triage, and explain security risk without relying on third-party inference APIs.

The project is built around an explainable agent pipeline:

```text
prompt -> observation -> risk -> reasoning -> critic -> policy -> trust -> planning -> task runs -> decision
```

## Product Direction

Project Asylum is being developed as a deployable security operations backbone for organizations that need:
- self-hosted operation,
- local data ownership,
- explainable security decisions,
- policy-aware triage,
- gradual trust-based autonomy.

The system is intentionally designed so that installation and first boot operate in **observe-only** mode. During setup, the platform detects environment signals and candidate log sources, but does not apply remediation or perform risky system mutations.

## Current Technical Scope

Implemented core capabilities:
- prompt analysis and execution pipeline,
- observation engine for process, network, config, runtime and platform context,
- risk scoring and policy-aware critic layer,
- reasoning and hypothesis generation,
- trust/confidence model with environment and action trend history,
- persistent execution history,
- platform profile detection for Linux, macOS and Windows,
- installer bootstrap, doctor and post-install safety checks,
- backend test suite covering agent, trust, policy and installation flows.

## Installation

Quick start:

```bash
npm install
npm run install:setup
npm run install:bootstrap
npm run install:doctor
npm run install:postcheck
npm test
npm run demo:scenarios
npm run dev
```

Customer-facing demo scenarios:
- `npm run demo:scenarios`
- UI üzerinden tek tikla:
  - Brute Force Gozlemi
  - Acik Port Yuzeyi
  - Kritik Dikkat Ozeti

Detailed instructions:
- [INSTALLATION.md](/Users/bariskockar/Desktop/bilet-app/project%20asylum/INSTALLATION.md)

## Release Surface

Release-facing assets:
- [release/install-manifest.json](/Users/bariskockar/Desktop/bilet-app/project%20asylum/release/install-manifest.json)
- [release/README.md](/Users/bariskockar/Desktop/bilet-app/project%20asylum/release/README.md)
- [release/VERSION.json](/Users/bariskockar/Desktop/bilet-app/project%20asylum/release/VERSION.json)
- [scripts/install.sh](/Users/bariskockar/Desktop/bilet-app/project%20asylum/scripts/install.sh)
- [scripts/install.ps1](/Users/bariskockar/Desktop/bilet-app/project%20asylum/scripts/install.ps1)

## Safety Model

Project Asylum does **not** enable automatic remediation during installation.

Current installation guarantees:
- `installationMode = observe-only`
- `safeByDefault = true`
- `remediationEnabled = false`

## Documentation

- [PROJECT_BLUEPRINT.md](/Users/bariskockar/Desktop/bilet-app/project%20asylum/PROJECT_BLUEPRINT.md)
- [COGNITIVE_ARCHITECTURE.md](/Users/bariskockar/Desktop/bilet-app/project%20asylum/COGNITIVE_ARCHITECTURE.md)
- [TRUST_AND_AUTONOMY_MODEL.md](/Users/bariskockar/Desktop/bilet-app/project%20asylum/TRUST_AND_AUTONOMY_MODEL.md)
- [AI_TRAINING_STRATEGY.md](/Users/bariskockar/Desktop/bilet-app/project%20asylum/AI_TRAINING_STRATEGY.md)

## Status

The project currently has a working backend-oriented prototype with installation scaffolding and automated tests.

Validation status:
- `npm test` currently passes
- installation bootstrap, doctor and post-install checks are covered by tests
- trust trend summaries and policy-aware decisions are covered by tests
