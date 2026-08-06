# Tabyss Product and Engineering Prompt Templates

These templates implement the user-supplied plan-first, grounded, option-based working method for Tabyss.

## Decision and build trace ledger

Every implementation wave must add an entry here so the prompt method, durable
decision, code branch, and verification record stay connected rather than living
only in chat.

### 2026-08-02 — One-click session end and visited sites

- **Owner decision:** remove the multi-step session checkout and show sites visited
  during an Intentional Session.
- **Interaction decision:** active sessions expose direct Complete and End buttons;
  each commits in one click. Pause/Resume and +10 remain. No finish screen, reason,
  note, or “How did it go?” prompt interrupts the flow.
- **Context decision:** show normalized visited domains with local favicon fallback in
  the live popup and dashboard session history.
- **Privacy decision:** capture no more than 24 unique domains, never URLs, titles,
  page content, or per-site session duration. Reuse normal tracking eligibility so
  Incognito, ignored, unsupported, unfocused, and non-counting idle activity stays
  excluded.
- **Compatibility decision:** older records default to no visited-site list; older
  definition/reason/note fields remain readable and portable. The existing focus
  format, retention, reset, clear, import/export, and restart recovery stay intact.
- **Evidence:** [ADR-025](docs/v2/decisions/ADR-025-one-click-session-and-sites.md),
  state/worker/UI contracts, rendered one-click completion, dashboard history review,
  full verification, and deterministic package hash.

### 2026-08-02 — Intentional Session simplification

- **Owner decision:** keep Intentional Session, but make it much simpler and give it
  less emphasis in the popup.
- **Selected hierarchy:** Today's browsing insight appears first; the session is a
  neutral secondary utility rather than a branded hero.
- **Creation decision:** one visible “What are you working on?” field, one duration,
  and Start. Default to 25 minutes; keep 50, 90, and open-ended choices.
- **Checkout decision:** keep pause, resume, extend, Completed, End now, and one
  optional note; remove definition-of-done and ending-reason questions from the
  current popup. Empty compatibility fields are recorded rather than inferred.
- **Compatibility decision:** retain the restart-safe state machine, storage schema,
  history, backup, retention, and dashboard support for earlier richer records.
- **Language/accessibility decision:** use plain Session/Running language, a visible
  field label, accessible progress name, native controls, and the established focus
  states without introducing a new permission or data source.
- **Evidence:** [ADR-024](docs/v2/decisions/ADR-024-simple-optional-session.md), popup
  simplicity/order contract, rendered popup review, full verification gate, and
  deterministic package hash.

### 2026-08-02 — Saved Pages product simplification

- **Owner decision:** remove audit items 1-6 from the user-facing product: Profiles,
  manual checkpoints, Recovery navigation, side-panel outcome metrics, reusable
  Plans, and Spaces. Keep Later, but rename and simplify it.
- **Selected product:** the popup owns quick Focus, the dashboard owns insights, and
  the side panel owns one job called Saved pages.
- **UX decision:** one save form, one optional note, one list, three plain filters,
  and direct Open / Mark completed / Save again / Delete actions. No metaphor or
  architecture terms are exposed.
- **Accessibility decision:** visible form label, native controls, `aria-pressed`
  filter state, live status and count announcements, busy state, keyboard focus,
  and 38px-or-larger filter targets.
- **Compatibility decision:** show saved pages from every former Profile; preserve
  validated legacy Plan/Space/checkpoint data in local storage and exports instead
  of deleting it; stop Plan schedules and guard injection.
- **Surface decision:** retain `sidePanel` and the existing keyboard command, but
  rename their user-facing purpose to Saved pages.
- **Evidence:** [ADR-023](docs/v2/decisions/ADR-023-saved-pages-simplification.md),
  UI absence/accessibility contract, rendered save/complete/filter QA, full release
  verification, and deterministic package hash.

### 2026-08-02 — Original V1.5 logo restoration

- **Owner direction:** keep the exact logo used in V1.5 rather than the regenerated
  V2 interpretation.
- **Verified provenance:** both V1.5 commits contain the same three icon blobs; the
  assets changed only in the V2 Calm Optimistic foundation commit.
