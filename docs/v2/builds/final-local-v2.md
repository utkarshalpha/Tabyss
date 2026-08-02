# Final Local V2 - Intentional Browsing

Date: 2026-08-02

Branch: `codex/v2-final-build`

State: Implementation complete and locally verified; ready for unpacked-extension
dogfood. Store publication remains gated by the manual browser, assistive-technology,
performance, and policy checks in `QA_CHECKLIST.md`.

## Objective and user value

Complete the Chrome-extension V2 as one understandable local product. The final
owner-reviewed loop is:

1. Understand browser time in the popup and dashboard.
2. Optionally start one simple timer or open-ended session from the popup.
3. Save the current page with an optional note instead of keeping its tab open.
4. Return through one Saved pages list, then complete, save again, or delete it.

The product no longer exposes its internal Profile, Plan, Space, checkpoint, or
Recovery architecture as navigation.

## Decisions and scope

- [ADR-026](../decisions/ADR-026-abyss-ember-themes.md) adopts the owner-supplied
  Abyss & Ember tokens, user-selected System/Light/Dark appearance, and rounder
  popup/heads-up geometry. It supersedes ADR-020 only for visual tokens, typography
  roles, geometry, and appearance behavior.
- [ADR-023](../decisions/ADR-023-saved-pages-simplification.md) is the final product-
  surface decision: Focus in the popup, insights in the dashboard, and one Saved
  pages side panel. It supersedes ADR-021's broader visible feature set.
- [ADR-024](../decisions/ADR-024-simple-optional-session.md) puts Today before a
  quieter optional session and reduces setup to one task, one duration, and Start.
  It supersedes ADR-019/020 only for popup hierarchy and input scope.
- [ADR-025](../decisions/ADR-025-one-click-session-and-sites.md) replaces the
  remaining checkout step with direct Complete/End and adds a bounded local
  visited-domain trail. It supersedes ADR-024 only for checkout scope.
- [ADR-022](../decisions/ADR-022-original-v1-5-brand-mark.md) restores the exact V1.5
  runtime logo and supersedes only ADR-020's regenerated-icon clause.
- [ADR-021](../decisions/ADR-021-final-local-v2-architecture.md) remains the historical
  compatibility architecture; its Command Center, Plan, Space, guard, and recovery-
  surface scope is superseded.
- [ADR-020](../decisions/ADR-020-calm-optimistic-design-system.md) retains the calm,
  nonjudgmental voice, accessibility, and action hierarchy not superseded by
  ADR-026.
- Existing trust, backup, quality, private-browsing, and focus-state ADRs remain in
  force.
- ADR-005's IndexedDB event platform and ADR-006's DNR hard blocking remain
  unselected. They were not smuggled into the release through implementation.
- Accounts, encrypted cloud sync, remote AI, friends/family comparison,
  collaboration, public leaderboards, employee/parental monitoring, and remote
  integrations are absent. The necessary identity, key recovery, deletion, abuse,
  moderation, incident, and operations systems do not exist and are not simulated.

## Implemented product behavior

### Abyss & Ember appearance

- Supplied light/dark surface, ink, brand, semantic, track, and identity-gradient
  tokens now govern every packaged extension surface. Small muted text uses a
  documented contrast-adjusted derivative instead of the reference swatch.
- Settings begins with native System, Light, and Dark radios. Selection previews
  immediately; Save writes one sanitized local `theme` field. System is the legacy
  and default fallback and continues to follow the OS.
- Explicit theme choice also drives category/score rendering rather than leaving
  canvas and generated colors tied only to OS preference.
- The popup shell uses a 22px radius; in-page heads-up and wellbeing cards use
  18/24px. Primary buttons remain solid violet and the identity gradient stays
  limited to focus/brand/persona/Wrapped moments.
- Offline-safe local font stacks approximate the supplied display, body, and mono
  roles without a remote font or dependency. The exact V1.5 PNG logo remains
  canonical; the ZIP's alternative mark and older prototype flow are not packaged.

