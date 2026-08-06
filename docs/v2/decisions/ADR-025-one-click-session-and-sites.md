# ADR-025 - One-Click Session End and Visited Sites

Date: 2026-08-02

## Context

ADR-024 reduced session setup, but ending still required Finish session followed by
Completed or End now. The optional checkout form made a common action feel like a
three-to-four-click ritual when combined with starting and selecting a duration.
The owner asked for direct checkout and for the session to show which sites were
visited.

## Options

### A. Keep the checkout form and add a site summary

- Benefit: Retains optional reflection before every outcome.
- Compromise: Does not solve the click and interruption problem.

### B. Use one Complete button without session site context

- Benefit: Lowest implementation and interaction cost.
- Compromise: Removes friction without helping the user understand where the session
  actually went.

### C. Direct Complete/End plus a bounded local site trail - selected

- Benefit: One-click outcomes and immediate, evidence-based session context.
- Compromise: New sessions do not collect a checkout note, and a mistaken outcome has
  no dedicated undo control. Complete is visually primary and End is secondary to
  reduce accidental choice.

## Decision

- Replace Finish session and its checkout form with direct **Complete** and **End**
  buttons in the active session controls. Either action closes the session in one
  click and temporarily disables the active controls while the worker commits the
  outcome, preventing conflicting double actions.
- Keep Pause/Resume and +10 min. Timer review exposes the same direct actions instead
  of forcing another screen.
- Show a live **Sites visited** list in the popup and the same list on active and
  historical dashboard session rows.
- Capture at most 24 unique domains in encounter order. Store only normalized domain
  names, never full URLs, titles, page content, or per-site session duration.
- Reuse the normal active-domain eligibility boundary: Incognito, ignored domains,
  unsupported schemes, unfocused windows, and non-counting idle activity are not
  added. The background worker derives the list; page scripts cannot submit it.
- Preserve older session records without the field as an empty list. Preserve older
  definition, reason, and note data in history and backups, but do not request those
  fields in the simplified popup.
- Keep all data local, sanitized, bounded, retained, reset, exported, and restored
  through the existing focus-session contract. No permission or network path is
  added.

## Consequences

- Complete and End now take one click from an active session.
- The user can see session context without answering “How did it go?” or writing a
  note.
- Focus history gains an explicit session-to-domain association. This is more
  sensitive than an unlinked daily domain total, so it is disclosed in Privacy and
  remains subject to the existing local-only, Incognito, ignore, retention, export,
  reset, and clear controls.
- ADR-024 remains authoritative for popup hierarchy and minimal setup; this ADR
  supersedes its optional-note checkout decision.

## Validation

- Unit-test normalization, deduplication, 24-domain bounds, legacy empty defaults,
  outcome persistence, import/export, and hostile domain rejection.
- Worker-test initial-site capture, tab-change/flush capture, current-site capture,
  restart recovery, and completed-record export.
- Contract-test the absence of Finish/checkout/note controls and the presence of
  direct Complete/End plus an accessible visited-site list.
- Render and operate Start -> Complete and Start -> End in one click, verifying live
  feedback and dashboard site history.
- Run the complete syntax, security, data, documentation, and deterministic package
  gate.

## Status

Accepted - implements the owner's direct request for a simpler one-click session
ending flow with visited sites.
