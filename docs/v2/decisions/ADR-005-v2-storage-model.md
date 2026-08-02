# ADR-005 - V2 Event and Storage Model

Date: 2026-08-02

## Context

Current date-keyed aggregates support charts but cannot reconstruct an accurate timeline, intent alignment, intervention outcome, or deterministic rebuild.

## Options

### A. Continue aggregate maps in `chrome.storage.local`

- Benefit: Small migration.
- Compromise: Weak timelines, growing whole-object writes, limited recovery.

### B. IndexedDB append-oriented events plus local materialized aggregates - recommended

- Benefit: Accurate sessions, indexed queries, rebuilds, smaller atomic records.
- Compromise: More complex transactions, migration, and compaction.

### C. Store only detailed events

- Benefit: Single source of truth.
- Compromise: Slower common surfaces and higher storage/query cost.

## Recommendation

Use B: events/outcomes/Space checkpoints in IndexedDB; settings and compact materialized views in `chrome.storage.local`; ephemeral active state in `chrome.storage.session`.

Historical V1 data remains aggregate-only and is labeled accordingly.

## Validation

- Prototype 365-day typical and worst-case stores.
- Simulate MV3 suspension, update, corruption, compaction, migration, and rebuild.

## Status

Proposed.
