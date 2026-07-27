# Tabyss — Release QA Checklist

Run before every store submission. Load unpacked from `chrome://extensions`
(Developer mode) unless testing the packaged zip.

## Install / lifecycle
- [ ] Loads with no errors in the service-worker console (`chrome://extensions` → Inspect).
- [ ] First install opens the dashboard once (welcome).
- [ ] Icons show on the toolbar and in `chrome://extensions`.
- [ ] Reloading the extension keeps existing data.

## Tracking accuracy
- [ ] Browse a focused tab ~2 min → that domain's time increases (~1-min granularity).
- [ ] Switch tabs → time moves to the new domain, not double-counted.
- [ ] Minimize / unfocus the window → tracking pauses.
- [ ] Go idle > idle-threshold → tracking pauses; resumes on return.
- [ ] `chrome://` pages and the new-tab page are not tracked.
- [ ] A domain in the ignore list is never tracked.

## Popup
- [ ] Shows today total, productive %, category bar + legend, top 5 sites.
- [ ] Empty state shows when there's no data yet.
- [ ] "Reset today" (two-click) clears today; "Full dashboard" and "Settings" open.

## Dashboard
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

## Settings / data
- [ ] Category override changes a site's category everywhere after save.
- [ ] Ignore list + idle + retention persist across reload.
- [ ] Export → Clear all → Import restores the data.
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
