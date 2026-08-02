# ⏳ Tabyss — Know Your Scroll

**A privacy-first browser extension that turns your browsing time into a personality.**
Intentional focus sessions, time tracking, focus scoring, doomscroll detection,
wellbeing breaks, and a weekly Wrapped-style recap — computed **entirely on your device**. No account. No server.
**Zero network requests.**

> Are you *The Autoplay Vampire*? *The 3AM Shipwright*? *The Timeline Landlord*?
> Tabyss watches how you actually browse and tells you who you are this week —
> with unique generative artwork for every persona.

![Dashboard](assets/screenshots/1-dashboard.png)

## Features

| | |
|---|---|
| ✅ **Intentional focus sessions** | Set a one-line intention, choose a timer or open-ended session, pause/resume/extend, then check out as completed or unfinished with an optional local note |
| 🎭 **Browsing Personality** | 50+ personas from 6 archetypes × 4 rhythms × 4 intensities, computed weekly from real patterns, each with deterministic generative avatar art |
| ✨ **Weekly Wrapped** | A 9-slide full-screen recap with a locally rendered 1080×1080 share card (categories only by default — sites are opt-in) |
| 🎯 **Focus Score** | Daily 0–100 from productive share + tab discipline − rabbit holes; honest "warming up" state under 30 minutes |
| 🎬 **Media detection** | Video watch-time, Shorts/Reels, and feed doomscrolling measured separately by a content script — normal reading never counts |
| 👀 **20-20-20 eye breaks** | The page blurs for a 20-second look-away after continuous screen time, with an animated countdown warning first |
| 🏢 **Office Mode** | Hydration and stand-up reminders, presence-gated so an empty desk is never nagged |
| 🔥 **Streaks & badges** | 30m+ productive days build streaks (one rest day forgiven); 12 unlockable badges |
| 🗂 **Auto-categorization** | Bundled offline catalog (~250 domains) + boundary-safe rules + keyword heuristics across 8 categories; user overrides always win |
| 📊 **Full dashboard** | Category donut, hour heatmap, weekly/monthly rollups, 12-week calendar, vs-last-week deltas, per-site favicons |

<p>
  <img src="assets/screenshots/2-popup.png" width="49%" alt="Popup" />
  <img src="assets/screenshots/3-wrapped.png" width="49%" alt="Wrapped" />
</p>

## Engineering highlights

Built as a **Manifest V3** extension with no frameworks and no external dependencies —
every line of UI, tracking, and artwork is hand-rolled:

- **Event-driven tracking engine** on a service worker that survives suspension:
  1-minute alarm heartbeat + tab/window/idle events, with wall-clock gap detection
  so machine sleep never inflates a day.
- **Restart-safe focus state machine** — the active session is persisted, elapsed
  time is derived from timestamps, and one alarm is used only as a wake-up hint;
  timer expiry opens review instead of falsely claiming completion.
- **Serialized storage transactions** — all read-modify-write cycles run through a
  promise-chain mutex after a review found flush/maintenance races that could
  silently erase committed data.
- **Honest edge-case handling**: audible tabs count as active (a Netflix binge is
  not "idle"), same-site runs break across sleep gaps instead of stitching into
  fake 25-minute rabbit holes, and pre-switch-data days score with neutral credit.
- **Domain-boundary-safe categorization** — naive substring matching filed
  `netflix.com` under Social because it contains `x.com`; the matcher now respects
  hostname label boundaries, with an exact-entry catalog beating base-domain
  fallbacks (`news.google.com` → News even though `google.com` → Productive).
- **Deterministic persona + doodle engine** — seeded PRNG (mulberry32 over a string
  hash of persona + week) draws avatar art from the stats themselves: orbit dots =
  active days, voids = rabbit holes, core size = focus score.
- **Strict media classification** — scroll gestures are coalesced into bursts
  (≥400ms gaps) so one trackpad flick isn't "doomscrolling"; feed detection
  requires both a known feed URL and sustained cadence (≥8 gestures/min).
- **Privacy as architecture**: no `history` permission, no remote code, no
  telemetry, favicon rendering via Chrome's local cache, and a share card that
  excludes site names unless explicitly enabled. Incognito activity is excluded,
  raw storage is restricted to trusted extension contexts, and runtime messages
  are allowlisted by sender type.

## Test

Run the dependency-free security and data-contract suite:

```powershell
node --test tests/*.test.js
```

Run the complete local/CI gate, including deterministic packaging:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\verify.ps1
```

For a local visual smoke test of the real Settings HTML/CSS/JS without installing
the extension, run `node tests/ui-server.js` and open
`http://127.0.0.1:4173/options.html`. The adapter is test-only and is not included
by `package.ps1`. The unpacked-extension checklist remains the release authority.

Create the Chrome Web Store ZIP with `package.ps1`. Its exact runtime whitelist
lives in `package-files.json`; timestamps and entry order are fixed so identical
source produces an identical archive on the supported build runner. Pass
`-OutputPath path.zip` to avoid replacing the default local artifact.

## Install

**From source (2 minutes):**
1. Clone this repo
2. Open `edge://extensions` (or `chrome://extensions`) → enable **Developer mode**
3. **Load unpacked** → select the repo folder

**From the store:** submitted to Microsoft Edge Add-ons — listing link coming soon.

## Privacy

Tabyss makes **zero network requests** — verifiable in the source: there is no
`fetch`, no `XMLHttpRequest`, no remote script, no analytics SDK. All data lives in
`chrome.storage.local` with user-configurable retention, full export/import, and
one-click deletion. See [PRIVACY.md](PRIVACY.md).

## Project docs

| Doc | Purpose |
|---|---|
| [PRD.md](PRD.md) | Product requirements and design decisions of record |
| [CHANGELOG.md](CHANGELOG.md) | Full version history v1.0 → v1.5 |
| [QA_CHECKLIST.md](QA_CHECKLIST.md) | Release test pass |
| [STORE_LISTING.md](STORE_LISTING.md) / [EDGE_SUBMISSION.md](EDGE_SUBMISSION.md) | Store submission kits |
| [PRIVACY.md](PRIVACY.md) | Privacy policy |

## Stack

Vanilla JavaScript (MV3 service worker + content script), hand-rolled SVG/Canvas
visualization (donut, heatmaps, rings, generative art), CSS custom properties with
full light/dark theming, PowerShell build script. **No frameworks, no build step,
no dependencies.**

## License

MIT — see [LICENSE](LICENSE).
