# Tabyss — Product Requirements (v1.0)

**Owner:** Product · **Status:** Released · **Last updated:** 2026-07-26

## 1. Problem
People lose hours to the browser without noticing where the time went. Existing
trackers usually require an account and upload browsing data to a server — a privacy
cost most people won't pay for a self-awareness tool.

## 2. Product in one line
A private, on-device Chrome extension that shows where your time goes online — by
site and by category — with optional daily limits. No account, no servers, no data
ever leaves the device.

## 3. Goals & non-goals
**Goals**
- Accurately attribute active browsing time to sites and categories.
- Give a fast daily read (popup) and a deeper view (dashboard).
- Let people set gentle daily limits and get nudged when they cross one.
- Be trustworthy by construction: 100% local, no network.

**Non-goals (v1)**
- No blocking/hard-locking of sites (nudge, don't police).
- No cross-device sync or cloud backup (would break the privacy promise).
- No per-URL/page-level tracking — domain granularity only.
- No account, telemetry, or analytics.

## 4. Users
- **The self-optimizer** — wants to cut doom-scrolling and protect focus time.
- **The freelancer/student** — wants a rough sense of productive vs. distracting time.
- **The privacy-conscious user** — will only use a tracker that never phones home.

## 5. Requirements
| ID | Requirement | Acceptance |
|----|-------------|-----------|
| FR-1 | Count active time per domain per day | Time accrues only when window focused, tab active, user not idle |
| FR-2 | Attribute time to hour-of-day | `hours[day][0..23]` populated; heatmap reflects it |
| FR-3 | Categorize domains (6 categories, editable) | Default rules + per-domain overrides in Settings |
| FR-4 | Popup: today total, productive %, categories, top sites | Renders within the popup on open |
| FR-5 | Dashboard: tiles, category donut, hour heatmap, 7-day trend, per-day sites | All panels render for any selected day |
| FR-6 | Daily per-category goals with desktop notification | One notification per category per day on breach |
| FR-7 | Data controls: export, import, clear, retention window | Export/import JSON round-trips; retention prunes old data |
| FR-8 | Ignore list + configurable idle threshold | Ignored domains never tracked; idle threshold applied |

**Non-functional**
- **Privacy:** no network requests anywhere; all data in `chrome.storage.local`.
- **Performance:** popup/dashboard render < 200 ms on typical data; 1-min tracking tick.
- **Robustness:** deltas clamped to guard clock changes/sleep; idempotent flush.
- **Storage:** bounded via retention (default 180 days), pruned every 6 h.
- **Accessibility:** keyboard focus states, category identity via label + color (not color alone), reduced-motion respected, light/dark themes.

## 6. Success metrics (self-reported / store)
- Store rating ≥ 4.3; install→7-day retention as a proxy for usefulness.
- Qualitative: reviews mention the privacy/local angle and the category view.

## 7. Release scope
v1.0 = all requirements above. Deferred: weekly email-style recap, site-level
sessions, focus-timer/Pomodoro, optional local export to CSV.

## 8. v1.2 addendum — "The Personality Update"
| ID | Requirement | Acceptance |
|----|-------------|-----------|
| FR-9 | Weekly Browsing Personality (archetype × rhythm × intensity, 50+ combos) | Deterministic; data-gated (≥4 active days & ≥3h else The Ghost); hero card on dashboard |
| FR-10 | Weekly Wrapped (9 slides + local PNG share card) | <30m weekly data → teaser slide; card is categories-only by default, top-site opt-in |
| FR-11 | Focus Score 0–100/day | 65 productive + 30 switch discipline + 5 participation − hole penalty; <30m day → no score |
| FR-12 | Streaks + 12 badges | 30m productive bar; today grace + one rest-day forgiveness; badges recompute from data |
| FR-13 | Rabbit-hole detection | ≥25m continuous single-site Entertainment/Social run, listed per day |
| FR-14 | Site-switch counter | Focused site→different-site transitions per day |
| FR-15 | Goal budget meters in popup | Live remaining/over states with amber ≥75% and red over-limit |
| FR-16 | Digital sunset nudge | Default on, 23:00–4:00, 2h cooldown, toggle + start hour in Settings |

**Design decisions of record (from adversarial PM review):** score formula sums to a
true 100; sparse days show "—" not 0; audible tabs count as active (video); category
matching is domain-boundary-safe; the share card never includes site names without
explicit opt-in; epithet copy is playful, never shaming.

## 9. V2 implementation addendum — Intentional browsing

Status: implemented for the final local V2 build; store release still requires the
manual unpacked-extension and policy gates in `QA_CHECKLIST.md`.

| ID | Requirement | Acceptance |
|----|-------------|-----------|
| V2-FR-1 | Simple optional session | Today's insight leads; a secondary session card needs one labelled action ≤160 characters, one duration, and Start; recent intentions are reusable |
| V2-FR-2 | Timer and open-ended focus | 5–240 minute initial timer or stopwatch; elapsed/remaining time derives from persisted timestamps |
| V2-FR-3 | Session controls | Running sessions can pause, resume, extend by an allowlisted duration, Complete, or End directly |
| V2-FR-4 | One-click outcome | Timer expiry enters Review; Complete and End commit immediately from the active card without a checkout form, note, or reason question |
| V2-FR-5 | Recovery | Popup closure, worker suspension, browser restart, delayed alarms, reset, retention, clear, export, and restore have explicit behavior |
| V2-FR-6 | Reflection | Dashboard shows active and historical intentional sessions per day without folding them into passive Focus Score |
| V2-FR-7 | Local privacy | Intentions/outcomes remain in trusted local extension storage; only `sidePanel` is added, with no network request, account, or telemetry |
| V2-FR-8 | Saved pages | Explicitly save the active safe HTTP(S) URL/title and optional note; open, complete, save again, filter, and delete |
| V2-FR-9 | Simple side panel | One Saved pages job with no Profile, Plan, Space, metric, checkpoint, or Recovery navigation |
| V2-FR-10 | Accessible state | Native controls, visible label, pressed filter state, live feedback/count, busy state, favicon fallback, and narrow-layout support |
| V2-FR-11 | Compatibility preservation | Retired Plan/Space/checkpoint records remain validated, local, and portable without active schedules, guards, or destructive migration |
| V2-FR-12 | Portable V2 data | Product schema 1 participates in validated format-4 export/import, clear, and local-only storage |
| V2-FR-13 | Session sites | Show at most 24 unique normalized domains visited during the session in popup and dashboard history; exclude Incognito/ignored/non-counting activity and never attach full URLs or per-site duration |

V2 deliberately does not claim cloud sync, remote AI, accounts, public or household
comparison, employee/parental monitoring, or hard blocking. Those are not hidden
future toggles: they are absent because a trustworthy implementation requires a real
identity/service/security/abuse/operations boundary that this local product does not
have. V2 chooses an optional timer/open-ended session plus Saved pages rather than
an unescapable Pomodoro, DNR enforcement, or a general tab-workspace manager. See
ADR-023 for the final product-surface decision.
