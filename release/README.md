# Project Asylum Release Notes

This folder contains release-facing installation metadata and packaging helpers for Project Asylum.

## Contents

- `install-manifest.json`
  Generated installation manifest from the setup flow.

- `VERSION.json`
  Release metadata for the current local build.

## Intended Packaging Direction

This release folder is the foundation for future packaging work, including:
- platform-specific installers,
- release versioning,
- deployment bundles,
- installation verification outputs.

## Safety

Release installation is currently limited to:
- environment preparation,
- platform detection,
- log-source discovery,
- observe-only onboarding.

No remediation or system mutation is enabled during installation.
