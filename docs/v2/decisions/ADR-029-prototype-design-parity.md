# ADR-029 — Design-prototype parity, wave 1

Status: Accepted (owner-directed 2026-08-02: "any good thing you find, implement").

## Context

An audit of the owner-supplied design prototype ("Tabyss Extension Design
System.zip") against v2.3.0 surfaced twenty gaps. This wave adopts the
high-value, low-risk set; identity-level bets are recorded as Proposed below.

## Adopted (wave 1)

1. **Focus check-out UI** — the worker and dashboard already supported session
   notes, end reasons, and "define done"; the popup now exposes them: optional
   "Define done" on start, and a Complete/End check-out with an optional note
   plus a reason select when ending unfinished. No schema or worker change.
2. **Toolbar focus dot** — a text-free amber badge dot on the action icon
   while a session is live (`syncFocusBadge`), cleared on every path that ends
   or discards a session. Never shows the intention.
3. **Drawn badge medallions** — canvas `drawBadge`/`BADGE_ART` port replaces
   emoji badges on the dashboard; locked badges render grey.
4. **Wrapped narrative gradients** — fixed per-slide gradient sequence
   (abyss → ember) replaces arbitrary palette rotation.
5. **Microcopy pass** — wellbeing notifications ("Water o'clock", "Unfold
   yourself", "The feed will keep", "Eyes need a horizon"), goal-notification
   privacy reassurance line, honest skip label, empty-state and heading copy,
   rabbit-hole definition surfaced ("25m+ unbroken on one site"), consistent
   "Wrapped ✦" naming.
6. **Trust proof-lines** — dashboard and settings footers state the zero-
   network, local-storage posture in mono microtype.
7. **Peak-hour callout** under the hour heatmap.
8. **Token hygiene** — score/budget/compare colours now use the semantic
   palette tokens (DOM/SVG only; canvas keeps literals); slim brand scrollbar.

## Proposed (owner approval needed before implementation)

- Class-crest persona avatars + always-dark hero gradient formula (replaces
  drawDoodle and the hero contrast-flip hack).
- Bundled brand fonts (Bricolage Grotesque / Instrument Sans / Spline Sans
  Mono) — new local assets, package-size and subsetting decision.
- First-run onboarding flow (4 screens) replacing the bare dashboard open.
- "Persona" adaptive accent as a seventh palette option (interacts with
  ADR-027).
- Corner-toast treatment for water/stand reminders; typography-only eye-break
  overlay; dashboard tile upgrades (streak/holes/switch-rate tiles, media
  attention flag, best-day rollup).

## Consequences

No new permissions, assets, or network behavior. `chrome.action` badge APIs
are already granted by the action manifest entry. Badge art and glyphs are
self-contained canvas code in common.js.
