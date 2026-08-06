# ADR-019 - Quick-intention and Focus-session State

Date: 2026-08-02

## Context

Wave 1 needs the first complete plan-focus-reflect loop. Chrome extension service workers are intentionally short-lived, alarms may be delayed, the machine can sleep, and `chrome.storage.session` is cleared on browser restart/update. A timer based on worker memory or periodic ticks would therefore be inaccurate and fragile.

ADR-004 (the final surface system) and ADR-005 (the detailed browsing event store) remain Proposed. This slice must create user value without silently accepting those broader choices.

Official Chrome grounding used for this decision:

- [Extension service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) - workers can terminate after inactivity, so critical state must be persisted rather than kept in globals.
- [Alarms API](https://developer.chrome.com/docs/extensions/reference/api/alarms) - alarms may be delayed and should be checked/recreated when the worker starts.
- [Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage) - local storage is durable across browsing-data clearing, while session storage is memory-backed and cleared on restart/update.

## Options

### A. Keep the timer in popup memory

- Benefit: Very small implementation.
- Compromise: Closing the popup ends control; worker/browser restart loses truth.

### B. Persist a timestamp-derived state machine and bounded outcome records in local extension storage - selected

- Benefit: Reliable across popup/worker/browser lifecycle, low write frequency, atomic with existing storage controls, exportable, and compatible with either future ADR-005 choice.
- Compromise: Focus outcomes are a bounded local materialized record rather than the final IndexedDB event architecture.

### C. Accept ADR-005 and build the complete IndexedDB event/materialization system first

- Benefit: Establishes the final detailed data foundation immediately.
- Compromise: Delays user value and combines a storage migration/rebuild project with the first session UX.

## Decision

- Store one critical `focusActive` record in trusted `chrome.storage.local` so browser restart can recover it.
- Store bounded `focusSessions` outcome records in `chrome.storage.local`; prune them with retention and make them backup format 3 data.
- Model `running`, `paused`, and `review` states. Completion and abandonment create immutable outcome records; timer expiry enters review instead of claiming success.
- Derive elapsed/remaining time from timestamps and accumulated running segments. Never write once per second and never keep the worker alive for a visual countdown.
- Create one `focus-end` alarm for a running timer, recreate/reconcile it whenever a fresh worker is evaluated, and treat it as a wake-up hint rather than the source of truth.
- Pause, resume, extend, complete, abandon, alarm expiry, reset-today, retention, import, clear, and restart reconciliation all use the existing storage mutex.
- Limit intentions to 160 characters, success definitions/notes to 240, timer duration to 5-240 minutes, extensions to 1-120 minutes, and stopwatch running time to a 12-hour safety review.
- The popup provides creation/control/check-out; the dashboard provides per-day reflection. This does not settle the future side-panel/new-tab decision in ADR-004.

## Consequences

- A popup can close and reopen without losing the session.
- Sleep and delayed alarms cannot inflate a timer; wall-clock timestamps determine the review transition.
- A session that reaches its duration is not marked completed until the user checks out.
- Later ADR-005 adoption must migrate focus outcomes losslessly or continue treating them as a compact materialized view.
- Backup format 2 remains readable; format 3 adds `focusSessions`.

## Validation

- Pure state-machine tests cover start, pause, resume, extend, timer review, stopwatch safety review, complete, abandon, invalid transitions, and import validation.
- Worker tests cover alarm reconciliation, serialized mutations, reset/retention/export behavior, import blocking, and restart reconstruction with fake Chrome APIs.
- Local browser smoke covers popup empty/running/paused/checkout/completed states and dashboard reflection. Unpacked-extension worker restart, review notification, keyboard/screen-reader, reduced-motion, and 200% zoom remain release gates.

## Status

Accepted - selected and implemented under the owner's delegated V2 product/build decision authority.
