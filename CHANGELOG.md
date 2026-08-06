# Changelog

All notable changes to Tabyss. Format based on Keep a Changelog; versioning is SemVer.

## [Unreleased]

### Fixed
- Saved Pages no longer rejects valid sites whose browser-provided title exceeds
  the 120-character storage limit; long titles are shortened safely before saving.
- Saved Pages now reports over-limit notes precisely and explicitly refuses to save
  an Incognito active tab, matching the privacy contract.
- Legacy browser-generated titles in saved pages, Spaces, and checkpoints are now
  normalized during validation so one old record cannot block every new save.

## [2.5.0] — 2026-08-07 · "Reminders that fire"

### Fixed
- **Office mode never fired.** The water/stand cycles were restarted by a 90s
  gap check meant to detect machine sleep, but MV3 suspends the worker and
  delays alarms well past 90s exactly when the browser is backgrounded — which
  is when Office mode is meant to count. Only a real 10-minute sleep gap
  restarts them now; presence stays with the idle check.
- **Eye breaks froze in other apps.** The clock only advanced while Chrome held
  focus, so the threshold was never reached and no notification could be sent.
  It now follows desk presence.
- **Deleting a saved page silently stopped working.** It used `confirm()`;
  once a user ticks Chrome's "prevent this page from creating additional
  dialogues" that returns false forever. Destructive actions now arm their own
  button, which cannot be suppressed.
- Saved-page actions were bound to the list container, so any control outside
  it never fired.
- Settings silently clamped out-of-range numbers while the field kept showing
  what was typed. Stored values are written back after every save.
- Non-finite wellness timestamps from older builds made every comparison NaN
  and disabled reminders outright.
- Empty days in the day-by-day chart rendered a grey block instead of a stub.

### Changed
- Breaks are delivered as an OS notification only. The page overlay depended on
  a content script, which is injected only when a page loads, so every tab
  already open at install or update silently had no receiver.
- Feed-scroll classification removed; it covered five exact URLs and reported
  zero everywhere else while appearing complete. Existing history still imports.
- Display, labels and figures move to a DIN-derived signage face; true monospace
  is reserved for domain lists.
- Dashboard is full width, with day/week/month scope and panels grouped into
  four frames.
- Settings rebuilt as switch rows with Save pinned to the header.
- Eye-break interval floor lowered from 5 to 1 minute.

### Added
- Session dial in the popup header; the intentional session drops from it.
- Scroll and watch figures surfaced in Today.
- Notification sound toggle, Delete all for saved pages, Reset to defaults.

### Internal
- Test suite goes from 11 failures to zero — four covered features deleted in
  2.3.0, four asserted the retired `theme` key, one asserted behaviour that was
  deliberately changed, two were written against exact markup. `verify.ps1`
  passes end to end, including the reproducible-package gate.

## [2.4.0] — 2026-08-02 · "Design parity, wave 1"

### Firefox
- Android-compatible: `gecko_android` declared; tracking falls back to the
  active tab where the windows/idle APIs don't exist (Android reads the
  foreground tab as attention), notifications and badges degrade silently,
  and the popup renders as a full-width sheet on Android.
- First Firefox package (`build-firefox/`, AMO zip): MV3 event-page background
  (manifest script order replaces importScripts), `sidebar_action` replaces the
  Chrome side panel, notification buttons feature-detected (Firefox shows
  body-click notifications), gecko id + data_collection_permissions "none".
  Favicons gracefully fall back to letter tiles (no `_favicon` endpoint in
  Firefox). Shared source is now cross-browser; the Chrome build is unchanged
  in behavior. web-ext lint: 0 errors.

### Added
- Focus check-out: optional "Define done" on start; Complete/End now offer an
  optional result note, plus an end reason when unfinished — the dashboard has
  displayed these all along (ADR-029).
