# ADR-014 - Controlled V2 Feature Waves

Date: 2026-08-02

## Context

The owner wants all important Chrome-extension capabilities treated as V2 rather than reserved for a hypothetical V3. Shipping every capability simultaneously would create migration, permission, UX, and rollback risk.

## Options

### A. One all-or-nothing public V2 release

- Benefit: Simple external story.
- Compromise: Unmanageable test matrix, permission shock, weak learning, and high rollback blast radius.

### B. One V2 architecture with controlled feature waves - selected

- Benefit: Everything remains V2 while decisions, migrations, and modules can be validated progressively.
- Compromise: Requires flags, compatibility discipline, and clear communication about V2 availability.

### C. Split major capabilities into future major versions

- Benefit: Smaller releases and easier marketing milestones.
- Compromise: Contradicts the owner's requested product framing and delays foundational coherence.

## Decision

Use B. Define all accepted capabilities in V2, maintain one V2 architecture/data contract, and expose modules through dogfood, beta, and staged production waves. Each implementation wave uses a separate reviewable `codex/v2-*` branch and writes a build record.

## Consequences

- Feature flags and kill switches are required.
- Data schemas must remain forward/backward compatible across the V2 rollout window.
- Store copy must state which V2 modules are generally available versus beta.
- No essential architectural decision is deferred to an assumed V3.

## Status

Accepted - the owner explicitly requested that all essential work remain V2 and that new builds use separate branches.
