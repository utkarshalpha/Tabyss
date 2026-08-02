# Analytics, North Star, and Experimentation

## Decision problem

The current local-only product can calculate personal outcomes but cannot calculate centralized retention or feature funnels. V2 must distinguish:

- Personal analytics: always local and required for product value.
- Product analytics: optional aggregate events used to improve Tabyss.
- Diagnostics: separately consented technical data used to fix failures.

These must never be bundled into one ambiguous switch.

## North Star options

### Option A - Weekly active users

- Advantage: Standard and easy to compare.
- Weakness: Rewards opening Tabyss, not improved browsing.

### Option B - Time reclaimed

- Advantage: Strong marketing language.
- Weakness: Counterfactual cannot be measured reliably and may label necessary browsing as waste.

### Option C - Weekly Intentional Outcome Users - recommended

Definition: distinct users who achieve a self-selected intentional outcome on at least three distinct days in a seven-day period.

Qualifying outcomes:

- Complete a planned focus session meeting the chosen minimum.
- Stay within a self-selected maximum/open limit.
- Accept an intervention and return to the intended context for the configured recovery window.
- Complete a selected wellbeing or shutdown routine.

Advantages:

- Aligns measurement with user intent.
- Supports both productivity and wellbeing goals.
- Avoids assuming lower browser time is always better.

Risks:

- Requires careful anti-gaming and fair qualification.
- Central calculation requires opt-in product analytics or aggregated client reports.

## Local North Star behavior

Every user can see their intentional outcomes locally even if product analytics is disabled. Disabling telemetry must not remove personal metrics.

Final local V2 implements this without telemetry in the Command Center:

- **Intentional outcome days:** distinct days in the trailing local seven-day window
  with a user-marked completed focus session or a successful Return-to-plan choice.
  The UI shows progress to three days (`n/3`) rather than claiming a centralized user
  metric.
- **Supporting signals:** intentional focus minutes and successful returns in the
  same window.
- **Separate diagnostics:** saved Return Capsules, plan starts, passive Focus Score,
  and tracked time are useful context but do not automatically count as success.

No event is transmitted, no installation identifier exists, and Tabyss cannot claim
cohort retention, conversion, or feature-funnel performance from this build. The
company-level "Weekly Intentional Outcome Users" remains a definition for future
consented research, not a measured production KPI.

## KPI tree

### Acquisition

- Store impression-to-install conversion.
- Install completion.
- Permission comprehension/acceptance by module.

### Activation

- Qualified baseline completion.
- First outcome selected.
- First plan started.
- First intentional outcome completed.
- Time to first credible insight.
- Time to first outcome.

### Engagement

- Intentional days per week.
- Plans started/completed.
- Recovery interventions accepted.
- Spaces created/restored.
- Weekly reviews completed.
- Actions taken from insights.

### Retention

- D1, D7, W4, W8 value retention.
- Percentage of activated users with three weekly outcomes.
- Module retention after permission grant.

### Outcome

- Goal adherence against personal baseline.
- Unplanned-session reduction.
- Context-switch change during plans.
- Recovery rate.
- Shutdown/sleep-window adherence.
- User-reported usefulness and control.

### Trust and guardrails

- Uninstall after permission request or intervention.
- Permission revocation.
- Tracking pause frequency.
- Notification disablement.
- Intervention dismiss/snooze/bypass.
- Classification-correction rate.
- Data deletion and export success.
- Privacy-setting comprehension.
- Support reports about false tracking.

### Quality

- Crash-free extension sessions.
- MV3 worker failure rate.
- Data-gap days.
- Storage/quota failure.
- Migration success.
- Block-rule recovery.
- CPU time, content-script work, memory, and page-load impact.

## Event taxonomy for optional product analytics

Allowed event families:

- `onboarding_started`, `onboarding_completed`
- `module_enabled`, `module_disabled`
- `permission_prompted`, `permission_granted`, `permission_declined`, `permission_revoked`
- `baseline_qualified`
- `outcome_selected`
- `plan_created`, `plan_started`, `plan_completed`, `plan_abandoned`
- `focus_started`, `focus_completed`, `focus_bypassed`
- `intervention_shown`, `intervention_left`, `intervention_continued`, `intervention_snoozed`
- `recovery_completed`
- `space_created`, `space_restored`, `tab_cleanup_completed`
- `capture_created`, `capture_sent_to_integration`
- `insight_viewed`, `insight_actioned`, `weekly_review_completed`
- `wrapped_viewed`, `wrapped_shared`
- `wellbeing_routine_completed`
- `export_completed`, `import_completed`, `deletion_completed`
- `extension_error` with approved coarse error code

Forbidden analytics properties:

- Domain, URL, path, query, page title, favicon, selected text, note/task text, plan text, search term, form value, notification content, incognito state, contact identity, exact timeline, or raw event store.

Privacy transformations:

- Coarse duration buckets.
- Coarse local-hour buckets where necessary.
- Feature/module identifiers rather than site identifiers.
- No advertising identifier.
- Rotating pseudonymous installation identifier if centralized retention is approved.
- Minimum cohort threshold for reports.
- Retention and deletion limits.

## Diagnostics

Diagnostics are not product analytics.

Allowed only after separate consent:

- Extension/browser version.
- OS family.
- Enabled module set.
- Permission state.
- Coarse storage usage.
- Error codes and redacted stack fingerprints.
- Recent state-machine transitions with all user content removed.

The user must preview a generated diagnostics package before sharing it.

## Experimentation rules

- Experiments may change copy, onboarding order, defaults, recommendation timing, or intervention design.
- Experiments must not silently expand permissions, data collection, sharing, strictness, deletion behavior, or connected services.
- Guardrail stop conditions must be defined before launch.
- Every experiment requires hypothesis, primary metric, guardrails, minimum sample, duration, segment, exclusion, and rollback.
- Local-only users may receive deterministic bundled variants only if no telemetry is needed and behavior remains equivalent.

## Initial experiments

1. Synthetic demo versus empty dashboard during calibration.
2. Outcome-first versus feature-first onboarding.
3. Popup primary action: Set intention versus Start focus.
4. Mindful pause with current intention versus generic breathing pause.
5. Weekly review with one recommendation versus multiple recommendations.
6. Tab cleanup after focus versus proactive threshold suggestion.

## Measurement compromise

If owner chooses zero centralized telemetry, Tabyss should remove claims that require centralized behavioral measurement. Store installs, ratings, reviews, voluntary surveys, and user-exported research panels can still guide the product, but cohort retention and feature funnels cannot be presented as known facts.
