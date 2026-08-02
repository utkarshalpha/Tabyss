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

- [ADR-023](../decisions/ADR-023-saved-pages-simplification.md) is the final product-
  surface decision: Focus in the popup, insights in the dashboard, and one Saved
  pages side panel. It supersedes ADR-021's broader visible feature set.
- [ADR-024](../decisions/ADR-024-simple-optional-session.md) puts Today before a
  quieter optional session and reduces setup to one task, one duration, and Start.
  It supersedes ADR-019/020 only for popup hierarchy and input scope.
- [ADR-022](../decisions/ADR-022-original-v1-5-brand-mark.md) restores the exact V1.5
  runtime logo and supersedes only ADR-020's regenerated-icon clause.
- [ADR-021](../decisions/ADR-021-final-local-v2-architecture.md) remains the historical
  compatibility architecture; its Command Center, Plan, Space, guard, and recovery-
  surface scope is superseded.
- [ADR-020](../decisions/ADR-020-calm-optimistic-design-system.md) governs the visual
  system and action-first hierarchy.
- Existing trust, backup, quality, private-browsing, and focus-state ADRs remain in
  force.
- ADR-005's IndexedDB event platform and ADR-006's DNR hard blocking remain
  unselected. They were not smuggled into the release through implementation.
- Accounts, encrypted cloud sync, remote AI, friends/family comparison,
  collaboration, public leaderboards, employee/parental monitoring, and remote
  integrations are absent. The necessary identity, key recovery, deletion, abuse,
  moderation, incident, and operations systems do not exist and are not simulated.

## Implemented product behavior

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
- Pause/resume, ten-minute extension, Finish session, Completed, End now, and one
  optional result/next-step note remain. Definition-of-done and ending-reason
  questions are absent from new popup sessions.
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
  are excluded. Passive analytics remain domain-only.
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
- Node suite: **47/47 pass**.
- Covered boundaries include sender authorization, Incognito, ignore domains,
  notification redaction, focus recovery, compatibility records, reset/retention,
  product schema/URL limits, backup/import safety, manifest/package policy, zero-
  network policy, five-page UI reference/accessibility contracts, and explicit
  absence of the retired side-panel concepts.
- V2 documentation links and git whitespace: pass.
- Deterministic runtime package: 19 allowlisted files, 95.5 KB, identical builds:
  `0404ea8eeef1846185a17602999e3c3d15ef7038efa96f31ce17583247c14364`.

### Rendered browser adapter

- Dark-mode popup rendered with Today first and a visually neutral Intentional
  Session card second. The accessibility tree exposed level-one Today and level-two
  Start/Current session headings, a visible task label, selected 25-minute default,
  and a named Session progress bar.
- Exercised: enter task, Start, active Current session state, Finish session, End now,
  announcement, and return to the cleared creation form without a definition or
  reason question.
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
