# Tabyss — Chrome Web Store Listing Kit

Everything you need to paste into the Web Store Developer Dashboard.

## Title
`Tabyss — Intentional Browsing`

## Summary (short description, ≤ 132 chars)
`Understand your browsing, use a simple optional timer, and save pages for later — private, local, and account-free.`

## Category
Productivity

## Detailed description
> **Turn a crowded browser into one clear intention.**
>
> Tabyss connects three simple jobs: understand where your browser time goes, use an
> optional timer when it helps, and save a page for later without keeping its tab open. Everything
> runs on your device. There is no account, server, telemetry, or cloud requirement.
>
> **What you get**
> • **Saved pages** — save the current page with an optional note; open, complete,
>   save again, filter, or delete it from one accessible side panel
> • **Intentional sessions** — a simple optional timer with one-click Complete/End and a local list of sites visited
> • **Your Browsing Personality** — 50+ personas computed weekly from your patterns
> • **Weekly Wrapped** — a full-screen recap with a shareable card (saved locally)
> • **Focus Score** — a daily 0–100 built from productive share and tab discipline
> • **Streaks & badges** — momentum you can see; one rest day is always forgiven
> • **Rabbit-hole detector** — see exactly where the evening went
> • A one-click popup: today's total, focus ring, goal budgets, top sites
> • A full dashboard: category donut, hour heatmap, weekly/monthly analytics,
>   12-week calendar, vs-last-week deltas
> • Automatic categories you can edit; optional daily limits and a late-night
>   "digital sunset" nudge
> • Export/import your data anytime; set how long history is kept
>
> **Private by design**
> Tabyss has no server and makes zero network requests. Everything stays on your
> device in Chrome's own storage. Even the share card is rendered locally — and by
> default it shows categories only, never your sites, unless you choose otherwise.
>
> Choose your browser on purpose — without giving your browsing history to a server.

## Privacy practices tab — exact answers
- **Single purpose:** "Helps the user browse intentionally through local focus sessions, explicitly saved pages, and private on-device time/wellbeing insights."
- **Data collected:** *Website activity* (time spent per domain; up to 24 domains may
  be linked to a session the user explicitly starts; full URL/title only for a page
  the user explicitly saves) AND *User
  activity* (scroll-gesture cadence and media-playback state are observed on-page to
  classify video/shorts/feed-scrolling time per domain; keys are only counted as
  scroll gestures — no content, keystrokes, or clicks are recorded). Declare both.
- **Certifications (check all — they are true):**
  - Data is **not** sold or transferred to third parties (beyond approved use cases).
  - Data is **not** used for purposes unrelated to the item's single purpose.
  - Data is **not** used for creditworthiness / lending.
- **Data handling note:** all collected data stays on-device in `chrome.storage.local`;
  the extension makes no network requests. Nothing is transmitted off the device.
- **Privacy policy URL:** host `PRIVACY.md` (e.g. GitHub Pages / Gist) and paste the URL.

## Permission justifications (paste per permission)
- **tabs** — "Read the active tab's domain for local time attribution and a running user-started session and, only when the user explicitly saves the current page, store its URL and title locally or open it again. Page content and form input are never read."
- **idle** — "Detect when the user is away so tracking pauses and time isn't over-counted."
- **alarms** — "Run the 1-minute tracking tick, focus timer recovery, and periodic data-retention cleanup."
- **storage** — "Persist the user's time stats and settings locally on their device."
- **notifications** — "Notify the user on daily-limit breaches and for eye-break / hydration reminders they enabled."
- **favicon** — "Display site icons in the user's own stats lists using Chrome's local favicon cache. No network requests."
- **sidePanel** — "Keep Saved pages available beside the current page so the user can save it and return later."
- **Content script on http/https (host access)** — "Two on-device features: (1) classify media activity from video state and scroll cadence, and (2) render enabled wellbeing overlays. It never reads page text, form input, passwords, or messages, and nothing is transmitted."

## Screenshot plan (1280×800, capture 4)
1. **Saved pages** — save form and favicon list. Caption: "Keep the page, not the tab."
2. **Intentional session** — compact timer, visited sites, and direct controls. Caption: "A timer when it helps."
3. **Weekly Wrapped** — persona and local recap. Caption: "See your browsing rhythm."
4. **Dashboard** — category, focus, and wellbeing insights. Caption: "Your day, understood privately."

Optional promo tile 440×280: logo + tagline "Where does your time go?"

## Assets checklist
- [ ] Icon 128 (included: `icon128.png`)
- [ ] 4 screenshots @ 1280×800
- [ ] Privacy policy URL live
- [ ] `tabyss-v2.0.0.zip` built via `package.ps1`
- [ ] $5 one-time developer registration paid
