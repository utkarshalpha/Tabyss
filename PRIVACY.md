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
- **Intentional session data:** what you enter as the task, timer/stopwatch state,
  completed/ended outcome, and up to 24 unique domains visited while that session is
  running. Session sites follow the same active-tab rules as normal tracking and
  exclude Incognito, ignored domains, unsupported pages, and non-counting idle time.
  Tabyss does not attach full URLs, page titles, page content, or per-site duration to
  the session. Earlier local V2 records may also retain a definition of done, ending
  reason, or optional note for compatibility.
- **Saved pages:** when you choose **Save current page**, Tabyss stores that page's
  full HTTP(S) URL, title, optional note, saved/completed state, and timestamps so
  you can return later. These records are bounded, exclude Incognito, reject
  credential-bearing URLs, and are not part of passive browsing analytics.
- **Compatibility data from earlier local V2 builds:** existing Profile, Plan,
  Space, schedule, drift, or recovery records remain locally preserved and included
  in full backups so an update does not silently destroy user data. Their interfaces,
  schedule notifications, and drift guard are retired.
- Your **settings** (appearance theme, categories, goals, breaks, office mode,
  ignore list, retention window).
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
- **tabs** — to read the domain of your active tab so time can be attributed to it
  and, while you run an Intentional Session, shown in that session's local site list;
  its URL/title is saved or reopened only when you use Saved pages.
- **idle** — to pause tracking when you step away.
- **alarms** — to run the 1-minute tracking tick, periodic cleanup, and wake the
  extension when a focus timer is ready for review.
- **storage** — to save your stats and settings on your device.
- **notifications** — to alert you on daily limits you set, and for the eye-break /
  water / stand reminders you enable. Site names are hidden from notification
  previews by default; you can explicitly enable them in Settings.
- **favicon** — to show site icons in your own stats lists from Chrome's local
  favicon cache. No network requests.
- **sidePanel** — to keep Saved pages available beside the page you are viewing.
- **Access to websites (content script)** — to classify media activity (video /
  Shorts / feed-scrolling) and show break overlays. It does not inspect page text or
  form fields. Everything is processed on your device; nothing is transmitted.

## Your control over your data
- **Ignore:** an ignored domain also excludes its subdomains; matching respects domain
  boundaries (`example.com` excludes `mail.example.com`, not `evil-example.com`).
- **Export / Import:** back up or restore your data as a JSON file (Settings → Your data).
  A full backup includes Saved page URLs/titles, session-linked domains, and any
  compatibility records from earlier local V2 builds; treat the file as sensitive.
  Imports have a file-size limit, are schema-validated twice, and trigger a local
  safety-backup download before any stored section is replaced. An active focus
  session must be checked out first so a restore cannot split its outcome history;
  the in-progress recovery record becomes portable history only after checkout.
- **Delete:** "Reset today" clears that day's browsing and focus sessions; "Clear all data" wipes everything; uninstalling
  the extension removes all stored data.
- **Retention:** passive browsing/media/wellness history, focus outcomes, and recovery
  counts older than your chosen window (default 180 days) are deleted automatically.
  Saved pages remain until you delete them, normal limits replace the oldest record,
  you clear all data, or you uninstall. Compatibility records remain until Clear all
  data, a validated restore replaces them, or uninstall.

## Contact
Questions about this policy: utkarsh7854@gmail.com.

## Changes
Any future change to this policy will be published with the extension and dated above.
