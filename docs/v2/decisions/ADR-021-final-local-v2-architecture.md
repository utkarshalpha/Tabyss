# ADR-021 - Final Local V2 Product Architecture

Date: 2026-08-02

## Context

The owner authorized a complete V2 build on a separate branch and explicitly asked
that major and minor user-value work not be deferred to a hypothetical V3. The
existing extension already has a hardened local tracking, focus, wellbeing, backup,
and packaging foundation. The remaining product problem is to connect intention,
browser context, drift recovery, and reflection into one dependable loop without
pretending that an account service, encrypted sync, AI service, or safe social system
exists.

Several earlier ADRs deliberately remained Proposed while their broadest forms were
evaluated. This decision selects the smallest production architecture that delivers
the complete local loop now. It does not accept remote accounts, social comparison,
page-content collection, hard browser blocking, or an unimplemented cloud promise.

## Decision drivers

- A user must be able to plan, enter focus, recover from drift, and restore context
  without leaving the extension or trusting a remote service.
- Every bulk tab mutation must be previewed or reversible.
- Full URLs and titles may be kept only for an explicit user capture such as saving a
  Space, Return Capsule, plan page, or checkpoint.
- Existing aggregate browsing history must remain domain-only and on-device.
- The primary workflow needs more room than a popup while staying available beside
  the current tab.
- Protection must preserve agency and stay quiet on sensitive and fullscreen paths.
- The release must remain dependency-free, deterministic, and auditable.

## Options

### A. Cosmetic V2 over the existing popup

- Benefit: No permission or storage expansion.
- Compromise: Cannot responsibly fit plan previews, saved context, explicit capture,
  or recovery history and does not complete the user loop.

### B. Local Command Center with bounded product records and mindful recovery - selected

- Benefit: Completes the plan-focus-recover-reflect loop using Chrome's side panel,
  explicit local records, checkpoints, and an interruptible nudge.
- Compromise: Adds the `sidePanel` permission, raises minimum Chrome to 116, and
  stores user-selected URLs/titles for capture features.

### C. Cloud-first accounts, sync, AI, and social comparison in the same release

- Benefit: Multi-device and collaborative features could be valuable when backed by
  a real service and operating model.
- Compromise: Shipping them now would require unapproved identity, encryption, key
  recovery, abuse prevention, moderation, deletion, incident response, and recurring
  infrastructure. A UI-only simulation would violate user trust.

### D. DNR-backed hard blocking

- Benefit: Stronger enforcement than an in-page intervention.
- Compromise: Adds permission and rule-reconciliation complexity, can interrupt
  essential flows, and does not match the selected agency-preserving protection
  ladder for this release.

## Decision

- Ship a side-panel Command Center as the home for Profiles, reusable Plans, local
  schedules, Focus Contract previews, Spaces, Return Capsules, duplicate cleanup,
  checkpoints, and post-focus restoration.
- Add only the `sidePanel` permission and expose `Alt+Shift+T` as a local Command
  Center shortcut. Keep the action popup as the fastest quick-intention surface.
- Raise `minimum_chrome_version` to 116 so promise-based browser APIs and the side
  panel have one supported baseline.
- Store the new product objects in one versioned, bounded `product` document in
  `chrome.storage.local`. Validate it on every read, write, import, and export. Keep
  the aggregate usage engine and focus history in their existing hardened schemas.
- Increment the storage metadata schema to 3 and portable backup format to 4. V2
  product data participates in export/import and remains recoverable with the rest
  of the user's local data.
- Save checkpoints before focus tab parking and duplicate cleanup. Restoration opens
  only missing HTTP(S) pages and never closes the user's current work.
- Protection levels are `observe` and `nudge`. The nudge compares only the current
  hostname with user-authored rules, offers Return, Save for later, or Continue, and
  suppresses itself on fullscreen, login, authentication, payment, and checkout
  paths. There is no unescapable lock or hidden page-content analysis.
- Local plan reminders share a bounded daily notification budget. They never start a
  session or change tabs without confirmation.
- Full URL/title capture is allowed only after an explicit save or confirmed
  checkpoint-producing operation. Incognito tabs are excluded. Credential-bearing,
  non-HTTP(S), oversized, and malformed URLs fail closed.
- Connected sync, AI, friends/family comparison, public leaderboards, and remote
  integrations remain absent and disabled. They require separate accepted service,
  security, privacy, abuse, and operational decisions; they are not presented as
  functioning product capabilities.
- This ADR selects the side-panel recommendation from ADR-004, the local lightweight
  capture boundary from ADR-009, and the capability-based `sidePanel` addition from
  ADR-012. It does not accept ADR-005's larger IndexedDB event migration or ADR-006's
  DNR blocking mechanism.

## Consequences

- V2 becomes a coherent local intentional-browsing system instead of a tracker with
  disconnected utilities.
- Users can see the exact scope of a Focus Contract before any tab changes and can
  recover after every supported bulk cleanup.
- Backups now contain explicit captured URLs and titles; privacy copy and store
  disclosures must distinguish these user-selected records from aggregate tracking.
- A single bounded document is simpler to migrate and audit for this scale, but it is
  not a general event platform. A future change would require a new schema and ADR.
- Social or cloud value is not faked. The cost is that multi-device and shared use
  cases are deliberately unavailable in this local release.

## Validation

- Unit-test product sanitizers, relationship repair, URL rejection, duplicate
  identity, limits, backup round-trips, and fail-closed corruption behavior.
- Worker-test Focus Contract preview/start/finish, pre-mutation checkpoint order,
  guard decisions, schedule budgeting, and source-context message authorization.
- Verify side-panel IDs, labels, dialogs, keyboard focus, reduced motion, high
  contrast, forced colors, dark mode, and narrow widths.
- Exercise saved Space restore, Return Capsule loop, duplicate two-step confirmation,
  checkpoint restore, and post-focus recovery in an unpacked extension.
- Run the full deterministic package and network-policy gate before release.

## Status

Superseded in product-surface scope by ADR-023. Its bounded schema, local-only data,
validation, backup compatibility, and connected-feature exclusions remain accepted;
Profiles, Plans, Spaces, schedules, guard, and recovery navigation are retired.
