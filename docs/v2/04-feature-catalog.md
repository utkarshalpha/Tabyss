# V2 Feature Catalog

All capabilities belong to the V2 program. Classification controls packaging and rollout, not a hypothetical future major version.

> Final release overrides: ADR-023 retires Profiles, Plans, schedules, Spaces,
> Focus Contracts, drift guard, duplicate/manual recovery UI, and side-panel metrics.
> They remain here as evaluated V2 opportunities, not shipped product claims. Saved
> pages, insights, wellbeing, local data control, and ADR-024's simple optional
> session are active.

## Packaging levels

- Core: enabled in the standard local product after onboarding.
- Power: optional local module enabled by the user.
- Connected: optional capability requiring a network connection and separate consent/decision.

## Foundation and onboarding

### FND-01 Capability-based onboarding - Core

- Ask the user's main outcome: focus, reduce scrolling, organize tabs, protect wellbeing, or understand patterns.
- Explain current tracking and storage in plain language.
- Let the user enable only the modules they want.
- Request permissions at the point of value where Chrome allows.
- Provide a live demo with synthetic data while real baseline is sparse.
- Establish a calibration period and show progress toward a credible first insight.
- Provide Skip, Not now, and Review later.

### FND-02 Permission and data receipt - Core

- List every permission, purpose, accessed data, retained data, and disable path.
- Show which features stop working when denied.
- Record no behavioral data for a module before required consent.
- Provide a current “What Tabyss can see” view.

### FND-03 Profiles - Core

- Work, Study, Personal, and custom profiles.
- Profile-specific categories, goals, schedules, quiet contexts, and interventions.
- Manual and scheduled switching.
- Clear active-profile indicator.

## Tracking and classification

### TRK-01 Session event model - Core

- Store bounded active sessions rather than only daily totals.
- Split events correctly across hour/day/time-zone boundaries.
- Preserve daily materialized aggregates for fast surfaces.
- Assign confidence and source metadata.
- Deduplicate after worker restarts and event replays.

### TRK-02 Context-aware classification - Core

- Domain default category.
- Profile-specific override.
- Plan/session override.
- Optional rule by schedule or path pattern without storing path history.
- In-context “productive for this plan” correction.
- Correction history and immediate recalculation.

### TRK-03 User control - Core

- Pause tracking temporarily or indefinitely.
- Ignore domain and subdomains.
- Expiring exclusions.
- Delete a site, date, range, category, or all data.
- Edit or split a session.
- Exclude incognito unconditionally unless a separate Accepted policy changes this.

### TRK-04 Accuracy resilience - Core

- Handle idle, sleep, clock change, worker suspension, offline state, browser restart, multiple windows, audible tabs, and focus changes.
- Surface missing permission/data gaps instead of silently showing false zeroes.
- Add storage quota monitoring and graceful compaction.

## Planning and goals

### PLN-01 Quick intention - Core

Wave 1A status: implemented for action, optional duration/success definition, and
recent-intention reuse in the popup; relevant-site/tab linking remains deferred.

- Create an intention in under ten seconds.
- Fields: action, optional duration, optional success definition, optional relevant sites/tabs.
- Reuse recent intentions.
- Natural-language parsing may be local and optional.

### PLN-02 Plans - Core

- One-time or recurring plan.
- Timer, stopwatch, Pomodoro, or flow execution.
- Start/end schedule.
- Blocklist, allowlist, open limit, duration limit, and intervention strength.
- Break routine and shutdown behavior.
- Optional linked workspace/task/calendar event.

### PLN-03 Goal types - Core

- Minimum intentional-focus time.
- Maximum unplanned category/site time.
- Maximum opens.
- Maximum continuous visit.
- Protected schedule/window.
- Switch-rate target.
- Tab-cap target.
- Wellbeing routine target.
- Weekly consistency target.

### PLN-04 Templates and recommendations - Core

- Workday, study, exam, creator, developer, research, sleep, and gentle-reset templates.
- Recommend only after sufficient baseline.
- Explain supporting evidence and confidence.
- User must approve every new rule.

## Focus execution and intervention

### FOC-01 Focus session - Core

Wave 1A status: implemented from the popup for timer/stopwatch, pause, resume,
extend, complete, abandon, restart recovery, checkout note, and dashboard reflection.
Other entry surfaces and relevant-tab controls remain deferred.

- Start from popup, side panel, new tab, keyboard shortcut, context menu, dashboard, or saved plan.
- Show task, elapsed/remaining time, active controls, and relevant tabs.
- Pause, extend, complete, abandon, and emergency-exit states.
- Completion check-out and optional note.

### FOC-02 Protection ladder - Power

- Observe.
- Notify.
- Mindful pause.
- Timed delay.
- Soft block.
- Allowlist-only.
- Strict session.
- Per-plan emergency bypass policy.

### FOC-03 Browser blocking - Power

- Browser-managed main-frame block/redirect rules.
- Site, domain, category, and schedule rules.
- User-readable active-rule list.
- Safe internal block page.
- No interception or storage of network request contents.
- Rebuild and recover rules after update/restart.

### GRD-01 Mindful pause - Power

- Show current intention, elapsed time, visit count, and chosen limit.
- Continue intentionally, leave, save for later, or change the plan.
- Optional breathing/short delay.
- Accessibility-complete keyboard behavior.

### GRD-02 Re-intervention and recovery - Power

- Ask intended visit duration.
- Re-intervene after expiry.
- Offer return to prior planned tab/workspace.
- Record accepted, dismissed, snoozed, bypassed, and recovered outcomes locally.
- Apply fatigue cooldowns.

