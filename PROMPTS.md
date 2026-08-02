# Tabyss Product and Engineering Prompt Templates

These templates implement the user-supplied plan-first, grounded, option-based working method for Tabyss.

## Decision and build trace ledger

Every implementation wave must add an entry here so the prompt method, durable
decision, code branch, and verification record stay connected rather than living
only in chat.

### 2026-08-02 — Wave 1 intentional-session vertical slice

- **Delegated task:** take senior-PM/engineering decisions and build the next
  coherent V2 Chrome-extension slice on a separate branch, while preserving the
  local-first trust contract.
- **Verified constraint:** MV3 workers are short-lived, alarms can be delayed, and
  critical active state cannot depend on popup/worker memory.
- **Options considered:** popup-memory timer; persisted timestamp state with bounded
  local outcomes; or blocking user value on the full proposed IndexedDB event model.
- **Selected decision:** the persisted timestamp state machine in
  [ADR-019](docs/v2/decisions/ADR-019-intent-session-state.md). Broader side-panel
  and IndexedDB decisions remain Proposed.
- **Product choices:** intention is the popup's primary action; timer expiry means
  review, never automatic success; completion and abandonment require checkout;
  passive Focus Score and chosen focus outcomes remain distinct.
- **Trust choices:** no new dependency, permission, network path, account, telemetry,
  or page-content capture; focus restores are blocked while a valid session is active.
- **Build branch:** `codex/v2-wave1-intent-session`.
- **Evidence/rollback:** [Wave 1 build record](docs/v2/builds/wave-1-intent-session.md).

This ledger records decisions actually taken. Future ideas stay in the V2 catalog
or Proposed ADRs until their own implementation wave is authorized and verified.

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

## Release verification

```text
Role: Release owner and product-security reviewer.
Task: Verify a Tabyss branch without changing user data or publishing anything.
Steps:
1. Run verify.ps1 and preserve the complete pass/fail output.
2. Confirm manifest permissions, content-script scope, CSP/local assets, and package-files.json against Accepted ADRs.
3. Build twice and require identical SHA-256 plus exact runtime entries.
4. Run the unpacked-extension QA checklist for worker lifecycle, Incognito, permissions, notifications, import/download, and browser-origin messages.
5. Record automated, Chrome, manual, accessibility, performance, and policy evidence separately; never convert a missing manual gate into a pass.
6. Update the wave build record with known issues, artifact hash, rollback, and go/no-go status.
Output: Evidence-backed build record and release recommendation. Do not push, publish, or submit to a store without explicit owner authorization.
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
