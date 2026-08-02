# Final Local V2 - Intentional Browsing

Date: 2026-08-02

Branch: `codex/v2-final-build`

State: Implementation complete and locally verified; ready for unpacked-extension
dogfood. Store publication remains gated by the manual browser, assistive-technology,
performance, and policy checks in `QA_CHECKLIST.md`.

## Objective and user value

Complete the Chrome-extension V2 as one connected local product rather than a set of
tracker utilities or a promise of later work. The shipped loop is:

1. Choose a Profile and reusable Plan.
2. Preview the Focus Contract and preserve the current browser context.
3. Enter focus with the right pages and an optional mindful protection rule.
4. Save a detour or return to the chosen plan without losing either context.
5. Check out honestly and restore the prior workspace when wanted.
6. See local intentional outcome days, focus minutes, and successful returns without
   transmitting analytics.

The signature magic moment is now executable: a user can notice drift, save the page
that tempted them, return to their intention, and recover the original tabs later.

## Decisions and scope

- [ADR-022](../decisions/ADR-022-original-v1-5-brand-mark.md) restores the exact V1.5
  runtime logo and supersedes only ADR-020's regenerated-icon clause.
- [ADR-021](../decisions/ADR-021-final-local-v2-architecture.md) accepts the final
  bounded local architecture, `sidePanel` capability, explicit URL/title capture
  boundary, observe/nudge protection, and connected-feature exclusion.
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

### Command Center and onboarding

- Side-panel Command Center with full-tab fallback and `Alt+Shift+T` shortcut.
- Personal, Work, Study, and bounded custom Profiles, including confirmed removal.
- Deep work and Study sprint starter Plans for the empty state.
- Weekly local North Star: intentional outcome days (`n/3`), with focus minutes and
  successful returns as supporting signals.

### Plans and Focus Contracts

- Reusable Plan name, intention, definition of done, 5-240 minute timer or
  open-ended mode, observe/nudge protection, allow-only or pause-domain policy,
  selected pages, linked Space, tab parking, restore preference, and local schedule.
- Progressive editor disclosure keeps context/site/schedule controls available
  without making them the first-run burden.
- Preview lists every unpinned outside-plan tab to park and missing selected page to
  open. No browser mutation occurs before confirmation.
- A complete recovery checkpoint is persisted before confirmed tab parking.
- Active focus remains authoritative across popup and Command Center; checkout marks
  completed or unfinished and exposes the pre-focus restore offer.

### Context, drift, and recovery

- Spaces explicitly save a bounded current-window HTTP(S) URL/title set and restore
  only missing pages.
- Exact saved page URLs resolve through Chrome's extension-local favicon cache in
  Plans, Spaces, Return Capsules, duplicate review, checkpoints, and Focus Contract
  previews. The UI shows a calm letter fallback when Chrome has no cached icon;
  no image blob is stored and no remote favicon service is contacted.
- Return Capsules explicitly save the active page plus an optional note and support
  open, done, reopen, and delete.
- Mindful guard actions: Return to plan, Save for later & return, or Continue for a
  bounded period. It checks hostname policy only, uses a closed shadow root, traps
  keyboard focus, provides Escape, and stays quiet on fullscreen and conservative
  login/auth/payment/checkout paths.
- Duplicate groups normalize fragments, show the repeated pages, require a second
  confirmation, persist a checkpoint before removal, and keep the active/first copy.
- Manual and automatic checkpoints preserve original URL multiplicity; explicit
  restore opens missing tabs/copies and never closes current work.
- Destructive checkpoint deletion is refused while that checkpoint protects a Focus
  Contract. Operations requiring more than 100 savable tabs fail before mutation so
  Tabyss never creates a knowingly incomplete rollback point.

## Data contracts, privacy, and permissions

- Manifest version: `2.0.0`; minimum Chrome: `116`.
- Storage metadata schema: `3`; new local product schema: `1`; portable backup
  format: `4`.
- New `product` record: active Profile, Profiles, Plans, Spaces, Return Capsules,
  checkpoints, active Focus Contract, guard cooldowns, schedule prompt keys,
  recovery counts, and bounded preferences.
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
- Node suite: **46/46 pass**.
- Covered boundaries include sender authorization, Incognito, ignore domains,
  notification redaction, focus recovery, Focus Contract preview/start/finish,
  pre-mutation persistence, guard choices, reset/retention, schedule de-duplication,
  duplicate undo, checkpoint-in-use/100-tab refusal, product schema/URL limits,
  backup/import safety, manifest/package policy, zero-network policy, and five-page
  UI reference/accessibility contracts.
- V2 documentation links and git whitespace: pass.
- Deterministic runtime package: 19 allowlisted files, 105.6 KB, identical builds:
  `e519880ddee81f1aee9cfddf2130ee2da2dd6e651f5b8405d169979604ad18f7`.

### Rendered browser adapter

- Dark-mode Command Center and popup rendered with Calm Optimistic tokens,
  hierarchy, the restored V1.5 icon, and local test data.
- Exercised: empty Plans, starter Plan, full Plan editor, Plan save, Contract preview,
  Contract start, active focus card, Space save, Return Capsule save, Recovery view,
  duplicate review/second confirmation, and post-action feedback.
- Exact-page favicon placement was reviewed in Return Capsules, Space stacks, and
  duplicate rows. The HTTP adapter intentionally cannot access Chrome's extension
  cache, so its image errors exercised and visually verified the letter fallback;
  real-icon retrieval remains part of unpacked-extension dogfood.
- The pass found an async `event.currentTarget` lifecycle bug in Profile/Space/
  Capsule/checkpoint forms. Handlers now capture the form before awaiting; Space and
  Capsule inputs were retested to clear successfully with success feedback.
- Browser accessibility snapshots exposed named regions/headings, labels, native
  details, dialog semantics, progressbar, schedule-day names, filters, and action
  buttons. Contract dialog rendering and popup entry-point icons were visually
  reviewed.

### Accessibility and performance assessment

- Shared focus-visible, reduced-motion, high-contrast, forced-colors, light/dark,
  semantic-color, and narrow-width rules cover the new surface.
- The on-page guard uses role/dialog, labelled/described relationships, primary focus,
  Tab containment, and Escape-as-bounded-continue.
- No dependency, network path, remote asset, content observer, or higher-frequency
  worker loop was added. Plan schedule checking piggybacks on the existing minute
  alarm; tab operations are explicit and bounded.
- A formal CPU/memory/page-load trace, real screen-reader pass, 200% zoom pass, and
  unpacked-extension multi-window/suspension run remain manual release gates.

## Residual compromises and non-claims

- Local extension storage and full backup JSON are not encrypted; explicitly saved
  URLs/titles are sensitive on a compromised device/profile.
- A hostile page can still remove or cover an injected guard host. The guard fails
  open and is not represented as enforcement.
- Sensitive-path suppression is heuristic because page text/form inspection is
  intentionally prohibited.
- Spaces do not restore tab groups, navigation/scroll/form state, or full page
  sessions. Current-window scope is deliberate.
- One shared interruption budget across all legacy goal/wellbeing/sunset modules is
  not complete; local Plan schedules have a bounded daily budget and generic copy.
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
