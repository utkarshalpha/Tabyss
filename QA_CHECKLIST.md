# Tabyss — Release QA Checklist

Run before every store submission. Load unpacked from `chrome://extensions`
(Developer mode) unless testing the packaged zip.

## Install / lifecycle
- [ ] Loads with no errors in the service-worker console (`chrome://extensions` → Inspect).
- [ ] First install opens the dashboard once (welcome).
- [ ] Icons show on the toolbar and in `chrome://extensions`.
- [ ] Reloading the extension keeps existing data.

## V2 Saved pages
- [ ] Popup bookmark button and `Alt+Shift+T` open Saved pages in the side panel;
      full-tab fallback remains usable if side-panel opening is unavailable.
- [ ] The first view contains no Profile, Plan, Space, outcome metric, checkpoint,
      duplicate-cleanup, or Recovery controls.
- [ ] Save current page stores the active safe HTTP(S) URL/title and optional note,
      resets the form, announces success, and shows the locally cached favicon or
      letter fallback.
- [ ] A site title longer than 120 characters is safely shortened without blocking
      the save; an over-limit note gets a note-specific error and keeps the input.
- [ ] Saving from an Incognito or unsupported browser page fails without creating a
      record; the message explains the privacy or URL boundary.
- [ ] Saved pages from every former Profile appear together so the simplified UI
      never strands existing records.
- [ ] Open page, Mark completed, Save again, and confirmed Delete behave correctly.
- [ ] Saved, Completed, and All filters expose accurate `aria-pressed` state and the
      count/status changes are announced without moving focus.
- [ ] Empty, loading, invalid URL, worker error, storage limit, and stale-record
      states preserve entered text where appropriate and provide a recovery action.
- [ ] Plan schedules do not notify and the retired drift guard is never injected.
- [ ] Existing compatibility Plan/Space/checkpoint records survive update and remain
      present in a validated export without appearing in the Saved pages interface.
- [ ] Updating with a legacy saved page, Space, or checkpoint whose browser title is
      over 120 characters preserves the record and does not block a new page save.
- [ ] At 320px width and 200% zoom, the save controls stack without horizontal
      scrolling; keyboard, screen-reader, light/dark, reduced-motion, forced-colors,
      and high-contrast checks pass.

## Tracking accuracy
- [ ] Browse a focused tab ~2 min → that domain's time increases (~1-min granularity).
- [ ] Switch tabs → time moves to the new domain, not double-counted.
- [ ] Minimize / unfocus the window → tracking pauses.
- [ ] Go idle > idle-threshold → tracking pauses; resumes on return.
- [ ] `chrome://` pages and the new-tab page are not tracked.
- [ ] A domain in the ignore list is never tracked.
- [ ] `example.com` in the ignore list also excludes `mail.example.com`, but does
      not exclude `evil-example.com`.
- [ ] Invalid ignore input is rejected with a clear error instead of silently
      pretending the domain is excluded.
- [ ] Enable Tabyss in Incognito, browse for 2+ min, then return to a regular window:
      the Incognito domain and time never appear in popup, dashboard, or export.

## Popup
- [ ] Today's insight appears before the quieter Intentional Session card; no hero
      marketing headline, definition-of-done field, or ending-reason selector appears.
- [ ] Create a 25/50/90-minute or open-ended session with a one-line task; 25 minutes
      is the default, the form is
      replaced by the active controls and reopening the popup preserves the session.
- [ ] Open-ended mode counts upward; timer mode counts down; neither drifts after
      closing/reopening the popup or sleeping/waking the machine.
- [ ] Pause freezes elapsed time; Resume continues it; +10 min changes a timer target.
- [ ] Complete and End each commit the correct dashboard outcome in one click, show
      visible confirmation, and never open a checkout, reason, or note form.
- [ ] Sites visited appears in the active card and dashboard history with favicon or
      letter fallback; it is deduplicated, capped at 24 domains, and excludes
      Incognito, ignored, unsupported, unfocused, paused, and non-counting idle use.
