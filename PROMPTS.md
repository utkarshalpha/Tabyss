# Tabyss Product and Engineering Prompt Templates

These templates implement the user-supplied plan-first, grounded, option-based working method for Tabyss.

## Product decision

```text
Role: Senior product manager for a privacy-first Chrome extension.
Task: Decide [decision].
Context: Read the current implementation, docs/v2, and relevant ADRs.
Steps:
1. State verified facts.
2. Present three viable options.
3. Compare user value, privacy, UX, engineering effort, risk, and reversibility.
4. Recommend one option.
5. Define success and guardrail metrics.
Format: ADR using docs/v2/decisions conventions.
Rules: Do not invent current behavior. Leave status Proposed until owner approval.
```

## Feature definition

```text
Role: Senior PM and extension architect.
Task: Define [feature] for Tabyss V2.
Output:
1. User problem and JTBD
2. Scope and non-scope
3. End-to-end journey
4. Functional requirements
5. Empty/loading/error/denied/offline states
6. Privacy and permissions
7. Analytics events and guardrails
8. Acceptance criteria
9. Rollout and rollback
Rules: Chrome-extension-only core; local-first; no new dependency or permission without a decision.
```

## Implementation wave

```text
Role: Senior product engineer, product manager, designer, security reviewer, and release owner.
Task: Implement Tabyss V2 Wave [N] on its own codex/v2-* branch.
Inputs: Current repository, accepted ADRs, docs/v2 feature requirements, prior build records.
Steps:
1. Verify current behavior and write the concrete exit gate.
2. Record every durable choice as an ADR; do not silently accept unrelated Proposed ADRs.
3. Implement the smallest coherent end-to-end vertical slice, including denied/error/recovery states.
4. Update schema/migration/backup behavior and privacy/permission copy when affected.
5. Add unit, integration, browser/UI, accessibility, performance, and manual QA evidence in proportion to risk.
6. Self-review security boundaries, races, data loss, hostile inputs, worker suspension, and rollback.
7. Write docs/v2/builds/wave-[N]-*.md with branch, decisions, files, evidence, limitations, and recovery.
8. Commit only after checks pass; never hide a failed or manual-only gate.
Rules: Core stays local-first and Chrome-extension-only. No dependency, permission, telemetry, connection, or remote code without an Accepted ADR.
```

## Architecture decision

```text
Role: Staff Chrome-extension engineer.
Task: Evaluate [architecture problem].
Grounding: Inspect manifest.json and affected runtime/storage code.
Compare three options on MV3 lifecycle, correctness, performance, storage, privacy, migration, testability, and Chrome Store risk.
Deliver: Proposed ADR plus a test strategy. Do not implement until accepted.
```

## Security review

```text
Role: Product-security reviewer.
Task: Threat-model [feature].
Cover: assets, actors, trust boundaries, abuse cases, permission escalation, data exposure, spoofing, tampering, replay, denial of service, unsafe import/sync, logging, deletion, and recovery.
Output: Critical issues, required controls, residual compromises, verification plan.
```

## UX review

```text
Role: Senior product designer for browser extensions.
Task: Review [flow].
Check: comprehension, user control, progressive disclosure, interruption cost, permission trust, keyboard/screen-reader access, reduced motion, contrast, zoom, empty/loading/error states, undo, and mobile-size popup constraints.
Deliver: problems ranked by severity and a revised journey.
```
