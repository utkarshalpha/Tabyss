# Chrome-Extension System Design

## Scope boundary

This design covers a Chrome Manifest V3 extension. Optional remote integrations are isolated behind adapters and are not required for the local product.

## Current architecture

The current implementation uses:

- `background.js` as a service worker for tab/window/idle events, minute alarms, aggregation, goals, and wellbeing orchestration.
- `content.js` on HTTP/HTTPS pages for media classification and overlays.
- `common.js` for shared settings, classification, scoring, badges, personas, and week analytics.
- `chrome.storage.local` for settings, state, and date-keyed aggregates.
- Separate popup, dashboard, options, and Wrapped extension pages.

ADR-021 keeps this dependency-free architecture for the final local V2 and adds:

- `product.js` as the pure, bounded product-schema and rule module.
- `sidepanel.html` / `sidepanel.js` as the Command Center.
- A versioned `product` document in `chrome.storage.local` for Profiles, Plans,
  Spaces, Return Capsules, checkpoints, the active Focus Contract, schedule prompt
  keys, guard cooldowns, and recovery outcomes.
- Worker-owned `PRODUCT_COMMAND` and `GUARD_DECISION` paths protected by the existing
  storage mutex and sender-context allowlist.
- Backup format 4 and storage metadata schema 3.

The larger IndexedDB event architecture below remains a design option, not a claim
about the shipped V2. ADR-021 selected a bounded local document because the record
limits make it simpler to migrate, validate, export, and recover now.

## Implemented V2 command flow

```text
Popup / Command Center
        |
        | validated query or command
        v
Service worker mutex
        |
        +-- common.js: settings, aggregate analytics, focus state machine
        +-- product.js: schema, URL/domain rules, duplicate identity
        |
        +-- chrome.storage.local (validated product + focus + aggregates)
        +-- chrome.tabs (previewed/reversible context changes)
        +-- content.js (media, wellbeing, mindful guard only)
```

Critical ordering is intentional: a checkpoint is persisted before a confirmed
Focus Contract parks tabs or duplicate cleanup removes them. Restore only opens
missing safe HTTP(S) pages; it does not close the user's current work.

## Proposed logical architecture

```text
Extension surfaces
  popup | side panel | dashboard | options | new tab | intervention page
        |
Application services
  onboarding | profiles | plans | focus | guard | spaces | capture | wellbeing | insights
        |
Domain core
  time | sessions | classification | policies | scoring | recommendations | state machines
        |
Adapters
  Chrome events | DNR | tabs/groups | content scripts | notifications | commands | optional integrations
        |
Persistence
  chrome.storage.session | chrome.storage.local | IndexedDB | export/import
```

The domain core must be free of direct DOM and Chrome API calls so it can be unit tested with deterministic clocks and event streams.

## Runtime components

### Service worker

Responsibilities:

- Subscribe to Chrome lifecycle, tab, window, idle, alarm, command, notification, storage, permission, and rule events.
- Convert Chrome events into normalized domain events.
- Advance plan/focus/wellbeing state machines.
- Maintain active session state.
- Commit bounded events and aggregates.
- Reconcile blocking rules.
- Dispatch typed messages to extension surfaces/content scripts.

Constraints:

- The worker can suspend at any time.
- No critical state may exist only in memory.
- Handlers must be idempotent.
- Alarms are recovery/heartbeat mechanisms, not precision timers.
- Every async operation must handle extension update/reload and missing tab errors.

### Extension pages

- Popup: fast snapshot and command launch.
- Side panel: persistent working control center.
- Dashboard: analysis and configuration.
- Options/privacy: permission and data control.
- New tab: optional Focus Home.
- Block/intervention page: extension-controlled safe destination for DNR redirects.
- Wrapped: weekly story and share generation.

Surfaces should use a shared typed message client, data selectors, and design tokens.

### Content script

Keep minimal and capability-scoped:

- Supported media state classification.
- Explicitly enabled feed/recommendation controls.
- On-page pre-break or mindful intervention when appropriate.
- Quiet-context signals using coarse local checks.

It must not:

- Read page text, form values, credentials, or selection unless the user invokes a specific capture action.
- Read/write the primary extension data store.
- receive secrets or unencrypted sync keys.
- determine policy decisions independently.

Use optional host permissions or dynamic registration where viable. Set extension storage access to trusted contexts because the content script does not need direct storage.

### Declarative blocking engine

- Translate active plan policy into dynamic/session DNR rules.
- Limit rules to main-frame navigation unless a narrowly approved use case requires otherwise.
- Use deterministic rule IDs and namespaces.
- Reconcile expected versus actual rules after startup/update.
- Fail open with clear health warning on rule corruption; do not trap users accidentally.
- Keep emergency and internal extension URLs allowlisted.
- Maintain a user-readable explanation of every active rule.

## Data model

### Event envelope

```text
eventId           globally unique local ID
schemaVersion     event schema version
deviceId          local installation/device identity
sequence          monotonically increasing per device
eventType         session_started, segment_recorded, plan_started, etc.
occurredAt        local timestamp with timezone offset metadata
recordedAt        commit timestamp
source            tab, alarm, idle, user, recovery, import
payload           versioned event-specific object
```

### Activity segment

```text
segmentId
startMs
endMs
domain            normalized hostname or eTLD+1 according to policy
profileId
planId?           optional active plan
categoryAtTime
activityKind      normal, video, short_form, feed_scroll
confidence        high, medium, recovered
deviceId
```

Full URLs and page titles are not part of the default segment.

### Plan

```text
planId
name
profileId
schedule
executionMode     timer, stopwatch, pomodoro, flow
successDefinition
sitePolicies
interventionPolicy
workspaceId?
wellbeingPolicy
createdAt
updatedAt
enabled
```

