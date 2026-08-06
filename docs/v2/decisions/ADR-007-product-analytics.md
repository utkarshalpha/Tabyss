# ADR-007 - Product Analytics Model

Date: 2026-08-02

## Context

Zero telemetry preserves simplicity but prevents centralized activation, retention, and feature-outcome measurement. Browsing history must not become analytics payload.

## Options

### A. No centralized product analytics

- Benefit: Strongest privacy and simplest claim.
- Compromise: No product funnels/cohort retention; slower evidence gathering.

### B. Optional first-party coarse event analytics - recommended for evaluation

- Benefit: Can measure activation/outcomes while excluding content and domains.
- Compromise: Introduces network service, consent, identifiers, retention, and policy complexity.

### C. Third-party analytics SDK enabled by default

- Benefit: Fast implementation and tooling.
- Compromise: Weakest trust/control and vendor exposure; inconsistent with positioning.

## Recommendation

Evaluate B through a complete event dictionary, consent prototype, threat model, cost estimate, and user research. If not accepted, explicitly adopt A and remove centralized retention claims.

## Non-negotiable constraints for B

- First-party endpoint.
- Explicit opt-in separate from diagnostics/connections.
- No domain, URL, page title/text, plan/task text, exact timeline, or contact identity.
- Local personal analytics remains complete when disabled.
- Retention limit, rotating identifier, deletion, data receipt, and published schema.

## Status

Proposed; analytics remains disabled until Accepted.
