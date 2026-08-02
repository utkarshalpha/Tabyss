# Experience and UX Plan

## UX principle

The product should expose one useful action per surface. Internal architecture must
not become navigation or require onboarding before value.

## Information architecture

### Popup - glance and launch

Content order:

1. Current state: Focused, Drifting, Break due, Paused, or No plan.
2. Primary action: Start focus, Return to plan, Take break, or Set intention.
3. Today progress against the chosen outcome.
4. Compact focus score/time.
5. Open Saved pages, dashboard, or settings.

The popup should not contain the full category legend, long site list, multiple reminders, goals, persona details, and reset controls simultaneously. Those belong in expandable or larger surfaces.

### Side-panel Saved pages - keep it without keeping the tab

- Save current page and optional note.
- Saved, Completed, and All filters.
- Favicon, title, domain, note, and saved date.
- Open, Mark completed, Save again, and Delete.
- No Profiles, Plans, Spaces, metrics, checkpoints, or Recovery navigation.

### Dashboard - understand and configure

Recommended navigation:

- Today
- Timeline
- Insights
- Wellbeing
- Wrapped
- Data & Privacy

Connected sections appear only when enabled.

### Focus Home - optional start ritual

- One intention.
- Daily Top Three.
- Start focus.
- Recent Space.
- Capture inbox.
- Progress and next break.
- No news, quotes feed, or engagement content required for core utility.

### On-page intervention

- Wellbeing overlays remain visually distinct and dismissible.
- The retired Plan drift guard is not activated.

## End-to-end journey 1: new user

1. Install.
2. Welcome page explains value and local data architecture.
3. Choose primary outcome.
4. Select recommended modules; advanced modules remain optional.
5. Review permissions/data receipt.
6. Calibrate using passive local tracking.
7. Show synthetic demo until real evidence is credible.
8. Deliver first observation.
9. Ask the user to choose one small outcome.
10. Complete first focus or recovery action.
11. Explain the result and offer the next step.

Exit criteria: user can explain what is tracked, has one configured outcome, and has experienced one successful action.

## End-to-end journey 2: start focused work

1. Open popup/side panel/shortcut.
2. Choose recent task or type intention.
3. Choose duration/mode; recommended value preselected.
4. Select or open a Space.
5. Preview protection: tabs parked, sites limited, breaks scheduled.
6. Start.
7. Work with persistent minimal timer.
8. Capture distractions without opening them.
9. Complete or abandon with reason.
10. Restore prior tab state.
11. Show result, not a celebratory interruption that blocks the next action.

## End-to-end journey 3: unplanned drift

1. User opens a configured site outside the plan.
2. Tabyss applies the selected intervention level.
3. User leaves, continues with a duration, saves for later, or edits the rule.
4. If continuing, Tabyss re-intervenes at expiry.
5. Return action restores the planned tab/Space.
6. Locally record outcome and cooldown.
7. Weekly review evaluates whether the intervention helped.

## End-to-end journey 4: tab overload

1. Tab count or repeated switching crosses a user-selected threshold.
2. Side panel offers duplicates, stale tabs, and group suggestions.
3. User previews proposed action.
4. Save to Space, snooze, close, or ignore.
5. Bulk close always supports restore.
6. Future focus can reopen the relevant Space without reopening everything.

## End-to-end journey 5: weekly review

1. Nonintrusive notification or dashboard cue after enough weekly data.
2. Lead with the chosen outcome.
3. Show result and confidence.
4. Explain top contributing behaviors.
5. Show recovery/wellbeing, not only distraction.
6. Present one recommendation or experiment.
7. User accepts, modifies, or rejects it.
8. Finish with persona/Wrapped delight and privacy-safe share.

## Design system direction

- Preserve violet identity and generative persona art.
- Separate semantic status colors from category colors.
- Use consistent state vocabulary across popup, side panel, dashboard, notifications, and overlays.
- Maintain accessible light/dark palettes.
- Prefer simple cards and progressive detail over dense dashboard grids.
- Use charts only when they answer a specific user question.
- Provide text/table equivalents.

## State vocabulary

- Intentional: activity aligned with the active plan.
- Unplanned: activity outside the active plan; not inherently bad.
- Drifting: user exceeded their stated visit intent or configured pattern.
- Recovering: user is returning to the planned context.
- Focused: active plan with aligned behavior.
- Paused: tracking or plan intentionally paused.
- Unknown: insufficient or missing data.

Avoid labels such as lazy, addicted, failed, bad site, or wasted day.

## Notification model

- One notification budget shared across all modules.
- User-selectable importance levels.
- Digest lower-priority insights.
- Quiet hours and meeting-aware deferment.
- Redacted lock-screen copy by default.
- Every notification opens the exact relevant action, not a generic dashboard.
- Measure dismiss/snooze/disable rates locally; optional aggregate analytics only with consent.

## Accessibility requirements

- WCAG 2.2 AA target for extension pages.
- Full keyboard navigation.
- No click-anywhere-only Wrapped navigation.
- Focus trap and return for dialogs.
- Accessible names and state announcements.
- Screen-reader chart summary and data table.
- 200% zoom without loss of controls.
- High contrast and color-blind-safe category differentiation.
- Reduced motion and transparency.
- Adjustable countdown sound/visual behavior.
- Do not force time-limited input without extension.

## Responsive constraints

- Popup must work at Chrome popup dimensions without hidden primary actions.
- Side panel must support narrow and wide user sizes.
- Dashboard must support laptop and 200% zoom.
- Intervention must handle small viewports, fullscreen video, and pages with extreme z-index values.

## UX quality checklist

Before a flow ships:

- Can a new user understand the primary action in five seconds?
- Can the user undo or recover?
- Is the reason for interruption visible?
- Does denied permission create a truthful fallback?
- Is sparse/unknown data distinguished from zero?
- Can all actions be completed by keyboard and screen reader?
- Is privacy-sensitive content hidden from lock screens and shares by default?
- Does the product avoid rewarding overwork?
