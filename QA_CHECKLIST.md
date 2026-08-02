# Tabyss — Release QA Checklist

Run before every store submission. Load unpacked from `chrome://extensions`
(Developer mode) unless testing the packaged zip.

## Install / lifecycle
- [ ] Loads with no errors in the service-worker console (`chrome://extensions` → Inspect).
- [ ] First install opens the dashboard once (welcome).
- [ ] Icons show on the toolbar and in `chrome://extensions`.
- [ ] Reloading the extension keeps existing data.

## V2 Command Center and Profiles
- [ ] Popup Command Center button and `Alt+Shift+T` open the side panel; full-tab
      fallback remains usable if side-panel opening is unavailable.
- [ ] Personal, Work, and Study are present; a custom Profile can be added, selected,
      and removed only after confirmation. Removing it deletes only its Plans, Spaces,
      and Return Capsules.
- [ ] Empty Plans view offers Deep work and Study sprint starters without creating
      data until selected.
- [ ] Plan editor validates bounded name/intention, HTTP(S) pages, canonical domains,
      timer/open-ended mode, observe/nudge protection, optional Space, parking,
      restore preference, and local schedule.
- [ ] Allow-only rules form the complete plan when present; the pause list is used
      only when the allow-only list is blank.
- [ ] Local schedule notifies once for the configured minute/day, stays within the
      daily budget, uses generic lock-screen copy, and never starts work automatically.

## Focus Contract, drift, and recovery
- [ ] Preview lists every unpinned tab to park and missing Plan/Space page to open;
      Cancel changes nothing.
- [ ] Confirm writes a checkpoint before any open/close operation, opens missing
      context without duplicates, parks only previewed tabs, and starts the focus
      state visible in popup and Command Center.
- [ ] Observe mode never injects a guard. Nudge mode offers Return to plan, Save for
      later & return, and Continue for 10 minutes on an outside-plan domain.
- [ ] Guard stays quiet on fullscreen and login/signin/auth/payment/checkout paths;
      it never reads or includes page content.
- [ ] Finishing or ending a Plan offers its pre-focus checkpoint; Restore opens only
      missing tabs, while Keep current tabs leaves the browser unchanged.
- [ ] Save active page creates a Return Capsule with local URL/title and optional
      note; Open, Mark done, Reopen loop, and Delete all behave correctly.
- [ ] Saving/updating/restoring a Space de-duplicates URLs and excludes Incognito and
      unsupported URL schemes.
- [ ] Duplicate cleanup shows the repeated-page and extra-tab count, requires two
      clicks, keeps the active/first copy, and creates a restorable checkpoint first.
- [ ] Manual checkpoint and restore work with partial failures; restore never closes
      current tabs or repeats already-open pages.
- [ ] Multi-window, 100-tab boundary, worker interruption during a confirmed action,
      corrupt product data, and near-storage-quota paths fail safely.

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
- [ ] Create a 25/50/90-minute focus session with a one-line intention; the form is
      replaced by the active controls and reopening the popup preserves the session.
- [ ] Open-ended mode counts upward; timer mode counts down; neither drifts after
      closing/reopening the popup or sleeping/waking the machine.
- [ ] Pause freezes elapsed time; Resume continues it; +10 min changes a timer target.
- [ ] Check out as Completed and End unfinished both create the correct dashboard
      outcome; optional definition, reason, and note render safely as text.
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
- [ ] Looks correct in both light and dark OS themes.
- [ ] `prefers-reduced-motion` disables transitions.

## Packaging
- [ ] `package.ps1` produces `tabyss-v<version>.zip` with only runtime files.
- [ ] Zip loads cleanly as an unpacked/dragged extension with no missing-file errors.
