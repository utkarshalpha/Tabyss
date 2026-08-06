# ADR-002 - Local-first Core

Date: 2026-08-02

## Context

Tabyss currently has no account, backend, telemetry SDK, or network request. Activity and settings are stored locally. Connected ideas must not silently replace that differentiator.

## Options

### A. Mandatory account and cloud history

- Benefit: Simple sync, recovery, and centralized analytics.
- Compromise: Highest trust and security cost; contradicts current architecture.

### B. Local-first core with separately enabled connections - selected

- Benefit: Preserves trust and offline utility; connection can be scoped per feature.
- Compromise: More complex dual-mode UX and engineering.

### C. Permanently local with no integration capability

- Benefit: Strongest simplicity and verification.
- Compromise: Prevents optional backup, task/calendar handoff, or accountability value.

## Decision

Core tracking, planning, focus, blocking, Spaces, insights, wellbeing, export, and deletion work locally. Any connected feature requires explicit enablement, payload disclosure, disconnection, and local fallback.

## Consequences

- No core screen may require login.
- Local mode is not labeled a limited trial.
- Network code must be isolated and absent/inactive when no connection is enabled.
- Privacy copy distinguishes personal analytics, product analytics, diagnostics, and integrations.

## Status

Accepted - consistent with the existing product promise and the owner's scope clarification.
