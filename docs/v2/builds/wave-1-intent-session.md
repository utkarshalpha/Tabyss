# Wave 1A Build Record - Intentional Session Vertical Slice

Date: 2026-08-02

Branch: `codex/v2-wave1-intent-session`

Status: Implemented and locally verified; not merged or pushed; full unpacked-extension release gates remain.

## Objective and user value

Deliver the first complete local plan-focus-reflect loop without waiting for every
broader V2 surface and storage decision. A user can state what matters, run a
restart-safe timed or open-ended session, pause/extend it, honestly check out, and
review the result by day. This changes Tabyss from passive judgment after browsing
to an intentional action before browsing.

This is a coherent Wave 1 vertical slice, not a claim that all Wave 1 items such as
profiles, recurring plans, Pomodoro/flow cycles, side panel, or full timeline are done.

## Decisions and Prompt-Pack trace

- [ADR-019](../decisions/ADR-019-intent-session-state.md) - accepted timestamp-derived focus state and bounded outcome model.
- [ADR-014](../decisions/ADR-014-v2-feature-waves.md) - separate stacked implementation branch.
- [ADR-002](../decisions/ADR-002-local-first-core.md) - no network, account, telemetry, or remote dependency.
- The execution decision and compromises are recorded in ADR-019 and this build
  record.
- ADR-004 side-panel surfaces and ADR-005 final event storage remain Proposed; this
  branch does not silently accept them.

## End-to-end behavior

1. The popup asks “What matters now?” before passive analytics.
2. The user enters an intention, optional definition of done, and a 25/50/90-minute
   timer or open-ended mode. The worker validates the wider supported 5–240-minute contract.
3. A running session shows elapsed/remaining time and pause, extend, and checkout controls.
4. Closing the popup, suspending the worker, or restarting the browser does not
   erase the session. Persisted timestamps are authoritative.
5. Timer expiry or the 12-hour open-ended safety cap enters Review. It never invents completion.
6. Checkout records Completed or End unfinished, optional allowlisted reason, and optional note.
7. The dashboard reflects active and historical chosen sessions separately from passive Focus Score.

## Data, migration, backup, and lifecycle

- Application schema is 2; install/update metadata migrates forward without deleting V1 data.
- One validated `focusActive` recovery record is stored in trusted `chrome.storage.local`.
- Up to 2,000 validated `focusSessions` outcomes are retained, additionally governed by the user's retention window.
- Backup format 3 adds `focusSessions`; format 2 and legacy backups remain readable.
- `focusActive` is a device-runtime recovery record, not a portable outcome. Export
  contains completed/abandoned history; checkout makes the current session portable.
- Export is generated inside the serialized worker after a flush, so popup/dashboard
  exports cannot capture a torn tracking write.
- Restore is refused while a valid focus session is active. Reset today, retention,
  clear all, and import have explicit focus behavior under the existing storage mutex.
- A single `focus-end` alarm is rebuilt on fresh worker evaluation. It only wakes the
  worker; timestamps decide remaining time and review.

## Privacy, permission, and threat-boundary impact

- New local user-entered data: intention, optional success definition, outcome,
  allowlisted abandonment reason, and optional note.
- No full URL, title, page text, form input, Incognito activity, identity, or remote analytics is added.
- No permission, host scope, dependency, network primitive, server, account, or remote code is added.
- Focus text and imported records are length/type/range validated; history IDs are
  unique; runtime actions remain restricted to trusted extension pages.
- Dashboard and popup render user text with `textContent`, not HTML injection.
- Product analytics remains local: the outcome records can calculate intentional
  days/completion for the proposed North Star, but nothing is transmitted.

## Main files

- State/data contract: `common.js`, `background.js`.
- Action and reflection UX: `popup.html`, `popup.js`, `dashboard.html`, `dashboard.js`, `styles.css`.
- Consistent export/restore UX: `options.html`, `options.js`.
- Tests/harness: `tests/focus.test.js`, `tests/background.test.js`, `tests/common.test.js`, `tests/chrome-mock.js`, `tests/ui-server.js`.
- Product/release record: `README.md`, `PRD.md`, `PRIVACY.md`, `CHANGELOG.md`,
  `QA_CHECKLIST.md`, the V2 catalog/system/checklist, ADR-019, and this record.

## Evidence

- JavaScript syntax: passing for runtime and test files.
- Node unit/policy/worker-integration/UI-contract tests: 33/33 passing before final packaging verification.
- Pure session coverage: creation, timestamp timing, pause/resume, review/extend,
  complete/abandon, invalid transitions/reasons/durations, 12-hour safety cap, and import schema.
- Worker coverage: active persistence, alarm scheduling/reconciliation, restart read,
  active-session restore rejection, completion/export, retention, reset-today, and
  corrupt-history no-overwrite behavior.
- Local in-app browser smoke: empty → running → paused → checkout → completed;
  dashboard seeded-outcome reflection; no console warnings/errors.
- Browser smoke found and fixed a hidden-form/flex CSS conflict before this record was completed.
- Complete `verify.ps1`: passing (syntax, 33 tests, whitespace, V2 links,
  exact package contract, and two byte-identical builds).
- Deterministic packaged artifact at verification time: 16 runtime files,
  approximately 79.8 KB, SHA-256 `651f9f9e5f26205ab2a7ab747f14bf54d8526ec6f880cbbfbb5876dd91d7a2d7`.

The authoritative review hash is always the value printed by `verify.ps1` at the
reviewed commit; documentation-only edits do not enter the 16-file runtime package.

## Known limitations and remaining gates

- Browser automation cannot control `chrome://extensions`; load-unpacked, real MV3
  worker suspension/restart/update, browser restart, real alarms/notifications,
  actual download/import, and storage inspection remain manual release gates.
- Keyboard-only, screen-reader, reduced-motion, high-contrast, 200% zoom, and explicit
  performance budgets remain manual/unimplemented automation gates.
- Storage-near-quota and corrupted-active-record browser tests remain outstanding;
  corrupt histories fail closed in the worker and automated schema tests cover hostile imports.
- The popup offers fixed 25/50/90-minute choices even though the worker contract accepts
  5–240 minutes; custom durations, Pomodoro, flow cycles, plans, and profiles remain deferred.
- No DNR blocking, protection ladder, Spaces, sync, friends/family comparison, or
  connected integration is part of this trust-preserving slice.
- Hosted CI has not run because no push was authorized.

## Rollback and recovery

- Revert this branch commit to remove the Wave 1 UI/runtime. Existing V1 aggregate data is untouched.
- Before rollback, export format 3 if users have focus outcomes. Older code will ignore
  the unknown `focusSessions` section; rolling forward restores full visibility.
- `focusActive` is an additive key; older runtime ignores it. A forward migration can
  recover it as long as extension storage was not cleared.
- Do not roll back by clearing storage. The normal branch/commit revert is non-destructive.