- **Selected decision:** restore all three runtime PNGs byte-for-byte from commit
  `50301b3`; do not redraw or approximate the logo.
- **Scope:** ADR-022 supersedes only ADR-020's icon clause. The rest of the color,
  language, component, accessibility, and interaction system remains in force.
- **Product boundary:** website favicons identify saved pages, while the stable V1.5
  mark continues to identify Tabyss itself.
- **Feature-audit boundary:** no Command Center feature is removed in this change.
  Plans, Spaces, Later, Recovery, Profiles, and local metrics are being ranked for a
  separate owner decision before implementation.

### 2026-08-02 — Exact-page favicon identity pass

- **Owner direction:** when a user opens and explicitly saves a web page in Tabyss,
  carry that site's favicon into the connected V2 experience.
- **Verified capability:** the accepted manifest already includes Chrome's `favicon`
  permission, and the legacy analytics list already uses the extension-local
  `/_favicon/` cache endpoint. No new permission or remote service is required.
- **Options considered:** persist favicon image blobs; fetch icons from a remote
  favicon provider; or resolve exact saved HTTP(S) page URLs through Chrome's local
  cache at render time.
- **Selected decision:** exact-page local-cache resolution with a deterministic
  letter fallback. Render single-page identity in Return Capsules and Focus Contract
  rows, plus bounded five-icon stacks for Plans, Spaces, and recovery checkpoints.
- **Trust and lifecycle decisions:** never fetch a favicon from the web, never store
  image data, never read page content, keep the extension toolbar icon as the Tabyss
  brand, and let Chrome refresh its own cache. Incognito and unsupported schemes
  remain excluded by the existing capture boundary.
- **Build branch:** `codex/v2-final-build`.
- **Evidence:** shared resolver and worker contract tests, full verification gate,
  and browser-adapter review of Capsule, Space, duplicate, and fallback states.

### 2026-08-02 — Wave 1B Calm Optimistic design foundation

- **Delegated task:** act as senior product designer/PM, expand the V2 feature
  opportunity set beyond the 15 umbrella workstreams, evolve the icon, and rebuild
  the presentation layer on a separate branch without weakening the trusted engine.
- **Competitive prompt:** compare current browser blockers, tab/session managers,
  mindful-intervention tools, and new-tab productivity products; identify a product
  wedge instead of copying disconnected features.
- **Product synthesis:** Tabyss differentiates by connecting declared intention,
  browser context, drift recovery, and honest reflection. The ranked backlog lives in
  [V2 product opportunities](docs/v2/12-product-opportunity-backlog.md).
- **Options considered:** cosmetic reskin; coherent design system and presentation
  rebuild over the trusted engine; or framework-led runtime rewrite.
- **Selected decision:** the Calm Optimistic system in
  [ADR-020](docs/v2/decisions/ADR-020-calm-optimistic-design-system.md), including
  the refined hourglass, semantic tokens, accessible geometry, action-first popup,
  friendly state language, and progressive disclosure.
- **Trust choices:** no new dependency, permission, connection, schema, telemetry,
  account, or page-data capture; public rankings and surveillance remain excluded.
- **Build branch:** `codex/v2-final-design-foundation`.
- **Evidence/rollback:** [Wave 1B build record](docs/v2/builds/wave-1b-final-design-foundation.md).

### 2026-08-02 — Wave 1 intentional-session vertical slice

- **Delegated task:** take senior-PM/engineering decisions and build the next
  coherent V2 Chrome-extension slice on a separate branch, while preserving the
  local-first trust contract.
- **Verified constraint:** MV3 workers are short-lived, alarms can be delayed, and
  critical active state cannot depend on popup/worker memory.
- **Options considered:** popup-memory timer; persisted timestamp state with bounded
  local outcomes; or blocking user value on the full proposed IndexedDB event model.
- **Selected decision:** the persisted timestamp state machine in
  [ADR-019](docs/v2/decisions/ADR-019-intent-session-state.md). Broader side-panel
  and IndexedDB decisions remain Proposed.
- **Product choices:** intention is the popup's primary action; timer expiry means
  review, never automatic success; completion and abandonment require checkout;
  passive Focus Score and chosen focus outcomes remain distinct.
