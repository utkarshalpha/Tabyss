# Tabyss — Chrome Web Store Listing Kit

Everything you need to paste into the Web Store Developer Dashboard.

## Title
`Tabyss — Web Time Tracker`

## Summary (short description, ≤ 132 chars)
`Your browsing personality, weekly Wrapped, focus score & site time — 100% private and on-device. No account, no cloud.`

## Category
Productivity

## Detailed description
> **Meet your browsing personality.**
>
> Are you The Autoplay Vampire? The 3AM Shipwright? The Timeline Landlord? Tabyss
> watches how you actually browse — on your device, never uploaded — and turns it
> into a personality, a weekly Wrapped, and stats you'll actually want to check.
>
> **What you get**
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
> Tracked in private. Flexed in public. Install Tabyss and meet your internet self.

## Privacy practices tab — exact answers
- **Single purpose:** "Tracks and displays how the user spends time in the browser — per-site time and video/shorts/feed watch-time — and helps them manage it with optional break reminders (20-20-20 eye breaks, hydration/stand nudges), entirely on the user's own device."
- **Data collected:** *Website activity* (time spent per domain) AND *User activity* (scroll-gesture cadence and media-playback state are observed on-page to classify video/shorts/feed-scrolling time per domain; keys are only ever counted as scroll gestures — no content, keystrokes, or clicks are recorded). Declare both.
- **Certifications (check all — they are true):**
  - Data is **not** sold or transferred to third parties (beyond approved use cases).
  - Data is **not** used for purposes unrelated to the item's single purpose.
  - Data is **not** used for creditworthiness / lending.
- **Data handling note:** all collected data stays on-device in `chrome.storage.local`;
  the extension makes no network requests. Nothing is transmitted off the device.
- **Privacy policy URL:** host `PRIVACY.md` (e.g. GitHub Pages / Gist) and paste the URL.

## Permission justifications (paste per permission)
- **tabs** — "Read the domain of the active tab to attribute browsing time to the correct site. Full URLs and page content are never read."
- **idle** — "Detect when the user is away so tracking pauses and time isn't over-counted."
- **alarms** — "Run the 1-minute tracking tick and periodic data-retention cleanup."
- **storage** — "Persist the user's time stats and settings locally on their device."
- **notifications** — "Notify the user on daily-limit breaches and for eye-break / hydration reminders they enabled."
- **favicon** — "Display site icons in the user's own stats lists using Chrome's local favicon cache. No network requests."
- **Content script on http/https (host access)** — "Two on-device features: (1) classify media activity (video playback, Shorts/Reels, feed scrolling) by reading video element state and scroll cadence — no page content is read or stored beyond the site's domain; (2) render the user-requested break overlay (20-20-20 eye breaks, hydration reminders) on the page. Nothing is transmitted anywhere; the extension makes zero network requests."

## Screenshot plan (1280×800, capture 4)
1. **Dashboard (top)** — tiles + category donut + heatmap. Caption: "Your day at a glance."
2. **Dashboard (sites)** — site list with category tags. Caption: "Every site, categorized."
3. **Popup** — today total + productive % + categories. Caption: "A one-click daily read."
4. **Settings** — goals + categories. Caption: "Set limits. Own your data."

Optional promo tile 440×280: logo + tagline "Where does your time go?"

## Assets checklist
- [ ] Icon 128 (included: `icon128.png`)
- [ ] 4 screenshots @ 1280×800
- [ ] Privacy policy URL live
- [ ] `tabyss-v1.5.0.zip` built via `package.ps1`
- [ ] $5 one-time developer registration paid
