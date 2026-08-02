# V2 Build Register

Every implementation branch gets a build record before merge. The record connects code to the Prompt-Pack workflow: verified facts, decisions, changed behavior, evidence, unresolved risks, and rollback.

| Wave | Branch | Record | State |
|---|---|---|---|
| 0 | `codex/v2-wave0-hardening` | [Trust foundation](wave-0-trust-foundation.md) | Implemented; manual unpacked-extension gates remain |

## Required build record fields

1. Objective and user value.
2. Decisions/ADRs used.
3. Files and data contracts changed.
4. Privacy, permission, and threat-boundary impact.
5. Automated, browser, manual, accessibility, and performance evidence.
6. Known limitations and deferred gates.
7. Rollback and recovery.
8. Branch and review status.