- [ ] Timer expiry enters Review and does not auto-complete; extend resumes it.
- [ ] Reload the extension and restart Chrome during running and paused sessions;
      state recovers and the focus alarm is recreated from timestamps.
- [ ] Empty, invalid-input, worker-error, paused, review, and completed states have
      truthful copy and no overlapping creation/active controls.
- [ ] Shows today total, productive %, category bar + legend, top 5 sites.
- [ ] Empty state shows when there's no data yet.
- [ ] "Reset today" (two-click) clears today; "Full dashboard" and "Settings" open.

## Dashboard
- [ ] Intentional Focus shows the selected day's total, completion count, active
      session when relevant, and completed/unfinished records without changing
      passive browsing totals or Focus Score.
- [ ] Tiles correct: total, vs. prev day (▲/▼), productive %, peak hour, sites.
- [ ] Donut segments + legend percentages sum to ~100%; center shows total.
- [ ] Heatmap highlights active hours; hover shows per-hour time.
- [ ] 7-day trend bars render; clicking a day re-renders everything for that day.
- [ ] Prev/Next day navigation works, including empty days.
- [ ] Sites list sorted desc with correct category tags/colors.
- [ ] Export downloads a valid JSON file.

## Goals & notifications
- [ ] Set a small goal (e.g. Social = 1 min), exceed it → one desktop notification.
- [ ] Notification does not repeat the same day for the same category.
- [ ] Clicking the notification opens the dashboard.
- [ ] Popup shows the goal-breach chip.
- [ ] Daily recap and Digital sunset notifications contain no domain by default.
- [ ] Enable "Show site names in notifications" → recap/sunset may include the domain;
      disable it again → details are redacted.

## Settings / data
- [ ] Appearance exposes native System, Light, and Dark choices; each preview is
      immediate, Save persists it across popup/dashboard/side-panel/Settings reloads,
      and System follows a live OS-theme change.
- [ ] Abyss & Ember light/dark tokens render without flashes or unreadable controls;
      the V1.5 logo remains unchanged and the popup edge is visibly rounded at 22px.
- [ ] Category override changes a site's category everywhere after save.
- [ ] Ignore list + idle + retention persist across reload.
- [ ] Export → Clear all → Import restores the data.
- [ ] Export contains `exportedFrom`, `formatVersion`, `exportedAt`, and all ten
      restorable sections.
- [ ] Import preview lists the sections that will change and downloads a
      `tabyss-before-import-*.json` safety backup before restore.
- [ ] Canceling the import preview changes nothing and downloads no safety backup.
- [ ] Import rejects: non-Tabyss JSON, a future format version, invalid dates/hours,
      negative counters, unsafe `__proto__`/`constructor` keys, and files over 5 MB.
- [ ] Import and "Clear all data" complete without deleted/live session data
      reappearing on the next tracking tick.
- [ ] Import during an active focus session is refused without changing stored data;
      checkout first, then the same import succeeds.
- [ ] Format-2/3 backups remain readable; format-4 focus and product records round-trip.
- [ ] Retention: entries older than the window are pruned (verify via export).

## v1.2 — Personality, Wrapped, focus & detectors
- [ ] Hero card shows a persona; with <4 active days or <3h it shows **The Ghost**.
- [ ] Persona gradient animates (and does NOT animate with reduced motion).
- [ ] "See your Wrapped ✨" opens the slideshow; ←/→/click navigate; ✕ closes.
- [ ] Wrapped with <30m of weekly data shows the "still getting to know you" teaser.
- [ ] Share card: default has **no site name**; toggle adds it; Save downloads a PNG.
- [ ] Focus ring in popup matches the dashboard Focus tile for today.
- [ ] Day with <30m tracked shows "—" focus, not 0.
- [ ] Streak survives exactly one rest day; two consecutive misses break it.
- [ ] Site switches increment when jumping between different sites (not same-site tabs).
- [ ] Rabbit hole appears after 25m+ continuous on one Entertainment/Social site.
- [ ] Playing a video full-screen for 5+ min without touching input still tracks (audible tab).
- [ ] vs-last-week panel: green = productive up / others down; red = the reverse.
- [ ] Badges: earned are colored, unearned grayed; tooltips show unlock conditions.
- [ ] Goal budgets: meter turns amber at 75%, red + "over by Xm" past the limit.
- [ ] Digital sunset: with start=23, a Social/Entertainment site at 23:30 notifies once;
      again only after 2h; toggle off in Settings stops it.
