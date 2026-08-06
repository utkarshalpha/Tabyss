# ADR-023 - Simplify V2 Around Focus, Insights, and Saved Pages

Date: 2026-08-02

## Context

The completed Command Center placed Profiles, weekly outcome metrics, Plans,
Spaces, Later, and Recovery in front of the user at once. The interface was visually
consistent but required users to learn the product's internal architecture before
receiving value. In the owner's review, items 1-6 of the simplification audit were
confirmed as unnecessary: Profiles, manual checkpoints, Recovery navigation, the
side-panel metric strip, the reusable Plans library, and Spaces.

The owner explicitly kept the underlying “Later” job but asked for a direct name,
lower cognitive load, and stronger accessibility.

## Options

### A. Keep every feature and add onboarding

- Benefit: Preserves the broadest visible capability set.
- Compromise: Adds more explanation to an interface already burdened by concepts.

### B. Hide advanced areas behind progressive disclosure

- Benefit: Reduces first-view density while retaining their controls.
- Compromise: The product still asks users to understand low-frequency abstractions.

### C. One-purpose Saved Pages surface with compatibility retention - selected

- Benefit: One clear job, immediate value, lower maintenance surface, and a direct
  complement to the popup's Focus action and dashboard insights.
- Compromise: Existing Plan, Space, and checkpoint records no longer have a first-
  class editor, although they remain locally preserved and portable in backups.

## Decision

- Replace the multi-tab Command Center with one side-panel surface named **Saved
  pages**.
- Remove Profiles, Plans, Spaces, weekly outcome counters, manual checkpoints,
  duplicate cleanup, and Recovery from user-facing side-panel navigation.
- Rename Return Capsules/Later to Saved pages in all current user-facing language.
- Show saved records across every former Profile in one list so hiding Profiles does
  not hide user data.
- Keep only Save current page, optional note, favicon/title/domain/date, Open,
  Mark completed/Save again, Delete, and Saved/Completed/All filters.
- Use native buttons and form labels, `aria-pressed` filter state, live status/count
  announcements, busy state, keyboard focus, and minimum 38px filter targets.
- Stop Plan schedule notifications and drift-guard activation. Preserve legacy
  product records in the validated local schema and backup format; do not perform a
  destructive migration.
- Keep the `sidePanel` permission and `Alt+Shift+T`, now opening Saved pages.
- Keep quick focus in the popup and browsing reflection in the dashboard.

## Consequences

- The primary product becomes understandable as three connected jobs: understand
  browsing, focus on one thing, and save a page for later.
- Previously created Plan/Space/checkpoint records remain local and exportable but
  are dormant. Plan schedules do not fire and guards are not injected.
- Automatic data validation, local-only storage, Incognito exclusion, backup safety,
  and zero-network constraints remain unchanged.
- ADR-021 remains historical architecture evidence but its Command Center, Plans,
  Profiles, Spaces, schedule, guard, and recovery-surface decisions are superseded.

## Validation

- Contract-test that the retired controls and labels are absent from side-panel HTML.
- Exercise save, filter, open, complete, reopen, delete, empty, error, and favicon-
  fallback states in the browser adapter and unpacked Chrome.
- Verify filter semantics, labelled controls, live feedback, narrow layout, dark/light
  themes, keyboard access, contrast, and 200% zoom.
- Run the complete syntax, security, data, documentation, and deterministic package
  gate.

## Status

Accepted - the owner approved removal of audit items 1-6 and retained Later as the
simplified Saved pages feature.