### GRD-03 Supported-site distraction controls - Power

- Hide selected home feeds, recommendations, short-form panels, or comments for supported sites.
- Apply grayscale or finite-scroll cues.
- Provide per-site preview and immediate disable.
- Fail open if a site changes; never break primary page controls.

### GRD-04 Quiet-context detection - Core

- Suppress or defer interruption during fullscreen, presentation, meeting, checkout, authentication, unsaved form activity, and user-defined sites.
- Never infer sensitive context by uploading page information.

## Spaces and browser organization

### SPC-01 Task-linked Spaces - Power

- Save current tabs/window as a named Space.
- Associate with profile, plan, or task.
- Restore all or selected tabs.
- Avoid duplicate restore.
- Preserve pinned and grouped state where APIs allow.

### SPC-02 Session recovery - Core

- Automatic local checkpoints.
- Restore after browser/extension crash.
- Show what will reopen before action.
- Retention and storage limits.

### SPC-03 Tab hygiene - Power

- Duplicate detection.
- Stale-tab suggestions.
- Tab snooze.
- Parking.
- Category/project auto-group suggestions.
- Tab-cap warnings.
- Bulk close with undo/restore.

### SPC-04 Focus workspace - Power

- Open relevant Space at focus start.
- Park/collapse unrelated tabs with confirmation.
- Restore prior state at completion.
- Recover safely if the session or browser ends unexpectedly.

## Browser action capture

### CAP-01 Local capture - Core

- Save current page as a task, read-later item, or plan resource.
- Optional selected-text capture only after explicit user action.
- Add estimate, due date, profile, and Space.
- Search and complete captured actions.

### CAP-02 Third-party handoff - Connected

- Send a selected capture to an approved task tool.
- Preview payload and destination.
- Minimal OAuth scopes.
- Revoke integration and delete cached tokens.
- Local fallback when disconnected.

## Insights and reflection

### INS-01 Today - Core

- Planned versus unplanned time.
- Intentions completed.
- Timeline.
- Focus/recovery events.
- Switches, rabbit holes, media, categories, and wellbeing.
- One prioritized next action.

### INS-02 Explainable score - Core

- Show every component, weight, sample threshold, and correction effect.
- Replace generic productive share with intent alignment where available.
- Use no score when data is insufficient.
- Version score algorithms and avoid rewriting historical interpretation silently.

### INS-03 Weekly review - Core

- What improved, regressed, and remained uncertain.
- Intervention effectiveness.
- Best focus window.
- Repeated triggers.
- Goal adjustment.
- One experiment for the next week.
- Wrapped/persona story connected to these findings.

### INS-04 Personal experiments - Power

- Choose one behavior change and duration.
- Establish baseline and success condition.
- Compare with confidence limits.
- Use correlation language.
- Stop early and revert rules.

### INS-05 Data exploration/export - Core

- Custom range compare.
- Profile, plan, category, site, device, and day-type filters where data exists.
- Search.
- Accessible table alternative for charts.
- JSON, CSV, printable report, and encrypted backup.

## Wellbeing

### WEL-01 Recovery routines - Core

- Eye, water, stand, stretch, breathing, walk, meal, digital sunset, and shutdown.
- Active-time and schedule triggers.
- Done, snooze, skip, disable, and quiet-context behavior.
- Custom cadence and tone.

### WEL-02 Sustainable-work guardrails - Core

- Rest days and vacation mode.
- Streak grace.
- Maximum daily focus target.
- Long-session fatigue warning.
- End-of-work ritual.
- Never reward extreme tracked time.

## Surfaces and controls

### UI-01 Action popup - Core

- Current state.
- One primary action.
- Today progress.
- Open Command Center/dashboard/settings.
- No long scrolling dashboard inside popup.

### UI-02 Side-panel Command Center - Core

- Persistent session, plan, site status, tasks, Space, and quick controls.
- Remains useful without any connected service.

### UI-03 Optional Focus Home - Power

- User explicitly chooses new-tab replacement.
- Today intention, quick start, recent Space, capture, progress, and next break.
- Minimal and customizable.

### UI-04 Context menu and shortcuts - Core

- Start focus.
- Capture current page/selection.
- Categorize/ignore/limit current site.
- Save Space.
- Pause tracking.
- User-configurable commands.

## Data and optional connections

### DAT-01 Safe import/export - Core

- Versioned schema validation.
- Size/depth/range limits.
- Preview merge/replace impact.
- Backup before import/migration.
- Partial recovery and actionable errors.

### CON-01 Optional encrypted backup/sync - Connected, undecided

- Must have a separate Accepted ADR before implementation.
- Local-only behavior remains complete.
- User selects sync scopes: settings, aggregates, raw sessions, Spaces, or captures.
- Client-side encryption and device revocation required.

### CON-02 Optional accountability connection - Connected, undecided

- Invite-only known contacts.
- Share completion/consistency selected by the user.
- No domains or exact timeline by default.
- Block, leave, revoke, and abuse controls.

## Cross-cutting acceptance requirements

Every feature must document and test:

- First-use and repeat-use journey.
- Empty, loading, sparse, stale, denied, disabled, offline, error, update, and recovery states.
- Keyboard, screen reader, zoom, contrast, and reduced-motion behavior.
- Permission and privacy implications.
- Storage and migration implications.
- Analytics events with no sensitive payload.
- Performance budget.
- Rollout flag, kill switch, and rollback.
- Help copy and diagnostics.
