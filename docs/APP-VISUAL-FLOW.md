# MyZubster App Visual Flow

**Asset ID:** `MYZ-VIS-012`

**Class:** `DOCUMENTATION_VISUAL`

## How it works

`Real-world observation → App client → Gateway API contracts → review/verification → documented outcome`

The app is a React Native / Expo client. It exposes client flows for authentication, orders, QR/wallet-facing contracts and privacy experiments, while backend capabilities remain authoritative at the configured Gateway.

## Verification boundary

A client screen, QR request or wallet-facing API call does not prove external settlement. External settlement remains separate and must be independently verified. Likewise, starting Orbot does not by itself prove that all application traffic is routed through Tor; proxy behavior requires independent testing.

## Provenance

Derived on 2026-08-22 from the repository `README.md`, specifically its Status, Gateway contracts, Native build, Checks, Security and privacy, and Transparency sections. This document is explanatory documentation, not real-world evidence.