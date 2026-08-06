# ADR-008 - Connected Capability Boundary

Date: 2026-08-02

## Context

The owner permits discussion of connected capabilities but V2 currently concerns the Chrome extension. Connections could include task/calendar integrations, encrypted backup/sync, or accountability.

## Options

### A. No connections

- Benefit: Preserves absolute zero-network architecture.
- Compromise: No recovery, handoff, or accountability beyond the device.

### B. User-selected integrations only

- Benefit: Concrete value with narrow data flow.
- Compromise: Multiple vendors/OAuth scopes and support burden.

### C. Tabyss account platform for sync/accountability

- Benefit: Full continuity and social possibilities.
- Compromise: Highest backend, security, privacy, legal, and operational scope.

## Recommendation

Do not bundle all connections into one decision. Approve each adapter/capability independently. Prioritize the smallest payload that closes a core loop:

1. Task/calendar handoff.
2. Encrypted backup only if user demand validates it.
3. Accountability only after sharing/privacy research.

## Required contract

- Explicit enable/disable.
- Payload preview.
- Minimal scopes.
- Local fallback.
- Token isolation.
- Health and failure UX.
- Delete/disconnect behavior.
- Separate policy/ADR.

## Status

Proposed.
