# Tabyss — Microsoft Edge Add-ons Submission Guide

Edge is Chromium: the same `tabyss-v1.5.0.zip` uploads unchanged. Registration is
**free** (no $5, unlike Chrome). Total cost: ₹0 / $0.

## 1. Register (one time, ~5 min)
1. Go to the [Edge Add-ons Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview).
2. Sign in with any Microsoft account (create one free if needed).
3. Enroll in the Microsoft Edge program — **no fee**.

## 2. Host the privacy policy (required)
Put `PRIVACY.md` at a public URL — easiest: a free GitHub Gist → copy the raw/share
link. You'll paste this URL in the listing.

## 3. Submit
Partner Center → **Create new extension** → upload `tabyss-v1.5.0.zip`, then fill:

| Field | Value |
|---|---|
| **Display name** | Tabyss — Know Your Scroll |
| **Category** | Productivity |
| **Short description** | Your browsing personality, weekly Wrapped, focus score & site time — 100% private and on-device. No account, no cloud. |
| **Description** | Paste the detailed description from `STORE_LISTING.md` (it's store-agnostic) |
| **Privacy policy URL** | your hosted PRIVACY.md link |
| **Screenshots** | 3–10 images, **1280×800** (same set planned in STORE_LISTING.md) |
| **Search terms** | time tracker, screen time, focus, doomscroll, pomodoro, wellbeing, personality |
| **Markets** | All markets |
| **Visibility** | Public |
| **Pricing** | Free |

## 4. Certification questionnaire — exact answers
- **Does your extension collect, transmit, or share personal information?**
  It processes browsing activity (site domains, time, media playback state)
  **entirely on the user's device**. Nothing is collected by the developer,
  transmitted, or shared — the extension makes **zero network requests**.
- **Permission justifications** (if asked): use the per-permission text in
  `STORE_LISTING.md` verbatim — tabs / idle / alarms / storage / notifications /
  favicon / content-script host access.
- **Why host access on all sites:** on-device media classification (video/Shorts/
  feed-scroll) + rendering the user's break overlays. No page content is read,
  stored, or transmitted.

## 5. Review
- Typically **up to 7 business days** (often faster). You'll get email updates in
  Partner Center.
- Updates later: bump `version` in manifest.json → `package.ps1` → upload the new
  zip to the same listing.

## Compatibility notes (already verified in code)
- Manifest V3, all `chrome.*` APIs used (tabs, storage, idle, alarms,
  notifications) are supported by Chromium Edge.
- `minimum_chrome_version: 111` is honored by Edge's Chromium version mapping.
- The `favicon` permission / `_favicon/` endpoint is Chromium-standard; if a
  particular Edge build lacks a cached icon, the UI's letter-chip fallback shows
  automatically (already built in).
- Content script + break overlays behave identically in Edge.

## Optional later
The same zip also publishes to Chrome Web Store ($5 one-time) and Firefox needs a
small manifest port (browser namespace / gecko id) — Edge first loses nothing.
