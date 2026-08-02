# ADR-011 - Engineering Modernization

Date: 2026-08-02

## Context

The current dependency-free vanilla JavaScript architecture is compact and understandable. V2 introduces multiple state machines, schemas, storage adapters, surfaces, and optional integrations that need stronger contracts and automated verification.

## Options

### A. Continue global vanilla JavaScript without a build step

- Benefit: Smallest toolchain and migration.
- Compromise: Weak type safety, module isolation, testability, and refactoring confidence at V2 scale.

### B. Incremental TypeScript modules with a minimal MV3-safe build pipeline - recommended

- Benefit: Typed messages/schemas, testable domain packages, controlled bundles, incremental migration.
- Compromise: New dependencies, build/release tooling, source maps, and migration training.

### C. Full framework rewrite

- Benefit: Mature component and state ecosystem.
- Compromise: Highest rewrite and regression cost; runtime code changes before user value; dependency and bundle growth.

## Recommendation

Choose B. Introduce TypeScript and modules around new V2 domain/storage/message code, then migrate existing code only when touched. Keep UI rendering lightweight; select no UI framework unless a separate need is proven.

No dependency may be added until the owner accepts this ADR and reviews the proposed dependency list.

## Validation

- Spike one vertical slice: plan state machine, storage adapter, service-worker command, and side-panel read model.
- Compare bundle size, CSP output, test ergonomics, migration effort, and debugging.

## Status

Proposed.
