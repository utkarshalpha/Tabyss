# Changelog

All notable changes to Tabyss. Format based on Keep a Changelog; versioning is SemVer.

## [2.0.0] — 2026-08-02 · "Intentional Browsing"

### Command Center and plans
- Added the V2 side-panel Command Center with Personal, Work, Study, and bounded
  custom Profiles; it opens from the popup or with `Alt+Shift+T`.
- Added reusable Plans with intention, definition of done, timer/open-ended mode,
  observe/mindful-nudge protection, allow-only or pause-site rules, selected pages,
  linked Space, tab parking, post-focus restore, and local recurring reminders.
- Added a Focus Contract preview showing every tab that will open or park before the
  user confirms. A durable checkpoint is written before any tab mutation.
- Added a cross-surface active-session card with pause/resume, extension, honest
  completed/unfinished checkout, and post-focus workspace restoration.

### Context, detours, and recovery
- Added Spaces to save the current window and restore only missing HTTP(S) tabs.
- Added Return Capsules to explicitly save the active URL/title and optional note,
  reopen it, mark the loop done, reopen it, or delete it.
- Added mindful drift recovery during protected Plans: Return to plan, Save for later
  and return, or Continue for a bounded period. Fullscreen, login, authentication,
  payment, and checkout paths stay quiet.
- Added duplicate detection with fragment-safe URL normalization, two-step close
  confirmation, and an automatic pre-cleanup checkpoint.
- Added manual and automatic bounded checkpoints with de-duplicated restore.
- Added a local weekly North Star (intentional outcome days) with focus minutes and
  successful returns in the Command Center. No telemetry or external product
  analytics were added.

### Schema, permissions, and trust
- Added versioned and bounded local product schema 1; storage metadata is now schema
  3 and portable backups are format 4 with Plans, Spaces, Capsules, checkpoints, and
  recovery records included.
- Added only the `sidePanel` permission and raised the supported Chrome baseline to
  116. Connected sync, remote AI, accounts, social comparison, and hard blocking are
  absent rather than simulated.
- Added product-model and worker integration coverage for safe URL capture, limits,
  relationship repair, Focus Contract recovery ordering, guard decisions, schedules,
  duplicate cleanup, permissions, packaging, and UI contracts.

### Intentional focus
- Added an intention-first popup flow with 25/50/90-minute timers or an open-ended
  stopwatch, optional definition of done, pause/resume, ten-minute extension, and
  explicit completed/unfinished checkout with an optional local note.
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