### Space

```text
spaceId
name
profileId
tabs[]            local URL/title metadata, classified as sensitive
groups[]
linkedPlanIds[]
createdAt
updatedAt
checkpointType
```

### Materialized views

- Daily totals by domain/category/profile/plan/activity kind.
- Hour buckets.
- Focus and unplanned segments.
- Switches and rabbit holes.
- Intervention outcomes.
- Wellbeing outcomes.
- Weekly persona/score inputs.

Materialized views are rebuildable from retained events where events exist. Older compacted periods may retain aggregates only.

## Storage options

### Option A - Continue only with `chrome.storage.local`

- Advantages: minimal change, simple export.
- Weaknesses: whole-object read/write growth, 10 MB default quota, awkward event querying, higher corruption/race blast radius.

### Option B - IndexedDB events plus `chrome.storage.local` settings/aggregates - recommended

- Advantages: append-oriented events, indexed range queries, smaller atomic records, fast settings/summaries, rebuild support.
- Weaknesses: migration and transaction complexity; two storage systems to reconcile.

### Option C - Aggregate-only V2

- Advantages: smallest storage footprint.
- Weaknesses: cannot provide honest timelines, plan alignment, recovery analysis, or rebuilds.

Recommendation: Option B, subject to ADR acceptance.

Proposed allocation:

- `chrome.storage.session`: current ephemeral active session/locks/cache.
- `chrome.storage.local`: settings, profiles, plans, feature flags, compact daily/weekly views, migration metadata.
- IndexedDB: activity events, focus/intervention outcomes, Space checkpoints, import staging, optional encrypted outbox.

## State machines

### Focus session

```text
draft -> scheduled -> starting -> active <-> paused -> completing -> completed
                                     |              -> abandoned
                                     -> recovering  -> active/completed/abandoned
```

### Intervention

```text
eligible -> suppressed | shown -> left | continued | snoozed | rule_changed
continued -> waiting -> reintervention_due -> shown
```

### Wellbeing routine

```text
accumulating -> prewarned -> due -> shown -> completed | snoozed | skipped | suppressed
```

Every transition is persisted before relying on a future worker wakeup.

Wave 1A implements the deliberately smaller ADR-019 machine while ADR-005 remains
Proposed:

```text
none -> running <-> paused
          |          |
          +--------> review -> running (extend)
          |             |
          +-------------+-> completed | abandoned -> none
```

`focusActive` is the restart-recovery record; `focusSessions` is a bounded outcome
view. Elapsed time is derived from timestamps and accumulated running segments.
The `focus-end` alarm is reconciled whenever a fresh worker is evaluated and is a
wake-up hint, not the clock or evidence of completion.

## Concurrency and correctness

- Replace one global promise chain with named transactional queues where independent domains permit concurrency.
- Keep activity/session writes serialized.
- Use IndexedDB transactions for related event/outbox/view changes.
- Add optimistic revision checks to settings/plans edited from multiple surfaces.
- Use idempotency keys for every command that can be retried.
- Split durations at midnight, hour, profile, plan, and category-rule boundaries.
- Version algorithms used for historical scores/personas.

## Typed message contract

Message families:

- Queries: `GET_SNAPSHOT`, `GET_TIMELINE`, `GET_PLAN`, `GET_SPACE`, `GET_HEALTH`.
- Commands: `START_PLAN`, `PAUSE_PLAN`, `COMPLETE_PLAN`, `APPLY_RULE`, `CAPTURE_PAGE`, `DELETE_RANGE`.
- Content signals: `MEDIA_BEAT`, `QUIET_CONTEXT`, `INTERVENTION_RESULT`.
- Worker events: `STATE_CHANGED`, `DATA_CHANGED`, `PERMISSION_CHANGED`, `HEALTH_CHANGED`.

Every message requires:

- Schema validation.
- Allowed sender context.
- Request/command ID.
- Version.
- Bounded payload.
- Structured success/error response.

## Optional integration boundary

Connected adapters live behind a single interface:

```text
connect()
disconnect()
capabilities()
previewPayload(action)
execute(action, approvedPayload)
health()
```

Tokens must not be available to content scripts. A failed or disconnected adapter falls back to local capture/configuration.

## Migration strategy

1. Detect current schema and estimate storage.
2. Create pre-migration export/checkpoint.
3. Migrate settings first.
4. Convert historical aggregates without inventing sessions.
5. Mark pre-V2 periods as aggregate-only with appropriate confidence.
6. Start event capture from V2 activation.
7. Verify counts/checksums.
8. Commit schema pointer only after validation.
9. Retain rollback checkpoint for a bounded period.

Never manufacture site switches, intent, or timeline detail for historical data that did not record it.

## Performance budgets

Proposed initial budgets:

- Popup interactive: under 200 ms for warm local data; under 500 ms cold.
- Side-panel command acknowledgement: under 100 ms local.
- Dashboard first meaningful summary: under 750 ms for 180 days of typical aggregates.
- Content-script periodic work: under 5 ms average per sampling interval on typical pages.
- No measurable page-load delay from synchronous content-script work.
- Service-worker active work minimized and event driven.
- Blocking decision handled by Chrome DNR rather than page script.
- Storage growth estimated and surfaced before quota risk.

Budgets require measurement on low/mid-range hardware, large tab counts, and worst-case retained history.

## Browser compatibility

- Chrome is the V2 source of truth.
- Edge compatibility should remain where APIs match.
- Isolate Chrome-specific APIs behind adapters to keep later browser ports possible without making them V2 scope.
- Define minimum Chrome version based on the final chosen side-panel/DNR/tab-group APIs.