- [ ] netflix.com categorizes as Entertainment (not Social) — domain-boundary check.

## v1.3 — Media detection, breaks & office mode
- [ ] YouTube normal video (unmuted, >90s) accrues 🎬 video time; a muted autoplay
      teaser on a homepage does NOT.
- [ ] youtube.com/shorts, Instagram Reels, TikTok accrue 📱 shorts time while
      playing/flicking; an abandoned shorts tab does not.
- [ ] Scrolling x.com/home fast accrues 🌀 doomscroll; slow-reading an article or a
      single X thread does NOT (strict ≥8 gestures/min + feed-URL gate).
- [ ] Media stops accruing when the tab is backgrounded or window unfocused.
- [ ] After 20 min continuous browsing, the page blurs with the 20s eye-break card;
      countdown auto-completes → eyeTaken increments.
- [ ] Snooze re-fires the eye break after the snooze period; Skip increments skipped.
- [ ] On a page without content scripts (chrome://), the eye break arrives as a
      notification with Done/Snooze buttons.
- [ ] Office mode ON: water reminder fires on its cycle; Done resets the cycle;
      Snooze 10m re-fires in ~10m; stand reminder independent.
- [ ] Office mode toggle in popup persists and survives an options-page save.
- [ ] Favicons render in popup/dashboard site lists; unknown sites fall back to
      letter chips.
- [ ] New violet identity renders correctly in light AND dark themes.

## Accessibility / theming
- [ ] Tab-key focus rings visible on all controls.
- [ ] Looks correct in System, forced Light, and forced Dark, including a forced
      theme opposite to the OS theme.
- [ ] `prefers-reduced-motion` disables transitions.

## Packaging
- [ ] `package.ps1` produces `tabyss-v<version>.zip` with only runtime files.
- [ ] Zip loads cleanly as an unpacked/dragged extension with no missing-file errors.

## Appearance (v2.2)
- [ ] Six palette cards render with name, description, and three swatches; selection is visibly indicated.
- [ ] Palette or appearance change previews immediately without saving; Save persists across restart.
- [ ] System follows the OS scheme live; explicit Light overrides a dark OS and Dark overrides a light OS.
- [ ] All twelve palette x scheme combinations keep body text readable and primary buttons legible (on-brand text).
- [ ] Charts, progress bars, focus rings, and doodles redraw on palette/appearance change; forms, sessions, filters, and scroll state survive.
- [ ] Invalid/legacy imported values fall back to Cobalt + System; other settings untouched.
- [ ] Keyboard: palette and appearance radios reachable and announced; visible focus ring; forced-colours and reduced-motion unaffected.

## Favicons (v2.3)
- [ ] A wellbeing site currently open in a tab shows its real favicon; closing the tab still resolves via the canonical domain.
- [ ] A site with no cached icon keeps a clean palette-tinted letter — never a broken-image glyph.
- [ ] Icons load without layout shift; rows re-render correctly on day navigation and theme change.
- [ ] DevTools network panel on the dashboard shows only chrome-extension:// favicon requests — zero remote requests.
- [ ] Incognito windows contribute no favicon candidates.

## Design parity wave 1 (v2.4)
- [ ] Start form shows "Define done · optional"; saved definition appears as "Done meant: ..." in dashboard history.
- [ ] Complete/End open the check-out; End shows the reason select; Back returns without ending; note and reason land in history.
- [ ] Toolbar shows the amber dot while a session runs (also after closing the popup) and clears on complete/end/reset/import/clear.
- [ ] Badges render as drawn medallions (earned colourful, locked grey) in every palette and scheme.
- [ ] Wrapped deck colours run violet → magenta → red → ember across slides.
- [ ] Notifications show the new titles; goal alert includes the on-device reassurance line.
