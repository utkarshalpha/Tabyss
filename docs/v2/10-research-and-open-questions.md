# Research and Open Questions

## Purpose

These questions must be answered before Proposed decisions become Accepted implementation commitments.

## Product questions

1. Which current feature drives repeat use: popup, dashboard, Wrapped, reminders, or passive trust?
2. Do users primarily want awareness, focus execution, blocking, tab organization, or wellbeing?
3. Which outcome language feels useful rather than judgmental?
4. How many users will create a plan versus prefer automatic recommendations?
5. Do users understand “planned” versus “productive” more accurately?
6. Which intervention strength remains enabled after four weeks?
7. Does recovery framing improve acceptance versus limit-reached framing?
8. How much configuration is tolerable during onboarding?
9. Is optional new-tab replacement attractive or perceived as invasive?
10. Does tab-workspace value strengthen Tabyss or dilute its identity?

## Privacy and trust questions

1. Which permissions create the most install concern?
2. Do users understand domain versus full URL collection?
3. What data do users expect an ignore rule to cover?
4. Should local data be encrypted at rest using a user secret, accepting usability/recovery cost?
5. Would users enable optional aggregate product analytics if the exact event dictionary is visible?
6. Is encrypted backup valuable enough to justify an account/connection?
7. What share-card fields are considered safe?
8. How should sensitive sites be auto-suppressed without storing a sensitive-domain label centrally?

## Technical spikes

1. Dynamic content-script registration and optional host-permission UX.
2. DNR dynamic/session rule limits, precedence, recovery, and safe block page.
3. Side-panel behavior across supported Chrome versions and windows.
4. IndexedDB behavior in MV3 service workers under suspension/update.
5. Accurate multi-window focus and document-focus behavior for media beats.
6. Tab-group and session restoration fidelity.
7. Maximum practical local event retention under the storage quota.
8. Deterministic migration from existing aggregate maps.
9. Quiet-context detection that does not inspect sensitive page content.
10. Accessibility of injected overlays across hostile/extreme page styles.

## Research program

### Phase 1 - Current-product evidence

- Review store data, reviews, support messages, and voluntary feedback if available.
- Conduct 8-12 qualitative interviews across primary segments.
- Run current-product usability tests for install, dashboard, categorization, goals, Wrapped, export, and breaks.
- Identify trust and comprehension failures.

### Phase 2 - Concept tests

Test three concepts:

1. Private tracker evolved.
2. Strict focus/blocker.
3. Intentional browsing system.

Evaluate comprehension, differentiation, willingness to install, permission comfort, and expected frequency.

### Phase 3 - Prototype tests

- Outcome onboarding.
- Popup primary action.
- Side-panel focus session.
- Mindful pause/recovery.
- Space save/restore.
- Weekly review.

Use task completion, errors, time, comprehension, confidence, and qualitative trust.

### Phase 4 - Technical dogfood

- Event accuracy diary.
- False positive/negative correction log.
- CPU/storage profiling.
- Worker suspension and rule recovery.
- Migration rehearsal with cloned exports.

### Phase 5 - Closed beta

- Consent-based cohort.
- Weekly interviews and structured feedback.
- Guardrails: uninstall, permission revoke, data gaps, support burden, notification disablement, and false classification.

## Owner decisions required

1. Accept positioning as an intentional-browsing system?
2. Accept event storage migration to IndexedDB plus aggregates?
3. Accept a minimal TypeScript/build/test toolchain?
4. Which protection levels are enabled in the initial V2 public experience?
5. Should Focus Home be part of default onboarding or remain an advanced option?
6. Is optional aggregate product analytics permitted?
7. Are any connected features approved for V2, and which one has highest value?
8. Is lightweight Action Capture in scope, or integrations only?
9. What is the intended free/paid model, if any?
10. What team capacity and target release window exist?

## Evidence register to create

- Interview notes and synthesis.
- Usability test reports.
- Permission comprehension results.
- Technical spike reports.
- Baseline performance measurements.
- Migration sample outcomes.
- Closed-beta guardrails.

No research artifact should contain raw participant browsing history unless explicitly consented, minimized, securely stored, and scheduled for deletion.
