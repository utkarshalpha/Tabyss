# V2 Product Opportunity Backlog

Status: Active discovery backlog. This expands the 15 V2 workstreams; it is not a
claim that every item below is implemented or accepted for release.

## Product thesis

Most productivity extensions specialize in one layer: restrict websites, restore
tabs, or create a calmer new tab. Tabyss can be meaningfully different by connecting
four things around a declared intention:

1. Plan what the browser session is for.
2. Arrange and protect the right browser context.
3. Recover gracefully when attention drifts.
4. Reflect on the outcome without shame or surveillance.

The core magic moment is not “a site was blocked.” It is: **I noticed I had drifted,
Tabyss preserved what tempted me, and I returned to the thing I chose without losing
context.**

## Benchmark evidence

The opportunity set was checked against official product materials available on
2026-08-02:

- [Freedom](https://freedom.to/features) demonstrates cross-site blocking,
  allow-only sessions, schedules, Locked Mode, focus sounds, and session history.
- [Workona](https://workona.com/help/tab-manager/) demonstrates project Spaces,
  automatic tab saving, restore, suspension, switching, and collaboration.
- [one sec](https://one-sec.app/) demonstrates mindful intervention, re-intervention,
  healthy alternatives, journaling, and intention tracking.
- [Momentum Plus](https://www.momentumdash.com/plus) combines new-tab focus,
  Pomodoro, tasks/integrations, tab stash, blocking, soundscapes, and metrics.
- [Session Buddy](https://sessionbuddy.com/) demonstrates large local tab/session
  libraries, crash history, search, restore, import/export, and backups.
- [BlockSite](https://blocksite.co/focused) demonstrates site/category/keyword
  blocking, schedules, focus mode, redirects, and usage insights.

The conclusion is a product inference from that benchmark: Tabyss should not try to
win by matching each catalog independently. Its defensible experience is the joined
loop from declared intention to browser context, recovery, and honest outcome.

## Prioritization method

Priority weighs user value, differentiation, frequency, trust fit, Chrome-extension
feasibility, and whether the capability strengthens the plan-focus-recover-reflect
loop. Every item still requires its own UX, security, data, analytics, migration,
performance, and rollback gate before implementation.

## P0 - signature V2 capabilities

| Opportunity | User value and magic | Trust / delivery gate |
|---|---|---|
| Intent-aware intervention | Treat a site as planned or unplanned for the current intention instead of permanently good or bad. | Needs the plan-context model and explainable rule precedence. |
| Return Capsule | Save the page that caused a detour and offer it after focus, so leaving does not feel like loss. | Explicit capture only; store a minimal local record and provide delete/expiry. |
| Focus Workspace | Launch relevant tabs, park unrelated ones with preview, and restore the prior window at checkout. | Crash-safe checkpoints, duplicate handling, preview, undo, and partial-failure recovery. |
| Focus Contract preview | Before starting, show exactly what will open, park, pause, limit, and remind. | No silent blocking or tab mutation; denied permissions must degrade truthfully. |
| Drift recovery loop | Offer Return, Continue intentionally, Save for later, or Change plan; measure successful return. | Local outcome events, fatigue cooldowns, and an always-available escape route. |
| Adaptive friction | Reduce or change interventions when repeated dismissal signals notification fatigue. | Transparent rule, user override, local computation, and a notification budget. |
| Best focus window | Suggest one evidence-backed time/window and next action from the user's own patterns. | Minimum sample, visible confidence, no medical claims, and no remote profiling. |
| Tab Time Machine | Preview and restore crash/closure checkpoints, including only selected tabs. | Bounded retention, storage-health monitoring, safe URLs, and undo. |
| Honest checkout | Compare planned versus actual outcome and carry one next step forward. | Never infer completion from timer expiry or browsing behavior. |

## P1 - strong daily value

| Opportunity | User value | Trust / delivery gate |
|---|---|---|
| Browser Load Meter | Summarize tab count, switches, unfinished Spaces, and locally available resource proxies. | Do not claim precise memory when Chrome does not expose it reliably. |
| Existing-tab finder | Detect duplicates before opening and jump to the existing tab. | Deterministic URL normalization without building hidden page history. |
| Future-self note | Deliver a user-written note at a chosen time or context. | Local scheduling, bounded text, snooze/delete, no motivational spam. |
| Shutdown ritual | Close loops, save tomorrow's launchpad, and park today's tabs safely. | Preview every bulk action and make it reversible. |
| Focus energy forecast | Show likely high/low focus windows from local history. | Confidence and uncertainty must be prominent; correlation only. |
| Micro-recovery menu | Offer breath, stretch, water, eye, or walk routines matched to session length. | Accessible, dismissible, and never framed as medical advice. |
| Decision/notification budget | Cap total interruptions across focus, goals, wellbeing, and sunset modules. | One shared arbitration policy with quiet contexts and user control. |
| Private Focus Receipt | Produce a shareable outcome selected by the user. | No domains, exact timeline, or notes unless separately previewed and selected. |
| Cooperative ritual | Invite a friend or household member into a start/check-out ritual. | Optional connected ADR, invite-only, block/leave/revoke, outcome-only by default. |
| Privacy and data health center | Explain permissions, local data, size, retention, integrity, and recovery. | Must reflect runtime truth and expose safe repair/export/delete actions. |
| Accessibility presets | Offer calm motion, higher contrast, larger type/density, and reduced interruption. | Persist locally and keep every setting reachable without pointer input. |

## P2 - memorable power features

| Opportunity | User value | Trust / delivery gate |
|---|---|---|
| Intention thread | Keep the same intention and state visible across popup, side panel, Focus Home, and interventions. | One authoritative restart-safe state; no conflicting controls. |
| Attention replay | Show a compact local timeline of plan, drift, recovery, and return. | Aggregate/domain-level view, retention control, accessible table alternative. |
| Personal experiment lab | Run one reversible behavior experiment against a baseline. | Explain confidence and correlation; stop/revert at any time. |
| Optional plan assistant | Break a chosen intention into steps or suggested rules. | Separate Accepted connected/local-AI ADR; preview payloads and never send browsing history silently. |
| Space starter kits | Offer developer, research, study, writing, and admin tab/plan templates. | Local templates, editable before first use, no forced defaults. |
| Weekly focus story | Turn outcomes and recoveries into a useful narrative and next experiment. | Evidence-linked claims, uncertainty, private by default. |
| Context return | After a rabbit hole, restore the previous relevant tab and show the unfinished next step. | Requires accurate local context checkpoints and explicit user control. |
| Intentional launcher | Search open tabs, Spaces, captures, and allowed destinations before opening something new. | Local index, keyboard accessibility, bounded metadata. |
| Deferred desire queue | Keep links the user wanted during focus and intentionally revisit or discard them later. | Clear expiry, deletion, and no engagement-oriented resurfacing. |

## What V2 should deliberately avoid

- Public leaderboards, productivity shame, or competitive screen-time rankings.
- Employee surveillance, parental domain monitoring, or raw browsing-history sharing.
- Mandatory accounts, cloud sync, or remote AI for core local behavior.
- Ads, affiliate redirects, attention feeds, or dark-pattern streak pressure.
- Unescapable blocking, hidden rules, or punishment for emergency bypass.
- Medical, ADHD, addiction, or mental-health diagnosis claims.

## Product sequencing

1. Design foundation and action-first popup.
2. Outcome onboarding, profiles, and one authoritative intention thread.
3. Focus Contract plus crash-safe Space/checkpoint foundation.
4. Return Capsule and drift-recovery intervention.
5. Honest planned-versus-actual reflection and local recommendations.
6. Power controls, experiments, Focus Home, and optional connected capabilities.

This is one V2 program with staged, reversible branches. “All in V2” means every
essential extension capability is considered and gated here; it does not mean
shipping untested features simultaneously or representing backlog items as done.