- **Trust choices:** no new dependency, permission, network path, account, telemetry,
  or page-content capture; focus restores are blocked while a valid session is active.
- **Build branch:** `codex/v2-wave1-intent-session`.
- **Evidence/rollback:** [Wave 1 build record](docs/v2/builds/wave-1-intent-session.md).

### 2026-08-02 — Final local V2 product build

- **Owner direction:** treat V2 as the complete Chrome-extension product rather than
  deferring core value to a hypothetical V3; implement the agreed design and product
  loop on a separate branch and preserve every durable decision in this ledger.
- **Build branch:** `codex/v2-final-build` from the accepted Calm Optimistic design
  foundation.
- **Verified product gap:** the popup focus action and passive insights were strong
  isolated features, but there was no joined way to reuse a plan, arrange tabs,
  preserve a detour, return from drift, or undo browser cleanup.
- **Options considered:** cosmetic finalization; a bounded complete local product;
  or cloud accounts/sync/AI/social plus a larger event-platform and hard-blocking
  rewrite in one release.
- **Selected decision:** ADR-021's bounded local product. Ship a side-panel Command
  Center, Profiles, Plans/schedules, previewable Focus Contracts, Spaces, Return
  Capsules, mindful guard, duplicates, checkpoints, and post-focus restore. Keep the
  aggregate engine; do not invent an unproven IndexedDB migration.
- **Permission/schema decision:** add only `sidePanel`; support Chrome 116+; storage
  metadata schema 3; portable backup format 4; bounded product schema 1 validated on
  every read/write/import/export.
- **Safety decisions:** save rollback state before tab mutation; exclude Incognito;
  accept only credential-free HTTP(S) captured URLs; allow-only rules are complete
  when present; restores only open missing tabs; duplicate close requires two clicks;
  notification copy stays generic; guard stays dismissible and quiet on fullscreen
  and sensitive paths.
- **Connected-feature decision:** no account, encrypted sync, remote AI, friend or
  family comparison, leaderboard, or remote integration is exposed. Without a real
  identity, encryption/key-recovery, deletion, abuse, moderation, incident, and
  operations system, those would be insecure theater rather than a finished feature.
- **Design decisions:** Calm Optimistic tokens remain linked to the hourglass icon;
  action-first hierarchy, progressive plan-editor disclosure, starter plans, plain
  language, semantic colors, 10/12/16/24px geometry, keyboard focus, dark/reduced-
  motion/high-contrast support, and text-safe rendering are required.
- **Analytics decision:** no telemetry. The user-facing local North Star is weekly
  intentional outcome days (`3` is the visible target), with focus minutes and
  successful returns as supporting signals. Passive Focus Score remains separate
  from chosen outcomes.
- **Quality decision:** product-model and worker tests cover URL/schema limits,
  Focus Contract ordering, guard decisions, schedules, duplicate identity, backup,
  permissions, package/network policy, and UI references. Browser adapter QA covers
  the empty state, editor, Plan save, Contract preview, start, Space save, and
  responsive rendered layout; unpacked-extension lifecycle/policy checks remain
  explicit release gates.
- **Evidence/rollback:**
  [ADR-021](docs/v2/decisions/ADR-021-final-local-v2-architecture.md) and the final V2
  build record. Rollback is the prior `codex/v2-final-design-foundation` commit; local
  format-4 export is the user-data recovery path.

This ledger records decisions actually taken. Future ideas stay in the V2 catalog
or Proposed ADRs until their own implementation wave is authorized and verified.

## Product decision

```text
Role: Senior product manager for a privacy-first Chrome extension.
Task: Decide [decision].
Context: Read the current implementation, docs/v2, and relevant ADRs.
Steps:
1. State verified facts.
2. Present three viable options.
3. Compare user value, privacy, UX, engineering effort, risk, and reversibility.
4. Recommend one option.
5. Define success and guardrail metrics.
Format: ADR using docs/v2/decisions conventions.
Rules: Do not invent current behavior. Leave status Proposed until owner approval.
```

## Feature definition

