# Competitive Capability Map

Research snapshot: 2026-08-02. Competitor behavior can change; verify official documentation before implementation or launch claims.

## Purpose

The goal is not to copy every productivity extension. The goal is to identify valuable browser-native behaviors, adopt those that reinforce Tabyss's core loop, adapt them to local-first trust, and reject scope that would turn Tabyss into an incoherent suite.

## Competitive groups

### Activity intelligence

Examples: RescueTime and similar time trackers.

Common capabilities:

- Automatic activity tracking.
- Productivity classification.
- Detailed reports and timelines.
- Goals and alerts.
- Focus sessions and blocking.
- Calendar or project context.

Tabyss response:

- Keep automatic local tracking.
- Add an honest session timeline and intent context.
- Make scoring explainable and correctable.
- Prefer personal outcomes over generic productive percentages.
- Avoid uploading domain history for reporting.

Reference: [RescueTime Focus](https://www.rescuetime.com/features/focus/solo).

### Website limiting and blocking

Examples: StayFocusd, Freedom, BlockSite, and LeechBlock-style products.

Common capabilities:

- Site or category limits.
- Scheduled blocklists.
- Allowlist-only sessions.
- Strict or locked modes.
- Block-all controls.
- Repeated schedules.
- Cross-device rules in connected products.

Tabyss response:

- Support observation through strictness as a user-selected ladder.
- Use current behavior and intent to determine when to intervene.
- Make emergency bypass honest and inspectable.
- Avoid marketing an extension as impossible to disable.
- Use browser-managed declarative blocking where possible.

References: [StayFocusd](https://www.stayfocusd.com/), [Freedom](https://freedom.to/).

### Mindful intervention

Example: one sec.

Common capabilities:

- Pause before access.
- Intention capture.
- Re-intervention after a chosen period.
- Multiple intervention styles.
- Open-attempt counts.

Tabyss response:

- Connect the pause to the active plan and local behavioral evidence.
- Let users continue intentionally without shame.
- Measure recovery rather than treating every open as failure.
- Add fatigue/cooldown logic to prevent repetitive interruption.

Reference: [one sec](https://one-sec.app/).

### Focus sessions and gamification

Examples: Opal, Forest, and Pomodoro extensions.

Common capabilities:

- Timed sessions.
- Daily limits and open limits.
- Recurring schedules.
- Focus scores and reports.
- Streaks, rewards, and social challenges.
- Short and long break cycles.

Tabyss response:

- Add timer, flow, and Pomodoro execution to existing focus analytics.
- Preserve playful personas and Wrapped as reflective rewards.
- Reward intentional outcomes and recovery, not raw work hours.
- Use rest grace and vacation modes.

References: [Opal](https://opalapp.com/screentime), [Marinara](https://chromewebstore.google.com/detail/marinara-pomodoro%C2%AE-assist/lojgmehidjdhhbmpjfamhpkpodfcodef).

### New-tab productivity

Example: Momentum.

Common capabilities:

- Daily focus and tasks.
- Focus modes.
- Notes and task integrations.
- Soundscapes.
- Tab stash.
- AI assistance.

Tabyss response:

- Offer Focus Home as an optional new-tab mode.
- Do not require new-tab replacement for core value.
- Use the surface for intention and task start, not another content feed.
- Keep AI optional and privacy-scoped.

Reference: [Momentum Chrome listing](https://chromewebstore.google.com/detail/momentum/laookkfknpbbblfpciffpaejjkokdgca).

### Tabs, sessions, and workspaces

Examples: Workona, Toby, and Session Buddy.

Common capabilities:

- Spaces or collections.
- Save/restore tab sessions.
- Search and organization.
- Cross-device sync.
- Shared resources.
- Crash recovery.

Tabyss response:

- Build task-linked Spaces rather than a general bookmark database.
- Combine workspace restoration with focus execution.
- Treat tab titles and URLs as sensitive history.
- Keep local recovery complete; make any sync separately optional.

References: [Workona Tab Manager](https://workona.com/help/tab-manager/), [Toby](https://www.gettoby.com/), [Session Buddy](https://sessionbuddy.com/docs/).

### Browser task capture

Example: Todoist browser extension.

Common capabilities:

- Add the current page as a task.
- Capture selected text.
- Quick Add from the browser.
- Open a task manager without changing context.

Tabyss response:

- Add lightweight Action Capture and third-party handoff.
- Never become a full project-management system.
- Read selected text only after an explicit capture action.

Reference: [Todoist browser extension](https://www.todoist.com/help/articles/use-the-todoist-extension-on-your-web-browser-EZERGsoH).

### Accountability and co-focus

Examples: Opal friends and Focusmate.

Common capabilities:

- Focus with a friend.
- Goal check-in and completion check-out.
- Groups and challenges.
- Leaderboards or partner presence.

Tabyss response:

- If connected features are approved, share derived completion only.
- Prefer invite-only presence and personal-goal consistency.
- Do not expose domains or raw time by default.
- Avoid stranger video matching inside the extension; integrate or limit to known contacts.

Reference: [Focusmate](https://www.focusmate.com/media-kit/).

## Adopt, adapt, avoid

| Capability | Decision direction | Reason |
|---|---|---|
| Automatic active-time tracking | Adopt and improve | Current strength and insight foundation |
| Focus timer and recurring sessions | Adopt | Closes plan-to-action gap |
| Site limits and allowlists | Adopt | Clear browser-native utility |
| Strict mode | Adapt | Must be honest, recoverable, and user-selected |
| Mindful pause | Adopt and differentiate | Strong recovery mechanism when linked to intent |
| Workspaces and session restore | Adopt narrowly | Directly reduces tab context loss |
| Full bookmark manager | Avoid | Scope dilution |
| Lightweight task capture | Adopt | Connects browsing to action |
| Full task/project suite | Avoid | Mature integrations already exist |
| Optional new-tab surface | Adopt | High-frequency plan/start surface |
| Forced new-tab replacement | Avoid | Permission/trust and retention risk |
| Public raw-time leaderboard | Avoid | Misleading and harmful comparison |
| Friend co-focus | Optional connected | Valuable but requires service and consent |
| Domain-level family monitoring | Avoid | Surveillance and trust risk |
| Generic cloud AI over history | Avoid | Privacy contradiction |
| Local insight assistant | Explore | Can reduce setup and explain results |

## Defensible differentiation

1. Local-first behavioral intelligence.
2. Intent-aware categorization instead of permanent moral labels.
3. Plan, workspace, intervention, and reflection connected in one loop.
4. Recovery as a success metric.
5. Personality and Wrapped built from explainable private data.
6. Sustainable productivity that treats rest and shutdown as outcomes.

## Competitive test

Every proposed feature should answer:

- Does it create or strengthen an intentional outcome?
- Can it operate meaningfully inside Chrome?
- Is it better because it connects to Tabyss's local behavior model?
- Can the user understand and control the required permission/data?
- Would the product remain coherent if this feature were the user's only enabled module?

If the answer is no, integrate with the specialist product or omit the feature.
