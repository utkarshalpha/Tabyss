# V2 Master Checklist

This is the step-by-step control list for taking V2 from product definition to a production Chrome Web Store release. A checked feature is not complete unless its linked product, UX, data, security, testing, and operational work is also complete.

## 1. Owner decision gate

- [ ] Accept or reject ADR-003 product positioning.
- [ ] Accept or reject ADR-004 extension surfaces.
- [ ] Accept or reject ADR-005 event/storage model.
- [ ] Accept or reject ADR-006 blocking mechanism.
- [ ] Accept or reject ADR-007 product analytics.
- [ ] Decide each connected capability separately under ADR-008.
- [ ] Accept or reject ADR-009 task capture scope.
- [ ] Accept or reject ADR-010 social/family boundary.
- [ ] Accept or reject ADR-011 engineering modernization.
- [ ] Accept or reject ADR-012 permission model.
- [ ] Accept or reject ADR-013 scoring evolution.
- [x] Accept ADR-014 controlled V2 feature waves and separate build branches.
- [ ] Record target users, business model, team capacity, and release constraint.

## 2. Evidence gate

- [ ] Current feature usage evidence gathered where available.
- [ ] Current usability problems observed directly.
- [ ] 8-12 target-user interviews completed.
- [ ] Tracker versus blocker versus intentional-system concept test completed.
- [ ] Permission/data-receipt comprehension tested.
- [ ] Popup/side-panel prototype tested.
- [ ] Mindful pause/recovery prototype tested.
- [ ] Space save/restore prototype tested.
- [ ] North Star definition understood by target users.
- [ ] Technical spikes completed and written up.

## 3. Foundation gate

- [x] V2 schema registry established for the final local product document, focus
      outcomes, aggregate storage metadata, and portable backup format.
- [ ] Current export samples collected and anonymized for migration tests.
- [ ] Pre-migration backup and rollback implemented.
- [x] Incognito exclusion fixed.
- [x] Ignore-domain boundary behavior fixed.
- [x] Import validation/staging implemented with a pre-import safety backup.
- [x] Notification privacy defaults implemented.
- [ ] Typed message contract established.
- [x] Storage access restricted appropriately.
- [x] CI and reproducible package established locally; hosted run awaits push.
- [x] Abyss & Ember tokens, System/Light/Dark controls, rounded shell, and
      accessibility foundation established under ADR-026; full unpacked-extension
      assistive-technology and visual matrix remains a release gate.

## 4. Intentional core gate

- [ ] Outcome onboarding.
- [ ] Calibration/sparse-data flow.
- [x] Profiles retired from the active surface under ADR-023; legacy records preserved.
- [x] Quick intention.
- [x] Plans and local schedules retired; schedule prompts disabled.
- [ ] Timer, stopwatch, Pomodoro, and flow execution.
- [x] Action popup.
- [x] One-purpose Saved pages side panel.
- [x] Intent-aligned timer/stopwatch session model.
- [x] Completion and abandonment check-out.
- [ ] Empty, denied, paused, and recovery states (implemented for this slice;
      unpacked-extension restart/suspension/accessibility QA remains).

## 5. Guard/control gate

- [x] Plan protection ladder retired; guard activation disabled.
- [ ] DNR rule generation and reconciliation.
- [ ] Safe block page and permanent recovery route.
- [x] Mindful Plan pause retired from the active product.
- [ ] Re-intervention.
- [x] Return-to-plan recovery and cooldown UI retired with Plans.
- [ ] Permission grant/revoke behavior.
- [ ] Supported-site control fail-open tests.

## 6. Spaces/capture gate

- [x] Automatic checkpoints before supported bulk mutations.
- [x] Persisted checkpoint recovery for interrupted/reopened extension state.
- [x] Spaces retired from the active surface; legacy records preserved.
- [ ] Tab group preservation.
- [x] Duplicate cleanup, tab parking, and manual recovery UI retired.
- [x] Local explicit capture simplified and renamed to Saved pages.
- [x] Saved pages keyboard shortcut retained as `Alt+Shift+T`.
- [ ] Optional integration payload preview and fallback, if accepted.

## 7. Insight/wellbeing gate

- [ ] Today timeline.
- [x] Local guard shown/returned/continued/saved recovery outcomes; a detailed
      planned-versus-unplanned time timeline is not claimed.
- [ ] Explainable V2 score.
- [ ] Versioned historical score treatment.
- [ ] Weekly review.
- [ ] One-action recommendation.
- [ ] Personal experiment flow.
- [ ] Wrapped/persona integration.
- [ ] Sustainable-work guardrails.
- [ ] One shared budget across all legacy modules; scheduled Plans have a bounded
      daily budget now.
- [ ] Accessible chart alternatives.

## 8. Security/privacy gate

- [x] Final local V2 threat model and residual compromises recorded.
- [x] Passive-domain versus explicit URL/title capture boundaries enforced.
- [x] `sidePanel` is the only V2 permission addition; broader optional permissions
      and DNR were rejected for this build.
- [ ] Import/message/rule fuzzing complete.
- [ ] Content-script hostile-page testing complete.
- [ ] Share/export redaction verified.
- [ ] Delete-by-site/date/range/all verified.
- [ ] Optional connected authentication/key/deletion review complete, if applicable.
- [ ] Privacy policy and store disclosure match implementation.
- [ ] Security contact and incident playbook ready.

## 9. Quality gate

- [x] Unit and worker-integration suites passing for implemented Waves 0–1A.
- [ ] Extension E2E suite passing.
- [ ] Worker suspension/update/restart scenarios passing.
- [ ] Migration and rollback matrix passing.
- [ ] Multi-window and large-tab scenarios passing.
- [ ] System/forced-Light/forced-Dark/high-contrast/reduced-motion visual QA passing.
- [ ] Keyboard/screen-reader/200% zoom QA passing.
- [ ] CPU, memory, page-load, popup, and dashboard budgets passing.
- [ ] Storage near-quota and corruption recovery passing.
- [ ] Chrome Web Store policy review complete.

## 10. Release gate

- [ ] Dogfood exit criteria met.
- [ ] Closed-beta exit criteria met.
- [ ] Known issues documented.
- [ ] Support/diagnostics flow verified.
- [ ] Feature flags and kill switches tested.
- [ ] Store listing and screenshots updated.
- [ ] Changelog and user migration explanation ready.
- [ ] Canary thresholds and rollback owner defined.
- [ ] Staged rollout monitored.
- [ ] Post-release review scheduled.

## Completion rule

V2 is not complete because all checkboxes exist. It is complete when enabled modules deliver the end-to-end plan, focus, recover, reflect loop reliably, and every disabled/denied/offline path remains truthful and usable.