- Amber toolbar dot while a session is live; cleared on every ending path.
- Drawn badge medallions replace emoji badges; locked badges render grey.
- Peak-hour callout under the hour heatmap; rabbit-hole definition surfaced.
- Trust proof-lines on the dashboard and in Settings → Your data.

### Changed
- Wrapped slides follow a fixed abyss→ember gradient story.
- Wellbeing microcopy pass ("Water o'clock", "Unfold yourself", "The feed will
  keep", "Eyes need a horizon", honest skip label, kinder empty states);
  goal notifications state that checks are on-device with no site name.
- Score/budget/compare colours use semantic palette tokens; slim scrollbar.
- Consistent "Wrapped ✦" naming across popup and dashboard.

## [2.3.0] — 2026-08-02 · "Local favicon fidelity"

### Changed
- Watch time & wellbeing site rows now show real favicons whenever Chrome
  already has one locally: the exact URL of an open regular tab on the same
  domain is preferred, then the canonical domain, then a palette-tinted letter
  fallback (ADR-028). Sourcing is exclusively Chrome's local /_favicon/
  endpoint — no remote favicon service, no network requests, no new
  permissions, nothing persisted; Incognito tabs are never consulted.
- Race-safe shared favicon renderer: a broken-image glyph can never appear and
  icon success/failure causes no layout shift.

## [2.2.0] — 2026-08-02 · "Colour personalization"

### Appearance
- Six selectable colour palettes (Cobalt Focus default, Teal Clarity, Abyss
  Violet, Plum Premium, Forest Calm, Ember Energy), each with full light and
  dark sets, combined independently with System / Light / Dark appearance.
  Accessible radio-cards with names, descriptions and swatches; immediate
  preview; persisted via the existing Save action; invalid or legacy values
  (including the retired `theme` key) fall back safely to Cobalt + System
  (ADR-027).
- All surfaces consume shared semantic CSS variables; success/warning/danger
  keep their meaning in every palette. Open pages restyle live on storage
  changes and System follows the OS with no flash.

### Fixed
- Popup no longer draws an inner border/rounded frame over the popup window,
  and the footer sits in normal flow instead of overlapping scrolled content.
- Persona details panel restyled for readable text.

### Changed
- Settings sections are now tap-to-collapse; Appearance opens by default.
- "Reset today" moved from the popup footer to Settings → Your data
  (two-step confirm).
- Saved Pages side panel simplified: duplicate in-page header removed, one
  clean full-width Save action with an optional note field; behavior unchanged.
- Buttons across the extension are larger and consistent (42px minimum).

## [2.1.0] — 2026-08-02 · "Production hardening"

- Name restored to "Tabyss — Know Your Scroll"; audit fixes across export
  (per-record salvage), focus state machine (clock-rollback clamp, unified
  extend), hour/midnight time attribution, storage-mutex settings saves
  (`SAVE_SETTINGS`), unhandled-rejection cleanup, dead Plans/Spaces worker
  code removal, Wrapped intentional-sessions slide and escape-at-fill
  hardening, side panel duplicate-tab hint, popup fixed 380px width
  (vw collapse), dashboard keyboard access, options inline status.

## [2.0.0] — 2026-08-02 · "Intentional Browsing"

### Brand continuity
- Restored the exact V1.5 logo at 16px, 48px, and 128px. The Calm Optimistic UI
  system remains, while the established product mark stays unchanged.

### Abyss & Ember appearance
- Adopted the owner-supplied Abyss & Ember light/dark tokens, display/body/micro-label
  type roles, solid-violet primary actions, and quieter lavender/deep-plum surfaces
  across the extension while preserving the original V1.5 logo.
- Added an accessible System / Light / Dark picker at the top of Settings. It
  previews immediately, saves locally, follows the device by default, and adds no
  network, dependency, permission, account, or telemetry.
- Rounded the popup shell to 22px and the in-page heads-up/break surfaces to 18/24px.
  Added regression coverage for exact tokens, theme allowlisting, controls, and edge
  geometry.

### Simpler product surface
- Replaced the multi-section Command Center with one accessible **Saved pages** side
  panel that opens from the popup bookmark button or `Alt+Shift+T`.
- Removed Profiles, reusable Plans, Spaces, weekly outcome counters, manual
  checkpoints, duplicate cleanup, and Recovery from the user-facing side panel.
- Renamed Later/Return Capsules to Saved pages and reduced the workflow to Save
  current page, optional note, Open, Mark completed, Save again, Delete, and three
  plain filters.
- Saved pages now combines records from every former Profile and shows exact-page,
  Chrome-cached favicons with a resilient letter fallback and no remote service.
- Added native form semantics, pressed filter state, live status/count announcements,
  busy state, keyboard focus, and narrow-layout controls.
- Stopped retired Plan schedule notifications and drift-guard activation. Existing
  compatibility records remain local and exportable instead of being deleted.

### Schema, permissions, and trust
- Added versioned and bounded local product schema 1; storage metadata is now schema
  3 and portable backups are format 4 with Plans, Spaces, Capsules, checkpoints, and
  recovery records included.
- Added only the `sidePanel` permission and raised the supported Chrome baseline to
  116. Connected sync, remote AI, accounts, social comparison, and hard blocking are
  absent rather than simulated.
- Added product-model and worker integration coverage for safe URL capture, limits,
  relationship repair, compatibility records, permissions, packaging, and UI
  contracts, including an explicit absence test for retired side-panel concepts.

### Intentional focus
- Replaced the two-stage Finish/checkout form with direct one-click Complete and End
  actions. No reason or note is required, and a committed outcome gets immediate
  visible confirmation.
- Added a bounded, domain-only Sites visited trail to the live popup session and
  dashboard history. It reuses Incognito/ignore/active-tab rules, stores no full URL,
  and remains local, portable, and retention-controlled.
- Simplified the popup session to one task, one duration, and Start; Today's insight
  now leads the popup and the session uses a quieter secondary card.
- Removed definition-of-done and ending-reason questions from new popup sessions,
  made 25 minutes the default, and kept pause, extend, and direct outcome controls.
  Earlier richer note records remain readable and portable.
- Added an intention-first popup flow with 25/50/90-minute timers or an open-ended
  stopwatch, pause/resume, ten-minute extension, and explicit completed/ended
  outcomes.
- Added a per-day dashboard reflection panel that keeps chosen focus sessions
  distinct from passive browsing analytics.
- Active sessions recover across popup closure, worker suspension, and browser
  restart using persisted timestamps; timer expiry enters review instead of
  auto-completing work, and open-ended sessions have a 12-hour safety review.
- Focus outcomes follow retention/reset/clear behavior and portable backup format 4.
  Restores are blocked while a valid focus session is active.

### Security & privacy
- Incognito tabs are excluded from both foreground-time and media tracking.
- Ignore rules cover the selected domain and its subdomains with label-boundary-safe
  matching.
- Site names are hidden from OS notifications by default, with an explicit opt-in.
- Extension storage is restricted to trusted extension contexts; runtime messages are
  allowlisted by action and sender type.
- JSON restores enforce a 5 MB UI limit, a versioned allowlisted schema, bounded
  values, valid dates/domains/categories, depth/entry limits, and prototype-pollution
  defenses. The worker validates again before writing.
- Restore now previews affected sections and downloads a safety backup first; restore,
  clear, reset, and tracking writes share the same storage mutex.

### Quality
- Added dependency-free regression tests for domain privacy rules, settings bounds,
  legacy/current backup compatibility, malformed data, and unsafe object keys.
- Added manifest, permission, package-content, local-asset, and zero-network policy
  tests plus a single local/CI verification command.
- Packaging now reads one explicit runtime contract and produces stable entry order,
  timestamps, and SHA-256 output; CI rebuilds twice to detect non-reproducibility.

## [1.4.0] — 2026-07-27 · "The Refinement Update" (final)
### Changed — from real-usage feedback
- **Popup redesigned for hierarchy, not decoration**: a proper hero (today's total +
  focus ring), an **"Up next" timeline** (eye break / water / stand countdowns,
  streak, switches), a compact media strip, then categories and top sites. Sentence-
  case labels, mono reserved for numbers, far fewer emoji — the "childish" look is gone.
- **No more "no data"**: under 30 minutes the ring shows live progress toward the
  first score ("warming up · 24m"); a fresh install says "fresh start".
- **Settings is now a full-page experience** (opens in its own tab) with a header,
  favicon site rows, a **category search box**, and per-category counts.
### Added
- **Two new categories: Education and Career**, counted as productive time for
  focus/streaks (studying and job-hunting are work).
- **Category engine v2** — ~3× the built-in rules (incl. Indian sites, MS/Google
  cloud, AI tools, job portals, ed-tech) plus **keyword heuristics** so unknown
  sites self-classify (university→Education, jobs→Career, forms/docs→Productive…)
  instead of drowning "Other".
- **Pre-break warning animation** — an animated countdown pill slides onto the page
  ~60s before an eye break, so the blur never surprises you.

## [1.3.0] — 2026-07-27 · "The Wellness Update"
### Added
- **Watch-time & doomscroll detection** 🎬📱🌀 — a content script classifies what's
  really happening: **video** (genuine long-form playback), **shorts** (YT Shorts /
  Reels / TikTok surfaces), and **feed doomscroll** (sustained ≥8 gestures/min on
  known feed pages only — normal webpage scrolling never counts). Daily totals per
  kind + top domain on the dashboard and popup.
- **20-20-20 eye breaks** 👀 — after 20 min of continuous screen time (configurable),
  the page **blurs** with a 20-second break card: Snooze / Skip, auto-complete on
  countdown. Falls back to a notification with buttons where a page overlay can't run.
- **Office Mode** 🏢 — water reminders 💧 (default every 50 min) and stand-up/walk
  reminders 🚶 (default every 60 min), as page overlays or notifications, with
  Done/Snooze. Toggle lives right in the popup.
- **Real site favicons** in the popup and dashboard site lists (Chrome's built-in
  favicon cache — still zero network), with letter-chip fallback.
- Wellness counters per day (breaks taken/skipped, water, stand-ups) in the
  dashboard's new "Watch time & wellness" panel; media/wellness data included in
  export/import, retention pruning, and reset.
### Changed
- **New visual identity** — the whole UI moved onto the violet → pink → orange
  gradient of the icon (light + dark), replacing the muted blue.
### Permissions
- Added a content script on http/https pages (media detection + break overlays —
  all processing stays on-device) and the `favicon` permission (Chrome's local
  favicon cache).

## [1.2.0] — 2026-07-27 · "The Personality Update"
### Added
- **Browsing Personality** 🎭 — 50+ personas (6 archetypes × 4 rhythms × 4 intensity
  editions + specials like The Ghost and The Redemption Arc), computed weekly from
  your patterns, shown as an animated gradient hero card on the dashboard.
- **Weekly Wrapped** ✨ — a 9-slide, full-screen recap (total, top site, categories,
  rhythm, rabbit holes, focus score, persona reveal) with a **canvas-rendered
  1080×1080 share card** saved locally as PNG. Privacy default: the card shows
  categories only — including your top site is an explicit opt-in toggle.
- **Focus Score (0–100)** — 65 pts productive share + 30 pts switch discipline +
  5 participation, −6 per rabbit hole. Days under 30 minutes honestly show
  "not enough activity" instead of a scary 0. Shown as a ring in the popup and a
  tile on the dashboard.
- **Streaks with forgiveness** 🔥 — consecutive 30m+ productive days; today gets
  grace, and one rest day per streak is forgiven.
- **12 badges** — First Steps → Century Club, with earned/unearned states.
- **Rabbit-hole detector** 🕳️ — 25m+ continuous single-site Entertainment/Social
  runs, listed per day on the dashboard.
- **Site-switch counter** 🔀 — per-day context-switch count feeding the focus score.
- **vs last week** — per-category deltas with good/bad coloring.
- **Goal budgets in the popup** — live "Xm left of Ym" meters (over-budget shown
  honestly as "over by Xm").
- **Digital sunset** 🌆 — optional late-night nudge on Entertainment/Social sites
  (default 11pm–4am, 2h cooldown, toggleable in Settings).
### Fixed (from the 15-agent adversarial review)
- **Storage race** — flush/maintenance/reset now serialize through a single
  mutex; concurrent read-modify-write could silently erase committed minutes,
  rabbit holes, and notification flags (and un-prune retained data).
- **Sleep-gap stitching** — a laptop lid-close no longer glues two same-site
  sessions into one false "continuous" rabbit hole.
- **Export/import round-trip** now carries switches, holes, and notified data
  (was silently dropping all v1.2 analytics on restore).
- **Saving settings no longer deletes overrides** for domains outside the
  current usage window.
- **Reset today** is now performed by the worker inside the mutex and clears the
  live session — deleted data can't partially reappear one tick later.
- **Hero contrast** — light persona gradients (The Ghost, The First Edition…)
  flip the card to dark ink; white-on-light was ~1.4:1 contrast.
- **clean_week / goal_keeper badges** can no longer be earned trivially or
  retroactively (participation threshold + goals-active marker).
- **Share card** measures and shrinks the stats line — long domains can't
  overflow the canvas.
- **Chrome 111–115 compatibility** — idle detection uses the callback API shim
  (promise form needs Chrome 116+; it would have broken all tracking).
- **Category matching now respects domain boundaries** — netflix.com was matching
  the "x.com" rule by substring and getting filed under Social. Real bug, real fix.
- **Video watching now counts** — audible tabs are treated as active even without
  keyboard/mouse input, so a Netflix binge no longer reads as "idle".
- Focus formula reaches a true 100 on a perfect day (was capped at 90).

## [1.1.0] — 2026-07-27

## [1.1.0] — 2026-07-27
### Added
- **Weekly & monthly analytics**: this-week / this-month totals, daily averages, and
  a week-over-week delta.
- **Calendar heatmap** (GitHub-style, last 12 weeks) — click any day to inspect it.
### Changed
- New **gradient hourglass icon** (violet → pink → orange).

## [1.0.1] — 2026-07-27
### Fixed
- First-run showed 0 until the next 1-minute tick. Tracking now starts a session
  immediately on install/startup, and opening the popup or dashboard forces a commit
  (`FLUSH_NOW`) so today's time is always up to date the moment you look.

## [1.0.0] — 2026-07-26
First public release.

### Added
- On-device time tracking per **domain**, per **day**, and per **hour-of-day**.
- **Categories** (Productive / Social / Entertainment / News / Shopping / Other) with a
  default rule set and per-domain overrides.
- **Popup**: today's total, productive %, category breakdown bar, and top sites.
- **Dashboard**: stat tiles (total, vs. previous day, productive %, peak hour, sites),
  category **donut**, hour-of-day **heatmap**, **7-day trend**, and per-day site list.
- **Daily goals** per category with a desktop **notification** on breach (click opens
  the dashboard).
- **Settings**: goals, category overrides, ignore list, idle threshold, retention window.
- **Data controls**: export/import JSON, reset today, clear all.
- Automatic **data retention** (default 180 days) with periodic pruning.
- Accessible light/dark themes; reduced-motion support; keyboard focus states.

### Security & privacy
- No network requests; no account; all data in `chrome.storage.local`.

### Internal (pre-release)
- 0.2.0 — categories, goals, dashboard, options page, icons.
- 0.1.0 — minimal per-site tracker with popup + basic dashboard.
