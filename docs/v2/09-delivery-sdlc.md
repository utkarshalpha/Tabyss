# Delivery, Release, and Software Lifecycle Plan

## Delivery principle

V2 is one product generation with one architecture and decision set. It should not be exposed to every user in one untestable store update. Capabilities ship through controlled V2 feature waves and remain under the V2 product definition.

## Workstreams

1. Product research and decision acceptance.
2. Data model, storage, migration, and correctness.
3. Design system, accessibility, popup, side panel, and dashboard shell.
4. Plans and focus state machine.
5. Blocking and intervention engine.
6. Spaces, tab hygiene, and recovery.
7. Insights, score evolution, and Wrapped integration.
8. Wellbeing and interruption orchestration.
9. Permissions, security, privacy, import/export, and diagnostics.
10. Optional integration/connectivity decisions.
11. Analytics/research instrumentation decision.
12. CI, automated QA, release, and operations.

## V2 feature waves

### Wave 0 - Decisions and production foundation

- Accept/reject ADRs.
- User research and current-product baseline.
- Modular TypeScript/build/test decision.
- Versioned schemas.
- Import/incognito/ignore/notification hardening.
- CI and release channels.
- Design tokens and accessibility baseline.

Exit gate: current V1 behavior has regression tests and a safe migration path.

### Wave 1 - Intentional core

- Outcome onboarding.
- Profiles.
- Quick intention and Plans.
- Focus timer/flow/Pomodoro.
- Action popup and side panel.
- Initial timeline and intent alignment.

Exit gate: a user can plan and complete an intentional session locally with reliable tracking.

### Wave 2 - Guard and browser control

- Mindful pause.
- Re-intervention and recovery.
- DNR blocking and allowlists.
- Quiet contexts.
- Supported-site controls behind explicit enablement.

Exit gate: interventions are effective, accessible, reversible, and do not trap users or break sensitive contexts.

### Wave 3 - Spaces and capture

- Checkpoints and crash recovery.
- Task-linked Spaces.
- Snooze, duplicate/stale cleanup, and focus workspace.
- Local Action Capture.
- Context menu and shortcuts.

Exit gate: tab operations have preview, undo, restore, migration, and large-tab-count performance coverage.

### Wave 4 - Reflection and sustainable productivity

- Explainable V2 score.
- Weekly review and experiment.
- Wrapped/persona integration.
- Improved wellbeing orchestration.
- Optional Focus Home.

Exit gate: recommendations are supported by adequate data and do not encourage overwork.

### Wave 5 - Optional connections

- Only capabilities with Accepted ADRs.
- Integration payload previews, auth, token management, disconnect, and local fallback.
- If approved: encrypted backup/sync or known-contact accountability.

Exit gate: security review, privacy policy, deletion, incident response, and reliability SLOs are complete.

## Branching and environments

- `main`: production-ready source.
- `codex/v2-*` or owner-named feature branches: reviewed work.
- Release tags: immutable packaged artifacts.
- Dev channel: local unpacked builds.
- Beta channel: separate store listing or controlled cohort where practical.
- Production: staged percentage rollout where store controls permit.

Never use unreviewed remote code. Feature flags change bundled behavior or approved connected configuration; they do not download executable code.

## Proposed engineering modernization options

### Option A - Preserve global vanilla JS files

- Advantages: smallest migration and bundle complexity.
- Weaknesses: difficult modularity, typing, test isolation, and large V2 surface coordination.

### Option B - TypeScript modules with a minimal build pipeline - recommended

- Advantages: typed contracts, modular domain core, bundling compatible with MV3 CSP, strong tests.
- Weaknesses: new toolchain and migration cost; requires owner approval before dependencies.

### Option C - Full UI framework rewrite

- Advantages: mature component/state ecosystem.
- Weaknesses: largest rewrite, bundle/runtime cost, regression risk, and reduced grounding in current code.

Recommendation: Option B. Keep DOM/rendering lightweight; do not rewrite the entire UI solely to adopt a framework.

## Test pyramid

### Unit

- Time/date splitting.
- Domain normalization and categorization.
- Plan and intervention state transitions.
- Focus score/versioning.
- Retention and compaction.
- DNR rule generation.
- Import schemas.
- Recommendation thresholds.

### Property/fuzz

- Clock changes, DST, midnight, long sleeps, and negative/huge deltas.
- Random Chrome event order/repetition.
- Malformed import structures.
- Rule precedence.
- Merge/rebuild equivalence.

### Integration

- Service worker plus fake Chrome adapters.
- IndexedDB transaction/recovery.
- Cross-surface revision conflicts.
- Permission grant/revoke.
- Migration/rollback.

### Extension end-to-end

- Install/update/uninstall lifecycle.
- Worker suspension/restart.
- Multi-window active tracking.
- Focus and blocking flow.
- Intervention and quiet contexts.
- Tab save/close/restore.
- Export/import/delete.
- Connected adapter failure where enabled.

### Visual/accessibility

- Popup, side panel widths, dashboard breakpoints, new tab, intervention, Wrapped.
- Light/dark/high-contrast/reduced-motion.
- 200% zoom.
- Keyboard and screen-reader walkthroughs.
- Color contrast and accessible chart summaries.

### Performance

- 1, 50, 500, and extreme tab counts.
- 7, 180, and maximum-retention histories.
- Content-heavy and video pages.
- Long-running worker lifecycle.
- Storage near quota.

## CI gates

- Formatting/linting.
- Type checking if accepted.
- Unit/property/integration tests.
- MV3 manifest and CSP validation.
- Chrome extension end-to-end smoke tests.
- Accessibility scan.
- Bundle size and permission diff.
- Secret, dependency, license, and vulnerability scan.
- Reproducible packaging and artifact hash.
- Documentation and ADR link check.

## Release gates

- PRD/ADR acceptance.
- Threat model.
- Data-flow and permission review.
- Migration dry run and rollback.
- QA checklist completion.
- Store listing/privacy-policy accuracy.
- Support/diagnostic path.
- Known-issues document.
- Feature-specific kill switch.
- Owner go/no-go.

## Rollout

1. Internal dogfood with synthetic and real local histories.
2. Closed beta with explicit migration consent and feedback.
3. Broader beta with guardrail review.
4. Production canary.
5. Staged rollout.
6. Hold or rollback when crash, data-gap, permission-revocation, uninstall, or support thresholds breach.

## Rollback

- Runtime code can roll back without discarding V2 data.
- Preserve forward-written data where safe; mark unsupported features inactive.
- Maintain schema compatibility window.
- Never downgrade by clearing user storage.
- Disable DNR rules before disabling the controlling feature.
- Keep a local recovery page accessible.

## Documentation deliverables per feature

- Problem/JTBD.
- User journey and wireframes.
- Requirements and acceptance criteria.
- ADRs.
- Data contract and migration.
- Privacy/permission copy.
- Analytics contract.
- Threat model.
- Test plan.
- Rollout/rollback.
- Help and troubleshooting.

## Resourcing reality

A production-grade scope of this size requires staged work. With one engineer, product/design/security/testing become serial constraints. With a small cross-functional team, streams can overlap after the foundation stabilizes. Estimates should be created only after ADR acceptance, design prototypes, and engineering spikes; this document intentionally does not invent a schedule from unknown team capacity.
