# ADR-024 - Make Intentional Sessions Simple and Optional

Date: 2026-08-02

## Context

The popup presented Intentional Session as a branded hero before the user's daily
insights. Starting a timer required an intention, duration, and optional definition
of done; ending it exposed an additional reason selector. Although each field was
defensible alone, together they made a small utility feel like the product's main
workflow.

The owner asked for Intentional Session to be simpler and to receive less emphasis.
The durable restart-safe session state remains useful, but its interface should not
compete with the extension's browsing insight and Saved pages value.

## Options

### A. Keep the full workflow and rewrite its explanations

- Benefit: Preserves every reflection prompt in the popup.
- Compromise: Better copy does not remove the number of decisions or visual weight.

### B. Collapse the extra fields under advanced disclosure

- Benefit: Keeps the broader workflow available with a cleaner initial view.
- Compromise: The popup still carries low-frequency concepts and an avoidable second
  layer.

### C. Make the session a secondary, minimal utility - selected

- Benefit: Faster comprehension, less pressure, and a clearer relationship between
  Today's insight, an optional timer, and Saved pages.
- Compromise: New sessions no longer capture a definition of done or a structured
  unfinished reason from the popup.

## Decision

- Put the Today card before Intentional Session in visual and document order.
- Present the session as a neutral secondary card, without hero gradient, marketing
  headline, or oversized timer treatment.
- Reduce creation to one visibly labelled task field, one duration selector, and a
  Start button. Default to 25 minutes while retaining 50, 90, and open-ended modes.
- Remove definition-of-done and ending-reason controls from the popup. Send empty
  compatibility fields rather than inventing user input.
- Retain pause/resume, ten-minute extension, Finish session, Completed, End now, and
  one optional result/next-step note.
- Use plain runtime language: Running, Paused, Ready to review, and Session.
- Keep the persisted focus state machine, storage schema, dashboard history,
  retention, backup, and recovery behavior unchanged. Earlier records may retain
  their definition and reason fields and must remain readable.

## Consequences

- A new session needs two decisions instead of four: what and how long.
- The popup first answers "How is today going?" and offers a timer only when helpful.
- Structured historical fields remain in the schema for backward compatibility, but
  the simplified popup does not populate them.
- This supersedes ADR-019 and ADR-020 only for popup hierarchy and session input
  scope; their durable state, honest review, safety, and design-token decisions stay
  in force.

## Validation

- Contract-test that Today precedes the session and removed controls are absent.
- Verify the 25-minute default, visible label, Start action, timer controls,
  Completed/End now paths, optional note, and accessible progress name.
- Render inactive, running, paused, and review states at popup width in light and
  dark themes, plus keyboard, screen-reader, 200% zoom, and forced-colors checks.
- Run the complete syntax, data, security, documentation, and deterministic package
  gate.

## Status

Accepted - implements the owner's request to simplify Intentional Session and reduce
its prominence.