```text
Role: Senior PM and extension architect.
Task: Define [feature] for Tabyss V2.
Output:
1. User problem and JTBD
2. Scope and non-scope
3. End-to-end journey
4. Functional requirements
5. Empty/loading/error/denied/offline states
6. Privacy and permissions
7. Analytics events and guardrails
8. Acceptance criteria
9. Rollout and rollback
Rules: Chrome-extension-only core; local-first; no new dependency or permission without a decision.
```

## Implementation wave

```text
Role: Senior product engineer, product manager, designer, security reviewer, and release owner.
Task: Implement Tabyss V2 Wave [N] on its own codex/v2-* branch.
Inputs: Current repository, accepted ADRs, docs/v2 feature requirements, prior build records.
Steps:
1. Verify current behavior and write the concrete exit gate.
2. Record every durable choice as an ADR; do not silently accept unrelated Proposed ADRs.
3. Implement the smallest coherent end-to-end vertical slice, including denied/error/recovery states.
4. Update schema/migration/backup behavior and privacy/permission copy when affected.
5. Add unit, integration, browser/UI, accessibility, performance, and manual QA evidence in proportion to risk.
6. Self-review security boundaries, races, data loss, hostile inputs, worker suspension, and rollback.
7. Write docs/v2/builds/wave-[N]-*.md with branch, decisions, files, evidence, limitations, and recovery.
8. Commit only after checks pass; never hide a failed or manual-only gate.
Rules: Core stays local-first and Chrome-extension-only. No dependency, permission, telemetry, connection, or remote code without an Accepted ADR.
```

## Release verification

```text
Role: Release owner and product-security reviewer.
Task: Verify a Tabyss branch without changing user data or publishing anything.
Steps:
1. Run verify.ps1 and preserve the complete pass/fail output.
2. Confirm manifest permissions, content-script scope, CSP/local assets, and package-files.json against Accepted ADRs.
3. Build twice and require identical SHA-256 plus exact runtime entries.
4. Run the unpacked-extension QA checklist for worker lifecycle, Incognito, permissions, notifications, import/download, and browser-origin messages.
5. Record automated, Chrome, manual, accessibility, performance, and policy evidence separately; never convert a missing manual gate into a pass.
6. Update the wave build record with known issues, artifact hash, rollback, and go/no-go status.
Output: Evidence-backed build record and release recommendation. Do not push, publish, or submit to a store without explicit owner authorization.
```

## Architecture decision

```text
Role: Staff Chrome-extension engineer.
Task: Evaluate [architecture problem].
Grounding: Inspect manifest.json and affected runtime/storage code.
Compare three options on MV3 lifecycle, correctness, performance, storage, privacy, migration, testability, and Chrome Store risk.
Deliver: Proposed ADR plus a test strategy. Do not implement until accepted.
```

## Security review

```text
Role: Product-security reviewer.
Task: Threat-model [feature].
Cover: assets, actors, trust boundaries, abuse cases, permission escalation, data exposure, spoofing, tampering, replay, denial of service, unsafe import/sync, logging, deletion, and recovery.
Output: Critical issues, required controls, residual compromises, verification plan.
```

## UX review

```text
Role: Senior product designer for browser extensions.
Task: Review [flow].
Check: comprehension, user control, progressive disclosure, interruption cost, permission trust, keyboard/screen-reader access, reduced motion, contrast, zoom, empty/loading/error states, undo, and mobile-size popup constraints.
Deliver: problems ranked by severity and a revised journey.
```

## Implemented decision - Abyss & Ember themes and rounded surfaces

Owner input:

```text
Use Tabyss Extension Design System.zip as the design source, provide theme in
Settings, and make the popup/tooltip edge more rounded. Preserve the approved
product decisions already made.
```

Facts established before implementation:

- The supplied system is Abyss & Ember, with exact light/dark tokens and a
  violet-magenta-ember identity gradient.
- The artifact also contains a newer logo and an older prototype flow. ADR-022 and
  ADR-025 are later explicit owner decisions, so the V1.5 mark and one-click
  Complete/End flow remain authoritative.
- Its named Google fonts cannot be fetched without breaking Tabyss's zero-network,
  local-asset, CSP, and dependency decisions.