### Saved pages

- Side panel and full-tab fallback with one purpose, opened from the popup bookmark
  button or `Alt+Shift+T`.
- Save current page with an optional note; cards show favicon, title, domain, note,
  date, and direct Open / Mark completed / Save again / Delete actions.
- Saved, Completed, and All filters use native buttons and accurate pressed state.
- Records from every former Profile appear in one list, preventing hidden data.
- Exact page URLs resolve through Chrome's local favicon cache with a letter fallback;
  no image blob is stored and no remote favicon service is contacted.
- Visible labels, live feedback/counts, busy state, keyboard focus, minimum target
  sizing, and narrow-layout stacking make the surface accessible without onboarding.

### Optional intentional session

- Today's local browsing insight leads the popup; the session is a neutral secondary
  card rather than a branded hero.
- Starting requires one visibly labelled task and one duration. The default is 25
  minutes, with 50, 90, and open-ended choices retained.
- Pause/resume and ten-minute extension remain. Complete and End commit directly in
  one click; no Finish screen, definition, reason, or note question is shown.
- The popup and dashboard show up to 24 unique domains visited during the session.
  These are worker-derived under normal Incognito/ignore/active-tab eligibility,
  contain no full URLs or per-site durations, and remain local and bounded.
- The persisted state machine and historical schema remain compatible, so earlier
  richer records stay readable, exportable, and subject to the same recovery and
  retention rules.

### Retired compatibility features

- Profiles, Plans, Spaces, Plan schedules, drift guard, Focus Contracts, outcome
  counters, duplicate cleanup, manual checkpoints, and Recovery navigation are not
  active product surfaces.
- Existing records remain validated, local, and exportable to avoid destructive
  migration. Plan schedule notifications and guard activation are disabled.
- The optional session stays in the popup; reflection remains in the dashboard.

## Data contracts, privacy, and permissions

- Manifest version: `2.0.0`; minimum Chrome: `116`.
- Storage metadata schema: `3`; new local product schema: `1`; portable backup
  format: `4`.
- The versioned `product` record stores Saved pages and may retain bounded legacy
  Profile/Plan/Space/checkpoint records from earlier local builds for compatibility.
- All product data is sanitized on read, write, import, and export. Collections,
  identifiers, strings, timestamps, enums, domains, and URLs are bounded.
- Captured URLs must be credential-free HTTP(S); Incognito and unsupported schemes
  are excluded. Passive analytics remain domain-only. Session context stores at most
  24 eligible domains without full URLs, titles, or per-site duration.
- Export/import now includes ten restorable sections. Privacy, Settings, store copy,
  PRD, QA, system design, security risks, North Star, backlog disposition, and
  decision ledger match this behavior.
- `sidePanel` is the only new permission. There is still no network client, remote
  code, dependency, account, identifier, telemetry, or crash reporter.

## Changed runtime and verification files

- New: `product.js`, `sidepanel.html`, `sidepanel.js`, `tests/product.test.js`.
- Updated: manifest/package contract, service worker, content script, shared backup
  schema, popup entry point, shared styles, all extension-page script ordering, test
  adapter, worker/common/manifest/UI tests, and release/product/privacy documentation.
- Existing user-owned `tabyss-v2-wave1-review/` remains untouched and is not part of
  the package or commit.

## Verification evidence

### Automated and package

- `verify.ps1`: pass.
- JavaScript syntax: all runtime/test JavaScript passes `node --check`.
- Node suite: **53/53 pass**.
- Covered boundaries include sender authorization, Incognito, ignore domains,
  notification redaction, focus recovery, compatibility records, reset/retention,
  domain-only session-site capture/bounds/legacy defaults, product schema/URL
  limits, backup/import safety, manifest/package policy, zero-network policy, five-
  page UI reference/accessibility contracts, explicit absence of the retired
  side-panel concepts, theme allowlisting/fallback, native Appearance controls,
  exact Abyss & Ember tokens, and rounded shell/overlay geometry.
