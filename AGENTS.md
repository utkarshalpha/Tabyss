# AGENTS.md - Tabyss Working Instructions

This file is the working contract for AI agents contributing to Tabyss. It is adapted from the user-supplied Prompt Pack and grounded in this repository.

## 1. Project overview

- Project: Tabyss - Know Your Scroll
- Product: A privacy-first Chrome/Edge Manifest V3 extension that tracks active browser time locally and turns it into focus, wellbeing, and browsing-personality insights.
- Current release: 1.5.0
- Runtime: Vanilla JavaScript, HTML, and CSS; no framework, package manager, remote code, backend, account, or build step.
- Privacy contract: Current user activity remains in `chrome.storage.local`; current runtime makes no network requests.
- Main files:
  - `background.js` - tracking service worker and notification/wellbeing orchestration
  - `content.js` - on-page media detection and wellbeing overlays
  - `common.js` - shared data model, categorization, focus score, personas, and analytics helpers
  - `popup.*`, `dashboard.*`, `options.*`, `wrapped.*` - extension surfaces
  - `manifest.json` - Manifest V3 capabilities and permissions
  - `PRD.md`, `README.md`, `PRIVACY.md`, `QA_CHECKLIST.md` - current product record
  - `docs/v2/` - proposed V2 product and engineering definition
  - `docs/v2/decisions/` - V2 architecture/product decision records

## 2. Required reading

Before changing runtime code:

1. Read `README.md`, `PRD.md`, `PRIVACY.md`, and `QA_CHECKLIST.md`.
2. Read `docs/v2/README.md`.
3. Read `docs/v2/decisions/README.md` and every Accepted decision relevant to the task.
4. Inspect the actual implementation being changed; do not infer APIs or behavior from documentation alone.

## 3. Working method

For a complex task:

1. Restate the concrete objective.
2. Establish facts from the repository.
3. Present 2-3 materially different options with trade-offs when a long-lived decision is required.
4. Recommend one option, but leave the decision Proposed until the owner accepts it.
5. Make only changes authorized by the request.
6. Verify in proportion to risk.
7. Self-review for contradictions, privacy regressions, unhandled states, accessibility, and test gaps.
8. Record durable decisions as ADRs in `docs/v2/decisions/`.

## 4. Product constraints

- V2 is scoped to a Chrome extension. A web backend, mobile app, or native desktop companion is not part of the core scope.
- Connected capabilities may be designed as optional extension integrations. They must never become a hidden requirement for local functionality.
- Local-only mode must remain complete and first-class.
- Do not silently weaken the current privacy promise. Any networked capability needs an explicit user mode, consent, data receipt, and separate policy decision.
- Do not collect full URLs, page titles, page text, form input, credentials, or incognito activity by default.
- Do not use public leaderboards, employee surveillance, or parental domain monitoring as engagement mechanisms.
- Do not introduce a dependency, framework, permission, telemetry vendor, remote service, or remote code without an Accepted decision.

## 5. Engineering rules

- Preserve Manifest V3 compatibility and Chrome Web Store policy compliance.
- No secrets in source control.
- Treat all imported files, runtime messages, synced payloads, and page-derived values as untrusted.
- Prefer text-safe DOM APIs over HTML injection.
- Keep storage mutations serialized or transactional.
- Every schema change requires versioning, migration, backup/rollback behavior, and tests.
- Every new permission requires a user benefit, least-privilege analysis, permission-copy design, and denied-state behavior.
- Never delete or broadly rewrite user work without explicit approval.
- Never push directly to `main`.

## 6. Verification baseline

For documentation-only work:

- Verify internal links and decision statuses.
- Check that the feature catalog, UX, analytics, architecture, security, and release plan do not contradict each other.

For runtime work, at minimum:

- Run `node --check` on every JavaScript file changed.
- Exercise the affected flow in an unpacked extension.
- Run or update relevant unit, integration, end-to-end, visual, accessibility, performance, and migration tests once the V2 test system exists.
- Update `QA_CHECKLIST.md` or its V2 successor.

## 7. Decision status

- Proposed: Recommended but awaiting owner approval.
- Accepted: Binding for implementation.
- Rejected: Considered and intentionally not selected.
- Superseded: Replaced by a newer decision that links back to it.

Do not represent a Proposed decision as final. Do not contradict an Accepted decision without opening a superseding ADR and obtaining owner approval.