Decision prompt and result:

```text
Role: Senior product designer, Chrome-extension engineer, privacy reviewer, and
release owner.
Compare: token-only reskin; full visual adoption with local System/Light/Dark and
later owner decisions preserved; literal prototype copy including its fonts/logo/
older flow.
Selected: full visual adoption with preserved logo and flow.
Rules: theme values are allowlisted; default System; no new permission, network,
font dependency, telemetry, account, or remote asset; use native theme radios;
preview immediately and persist through the existing Save action; gradient only
for identity/focus/Wrapped; record the owner's rounded-edge override.
```

Implemented choices:

- Light: `#F5F3FA` plane, `#FCFBFE` surface, `#17121F` ink, `#7C3AED` brand.
- Dark: `#0E0B15` plane, `#16121F` surface, `#F4F1FA` ink, `#A78BFA` brand.
- The `#8D8798` muted reference is retained, while small text uses contrast-adjusted
  `#716A7D` light and `#A59EAF` dark values for production readability.
- Identity gradient: `#7C3AED -> #DB2777 -> #F97316`; buttons stay solid.
- Local font approximations preserve the display/body/micro-label roles.
- Settings exposes System/Light/Dark; `system` is the sanitized legacy/default value.
- Popup shell is 22px; heads-up/break cards are 18/24px; controls are 10px and
  cards are 16px.
- Exact V1.5 PNGs remain canonical and the supplied prototype is not packaged.

Verification prompt:

```text
Render Settings in System, forced Light, and forced Dark. Verify accessible native
radio names, live preview status, exact computed tokens, cross-page theme code, and
the original logo. Render popup at 380px and verify 22px computed radius, solid
primary action, Today-first hierarchy, and unchanged direct session outcomes. Run
syntax, unit/contract/security/docs/package checks and deterministic double-build.
Keep manual unpacked-extension persistence, 200% zoom, assistive technology, and
policy checks explicitly gated until performed in the real extension runtime.
```

## Implemented decision - Colour personalization (ADR-027)

Owner-directed 2026-08-02. Six palettes (cobalt default, teal, abyss, plum,
forest, ember) x System/Light/Dark, exact owner-supplied colour configuration
in `TABYSS_PALETTES` (common.js), generated CSS variable blocks in styles.css,
allowlisted `palette`/`appearance` settings with safe fallback, immediate
preview, Save persistence, live cross-page restyle, chart redraw events.
Constraints honoured: no logo change, no functional/navigation change, no new
permissions or network behavior. Verification: node --check on all JS, 80-check
unit harness (palette allowlists, fallbacks, legacy `theme` retirement,
CSS<->JS sync), manual light/dark review pending in the unpacked runtime.

## Implemented decision - Local favicon sourcing (ADR-028)

Owner-directed 2026-08-02. Wellbeing/media rows prefer the exact open-tab page
URL through Chrome's local /_favicon/ cache, then canonical domain, then a
palette-tinted letter fallback. Pure `buildOpenTabFaviconMap` (active tab wins,
exact www-stripped domain matching, incognito/credential/non-HTTP rejection) +
race-safe shared `renderFavicon`. No remote favicon service, no network client,
no new permission, nothing persisted. Verified by the 111-check unit harness
(favicon candidate order, boundary matching, permission set, banned-host source
scan) and node --check on all files; manual visual QA gated on the unpacked
runtime.

## Implemented decision - Design-prototype parity wave 1 (ADR-029)

Owner-directed 2026-08-02 ("any good thing you find, implement"). Audited the
owner design prototype against v2.3.0 (20 findings); adopted the eight
high-value/low-risk items: focus check-out UI (backend was already complete),
amber toolbar session dot, drawn badge medallions, Wrapped narrative
gradients, wellbeing microcopy pass, trust proof-lines, peak-hour callout,
semantic-token hygiene + slim scrollbar. Identity-level bets (crest avatars,
bundled brand fonts, onboarding flow, adaptive persona accent, corner-toast
reminders, tile upgrades) recorded as Proposed in ADR-029 pending owner
approval. 111-check harness green; node --check clean; no permission, asset,
or network change.