- V2 documentation links and git whitespace: pass.
- Deterministic runtime package: 19 allowlisted files, 100,659 bytes (98.3 KB),
  identical builds: `e73d2919429b0d759722379cd0707c4239bf7f42f1fdfd1e4a16db4ee5b371ba`.

### Rendered browser adapter

- Settings rendered in OS/System dark and forced Light. The accessibility tree
  exposed one labelled Appearance region, a native Theme group, System/Light/Dark
  radio names with descriptions, and a polite preview status. Forced Light computed
  `#F5F3FA`; forced Dark/System computed `#0E0B15`.
- Popup rendered at a computed 380px width with a computed 22px body radius,
  Abyss & Ember dark tokens, solid-violet Start, the exact `icon48.png` source, Today
  first, and the unchanged minimal session card. The local HTTP adapter reinitializes
  its in-memory storage on reload, so true theme persistence remains an unpacked-
  extension gate even though settings sanitization/storage contracts are automated.
- Dark-mode popup rendered with Today first and a visually neutral Intentional
  Session card second. The accessibility tree exposed level-one Today and level-two
  Start/Current session headings, a visible task label, selected 25-minute default,
  and a named Session progress bar.
- Exercised: enter task, Start, active Current session state, visited-site chips,
  one-click Complete, visible announcement, and return to the cleared creation form
  without a checkout, definition, reason, or note question.
- Dashboard accessibility review exposed the completed session's labelled visited-
  site list with favicon fallback and preserved historical context.
- Dark-mode Saved pages rendered with Calm Optimistic tokens, the restored V1.5
  mark, an empty state, and local test data.
- Exercised: optional note, Save current page, form reset, live success status,
  favicon fallback, Mark completed, Saved/Completed filters, count update, and
  direct page-card actions.
- Browser accessibility snapshots exposed one labelled primary region, one list
  region, visible form labelling, pressed filter state, status, headings, and direct
  action names. Real-icon retrieval remains part of unpacked-extension dogfood
  because the HTTP adapter intentionally exercises the letter fallback.

### Accessibility and performance assessment

- Shared focus-visible, reduced-motion, high-contrast, forced-colors, light/dark,
  semantic-color, and narrow-width rules cover the new surface.
- No dependency, network path, remote asset, content observer, schedule check, guard
  activation, or higher-frequency worker loop was added.
- A formal CPU/memory/page-load trace, real screen-reader pass, 200% zoom pass, and
  unpacked-extension multi-window/suspension run remain manual release gates.

## Residual compromises and non-claims

- Local extension storage and full backup JSON are not encrypted; explicitly saved
  URLs/titles are sensitive on a compromised device/profile.
- Dormant compatibility records consume some local storage and appear in complete
  backup JSON until the user clears data or replaces them through restore.
- The browser adapter is not a substitute for installing the unpacked extension and
  exercising real Chrome worker suspension, permission warnings, notifications,
  downloads, multi-window behavior, hostile sites, and assistive technology.
- No store submission, push, rollout, or external state change is authorized by this
  build record.

## Rollback and data recovery

- Code rollback target: commit `6ffa9be` on
  `codex/v2-final-design-foundation`.
- Rolling code back does not delete the new `product` storage key; older runtime code
  ignores it. Do not clear storage as a rollback step.
- Export format 4 before rollback for recovery, but do not import that file into an
  older format-3 runtime (it correctly rejects future backup formats). Returning to
  V2 restores access to the retained local product data.
- Existing aggregate and focus records remain in their established keys and are not
  destructively migrated by V2 activation.

## Review recommendation

Go for local unpacked-extension dogfood. No-go for public store publication until the
remaining manual release gates are recorded. This distinction prevents a passing
source/package gate from being presented as proof of real-browser policy readiness.
