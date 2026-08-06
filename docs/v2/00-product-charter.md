# V2 Product Charter

## Executive decision frame

Tabyss V2 moves from a passive browser-usage dashboard to a local-first intentional-
browsing product with three understandable jobs: understand time, focus on one
thing, and save a page for later. ADR-023 is the final release-scope decision.

## Current verified foundation

The current product already includes:

- Active-domain time tracking by day and hour.
- Eight-category local classification with user overrides.
- Focus score, site-switch count, rabbit-hole detection, streaks, and badges.
- Video, short-form video, and sustained feed-scrolling classification.
- Eye, water, stand, and digital-sunset reminders.
- Daily popup, full dashboard, weekly Wrapped, personality, share card, export/import, retention, and ignore settings.
- Manifest V3 service worker, local storage, no account, and no runtime network request.

V2 should preserve these strengths while making the product actionable and easier to trust.

## Product vision

> Help people use the browser on purpose, with private evidence that their chosen habits are improving.

## Category

- Primary Chrome Web Store category: Productivity.
- Secondary conceptual category: Digital wellbeing.
- Product type: Intentional browsing, focus, and browser-behavior intelligence extension.

## Core loop

1. Understand: see where browser time went.
2. Focus: choose one intention and run a timer or stopwatch.
3. Save: keep a useful page without keeping its tab open.
4. Reflect: review the day and weekly rhythm privately.

## Strategic pillars

### 1. Private by default

Core history, rules, scoring, and recommendations remain local. Users can see, export, correct, pause, and delete their information.

### 2. Intent before judgment

Productive versus distracting cannot be inferred from a domain alone. V2 must incorporate the user's current purpose, profile, schedule, and corrections.

### 3. Action over dashboard volume

Every major insight should support an immediate action: start focus, change a rule, save tabs, take a break, or plan a follow-up.

### 4. Proportionate control

Users select the strength of friction. Observation, reminders, mindful pauses, soft blocks, and stricter sessions should coexist.

### 5. Sustainable productivity

The product must discourage both compulsive distraction and unhealthy overwork. Rest, shutdown, and recovery are success outcomes.

### 6. Honest technical boundaries

A Chrome extension can influence Chrome tabs and pages. It cannot reliably block arbitrary desktop or mobile apps without a native/mobile product. V2 must not imply otherwise.

## In scope

- Quick intentions, focus sessions, timer/stopwatch, goals, and local insights.
- Saved pages with optional notes and completed state.
- Local session timeline and explainable analytics.
- Lightweight browser task capture and optional third-party task/calendar connections.
- Wellbeing routines and context-aware suppression.
- Persistent Saved pages side panel.
- Accessibility, localization readiness, diagnostics, migration, and production lifecycle.
- Optional connected backup/sync or friend accountability only if separately approved.

## Non-goals

- General-purpose task/project management.
- General-purpose bookmark or knowledge-base replacement.
- Mobile-app or OS-wide activity tracking.
- Native application blocking.
- Public social feed or public raw-screen-time leaderboard.
- Covert family, employee, or child surveillance.
- Silent collection of page content, typed text, full URLs, or incognito activity.
- Cloud AI that receives browsing history by default.
- Ads or behavioral-data sale.

## V2-level success

V2 succeeds when a meaningful share of activated users achieve self-selected intentional outcomes repeatedly, while privacy trust, permission retention, extension performance, and user control remain healthy.

The exact North Star and metric contract are proposed in [Analytics and North Star](06-analytics-and-north-star.md).
