# ADR-020 - Calm Optimistic Design System

Date: 2026-08-02

## Context

Tabyss has a recognizable violet-to-sunrise hourglass and a trusted local tracking
engine, but its surfaces were assembled feature-by-feature. The popup had become a
small scrolling dashboard with several equally weighted sections, mixed component
geometry, and an intention action competing with passive statistics. V2 needs a
coherent visual and interaction language that feels positive without becoming
childish, manipulative, or visually noisy.

The owner approved a Calm Optimistic direction and asked that it remain related to
the current icon. This decision changes presentation and information hierarchy; it
does not authorize a framework, dependency, permission, network path, schema, or
tracking-behavior change.

## Options

### A. Cosmetic reskin

- Benefit: Lowest implementation cost and visual regression risk.
- Compromise: Preserves the crowded popup hierarchy and inconsistent components.

### B. Coherent design system and presentation rebuild over the trusted engine - selected

- Benefit: Establishes reusable tokens, accessible states, consistent geometry, an
  action-first popup, and one recognizable brand across extension surfaces.
- Compromise: Requires visual QA across every existing surface and careful
  preservation of runtime IDs and behavior.

### C. Framework-led full UI and runtime rewrite

- Benefit: Could establish a modern component toolchain in one pass.
- Compromise: Couples design work to ADR-011, adds dependency and migration risk,
  and needlessly replaces hardened local tracking behavior.

## Decision

- Use the Calm Optimistic language: warm neutral canvases, deep plum text, accessible
  violet actions, and mint/amber/coral/sky semantic feedback.
- Evolve the current white hourglass on its violet-to-sunrise rounded-square field.
  The mark must remain recognizable at 16, 48, and 128 pixels.
- Use system fonts and local assets only. Do not add a remote font or dependency.
- Separate semantic state colors from data-category colors so success, warning, and
  risk meanings do not change with chart categories.
- Standardize geometry: 10px controls, 12px buttons, 16px cards, 24px hero surfaces,
  and pill geometry only for compact states/chips.
- Make the popup action-first: one intention/focus action, a compact Today snapshot,
  and progressive disclosure for detailed analytics and controls.
- Use friendly, nonjudgmental language. A drift, unfinished session, or sparse day is
  information rather than failure.
- Preserve light and dark modes; require keyboard focus, screen-reader names, reduced
  motion, high-contrast/forced-colors resilience, and usable 200% zoom.
- Preserve the current vanilla HTML/CSS/JavaScript architecture and all trusted data,
  storage, message, permission, and privacy boundaries.

## Consequences

- Existing surfaces can migrate incrementally while sharing tokens and brand assets.
- Visual snapshots and accessibility checks become required release evidence because
  broad token changes can affect every surface.
- This decision establishes the foundation; it does not claim that the side-panel
  Command Center, onboarding, or every final V2 surface is implemented.
- Future components must reuse the semantic tokens and state vocabulary or record a
  superseding design decision.

## Validation

- Verify unique IDs and accessibility references for every HTML surface.
- Exercise popup empty, active, paused, review, error, and details-expanded states.
- Review light, dark, reduced-motion, forced-colors/high-contrast, keyboard focus,
  screen-reader labels, and 200% zoom before release.
- Run the complete source, security, and deterministic packaging gate to prove the
  presentation work added no permission, connection, or runtime-package drift.

## Status

Accepted - the owner selected the Calm Optimistic direction and authorized its
implementation as the V2 design foundation. ADR-022 supersedes only the regenerated
icon clause; the remaining visual and interaction system stays accepted.
