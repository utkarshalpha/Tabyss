# Tabyss — Chrome Web Store Listing Kit

Everything you need to paste into the Web Store Developer Dashboard.

## Title
`Tabyss — Intentional Browsing`

## Summary (short description, ≤ 132 chars)
`Plan focused browsing, restore tab Spaces, save detours, and understand your time — private, local, and account-free.`

## Category
Productivity

## Detailed description
> **Turn a crowded browser into one clear intention.**
>
> Tabyss connects four things most productivity extensions leave apart: decide what
> this browser session is for, bring the right tabs together, recover calmly when
> attention drifts, and reflect on what actually happened. Everything runs on your
> device. There is no account, server, telemetry, or cloud requirement.
>
> **What you get**
> • **Focus Contracts** — preview the tabs a Plan will open or park, then confirm
> • **Spaces** — save a useful browser window and restore only missing pages later
> • **Return Capsules** — save a tempting page locally and return to your chosen task
> • **Mindful protection** — Return, Save for later, or Continue; no unescapable lock
> • **Safe recovery** — automatic checkpoints before tab parking or duplicate cleanup
> • **Profiles and schedules** — reusable Work, Study, Personal, or custom modes
> • **Command Center** — a side panel that stays beside the page you are working on
> • **Intentional sessions** — timer or open-ended focus with honest checkout
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
- **Single purpose:** "Helps the user browse intentionally by planning local focus sessions, saving and restoring user-selected tab context, recovering from drift, and showing private on-device time/wellbeing insights."
- **Data collected:** *Website activity* (time spent per domain; full URL/title only
  for a user-explicit Plan, Space, Return Capsule, or recovery save) AND *User
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
- **tabs** — "Read the active tab's domain for local time attribution and, only when the user explicitly saves or confirms a Plan, Space, Return Capsule, checkpoint, or duplicate cleanup, save/restore that tab's URL and title locally. Page content and form input are never read."
- **idle** — "Detect when the user is away so tracking pauses and time isn't over-counted."
- **alarms** — "Run the 1-minute tracking tick, focus timer recovery, local Plan schedules, and periodic data-retention cleanup."
- **storage** — "Persist the user's time stats and settings locally on their device."
- **notifications** — "Notify the user on daily-limit breaches and for eye-break / hydration reminders they enabled."
- **favicon** — "Display site icons in the user's own stats lists using Chrome's local favicon cache. No network requests."
- **sidePanel** — "Keep the local Plans, Spaces, Return Capsules, session controls, and recovery Command Center available beside the user's current page."
- **Content script on http/https (host access)** — "Three on-device features: (1) classify media activity from video state and scroll cadence; (2) render enabled wellbeing overlays; and (3) show a mindful Focus Contract guard based only on the current address and the user's local plan rules. It never reads page text, form input, passwords, or messages, and nothing is transmitted."

## Screenshot plan (1280×800, capture 4)
1. **Command Center / Plans** — Profile, weekly impact, plan cards. Caption: "Choose the mode for this moment."
2. **Focus Contract preview** — tabs to park/open. Caption: "See every change before it happens."
3. **Spaces + recovery** — saved Space and checkpoint cards. Caption: "Context saved. Cleanup reversible."
4. **Dashboard** — category, focus, and wellbeing insights. Caption: "Your day, understood privately."

Optional promo tile 440×280: logo + tagline "Where does your time go?"

## Assets checklist
- [ ] Icon 128 (included: `icon128.png`)
- [ ] 4 screenshots @ 1280×800
- [ ] Privacy policy URL live
- [ ] `tabyss-v2.0.0.zip` built via `package.ps1`
- [ ] $5 one-time developer registration paid
