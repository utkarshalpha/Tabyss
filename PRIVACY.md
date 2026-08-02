# Tabyss — Privacy Policy

**Effective date:** 2026-08-02

Tabyss is built around a single promise: **your data never leaves your device.**

## What Tabyss stores
To show you how you spend time online, Tabyss records, **locally on your computer**:
- For passive time analytics, the **domain** of the site in your active tab (e.g.
  `youtube.com`) — not the full URL, page content, or what you type. Explicit context
  saves are described separately below.
- **How long** that domain was in the foreground, by day and by hour.
- **Media activity per domain per day**: seconds of video playback, Shorts/Reels,
  and feed-scrolling. This is classified on-page by a content script that observes
  video element state (playing/paused/fullscreen) and scroll-gesture cadence — it
  never reads or stores page content, text you type, or full URLs.
- **Wellness counts** per day: eye breaks taken/skipped, water and stand-up
  reminders completed.
- **Intentional focus data you enter:** the current intention, optional definition
  of done, timer/stopwatch state, and completed/unfinished session outcomes with
  optional reason and note. These fields are never taken from page content.
- **Explicitly saved browser context:** when you choose to save a Plan page, Space,
  Return Capsule, or recovery checkpoint, Tabyss stores that page's full HTTP(S)
  URL and title locally so it can restore the context you requested. These records
  are bounded, exclude Incognito, reject credential-bearing URLs, and are not part
  of passive browsing analytics.
- **Profiles, Plans, schedules, drift choices, and recovery metadata** you create in
  the Command Center. Schedule reminders and recovery counts remain local.
- Your **settings** (categories, goals, breaks, office mode, ignore list,
  retention window).
- **Incognito tabs are never recorded**, even if you separately allow the extension
  to run in Incognito from Chrome's extension settings.

## Where it's stored
All of the above is kept in your browser's local extension storage
(`chrome.storage.local`) **on your device**. Tabyss has **no server, no account,
and makes no network requests of any kind.** Your data is never transmitted,
uploaded, sold, shared, or used for advertising.

Raw storage is restricted to trusted extension pages and the background worker.
Content scripts can report only allowlisted media/wellness events and cannot read
your stored history.

## What Tabyss does NOT do
- No sign-in, no account, no user identifier.
- No analytics, telemetry, crash reporting, or tracking pixels.
- No third-party services or SDKs.
- No passive collection of full URLs, page content, form input, passwords, or browser
  history. Full URLs/titles are stored only for the explicit local saves described
  above.

## Permissions, in plain language
- **tabs** — to read the domain of your active tab so time can be attributed to it,
  and to save/restore URL and title metadata only when you explicitly use a Plan,
  Space, Return Capsule, checkpoint, or duplicate-recovery action.
- **idle** — to pause tracking when you step away.
- **alarms** — to run the 1-minute tracking tick, periodic cleanup, and wake the
  extension when a focus timer is ready for review.
- **storage** — to save your stats and settings on your device.
- **notifications** — to alert you on daily limits you set, and for the eye-break /
  water / stand reminders you enable. Site names are hidden from notification
  previews by default; you can explicitly enable them in Settings.
- **favicon** — to show site icons in your own stats lists from Chrome's local
  favicon cache. No network requests.
- **sidePanel** — to keep the local Command Center available beside the page you are
  working on.
- **Access to websites (content script)** — to classify media activity (video /
  Shorts / feed-scrolling), show break overlays, and show the mindful Focus Contract
  guard. The guard compares the current address with your local plan rules; it does
  not inspect page text or form fields. Everything
  is processed on your device; nothing is transmitted anywhere.

## Your control over your data
- **Ignore:** an ignored domain also excludes its subdomains; matching respects domain
  boundaries (`example.com` excludes `mail.example.com`, not `evil-example.com`).
- **Export / Import:** back up or restore your data as a JSON file (Settings → Your data).
  A full backup includes explicitly saved Plan/Space/Capsule/checkpoint URLs and
  titles; treat the file as sensitive.
  Imports have a file-size limit, are schema-validated twice, and trigger a local
  safety-backup download before any stored section is replaced. An active focus
  session must be checked out first so a restore cannot split its outcome history;
  the in-progress recovery record becomes portable history only after checkout.
- **Delete:** "Reset today" clears that day's browsing and focus sessions; "Clear all data" wipes everything; uninstalling
  the extension removes all stored data.
- **Retention:** passive browsing/media/wellness history, focus outcomes, and recovery
  counts older than your chosen window (default 180 days) are deleted automatically.
  User-authored Plans, Spaces, Return Capsules, and bounded checkpoints remain until
  you delete them, replace them through normal limits, clear all data, or uninstall.

## Contact
Questions about this policy: utkarsh7854@gmail.com.

## Changes
Any future change to this policy will be published with the extension and dated above.
