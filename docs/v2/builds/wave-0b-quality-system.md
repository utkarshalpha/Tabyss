# Wave 0B Build Record - Quality and Packaging System

Date: 2026-08-02

Branch: `codex/v2-wave0-quality-system`

Status: Implemented and locally verified; not merged; hosted CI has not run because the branch is not pushed.

## Objective and user value

Turn the V2 foundation into a reviewable, repeatable build instead of relying on developer memory. Users benefit indirectly but materially: store artifacts cannot silently gain permissions/network code, omit runtime assets, include private test/docs files, or vary across repeated supported builds without failing a gate.

## Decision

- [ADR-018](../decisions/ADR-018-quality-and-packaging-baseline.md) - dependency-free quality and deterministic packaging baseline.
- [ADR-014](../decisions/ADR-014-v2-feature-waves.md) - this is a separate stacked review branch.
- [ADR-002](../decisions/ADR-002-local-first-core.md) - the zero-network runtime promise becomes an executable policy test.

## Implemented behavior

- One `package-files.json` controls all 16 store files.
- `package.ps1` uses deterministic order/timestamps, validates inputs, supports `-OutputPath`, and prints SHA-256.
- `.gitattributes` fixes text bytes to LF across supported clean checkouts.
- `verify.ps1` creates a uniquely named validated temp directory, runs all gates, builds twice, checks identical hashes and exact archive metadata, then safely removes only that temp directory.
- Manifest tests freeze accepted permissions and verify local/present/packaged references.
- Network-policy tests scan packaged text runtime for network-client and remote executable primitives.
- A read-only, concurrency-canceling, 10-minute Windows GitHub Actions workflow runs the same command with checkout pinned to a full official release SHA.

## Main files

- Build: `package.ps1`, `package-files.json`, `verify.ps1`, `.gitattributes`.
- CI: `.github/workflows/quality.yml`.
- Tests: `tests/manifest.test.js`, `tests/network-policy.test.js` plus the Wave 0 suites.
- Product record: `README.md`, `CHANGELOG.md`, ADR-018, and this build record.

## Evidence

- Complete verifier: passing.
- Node tests: 17/17 passing.
- Runtime/test JavaScript syntax: passing.
- Git whitespace and V2 relative links: passing.
- Two independent local packages: byte-identical.
- Verified artifact at implementation time: 16 files, approximately 70.3 KB, SHA-256 `9a91afc6b53b9313717887a0f942c6c212317cbee82d188161d1353c60a9e521`.

The recorded hash covers only the 16 runtime files, so documentation/test/build-script edits do not change it. The authoritative review hash is always the value printed by `verify.ps1` at the reviewed commit.

## Known limitations and remaining gates

- Hosted GitHub Actions is configured but cannot be claimed as run until the branch is pushed; no push is authorized in this task.
- The static zero-network test is a guardrail, not a formal proof. Code review and store/network inspection remain required.
- Full unpacked-extension, worker restart/suspension, Incognito, notification, real import/download, accessibility, and performance QA remain manual or future E2E gates.
- The current runtime remains vanilla JavaScript; ADR-011 is still Proposed.

## Rollback and recovery

- Revert this branch commit to restore the old packaging path; runtime behavior and user storage are unchanged.
- The script's default output remains `tabyss-v<manifest version>.zip`; `-OutputPath` prevents overwriting an existing local artifact during verification.
- Verification temporary cleanup is restricted to a resolved system-temp path whose leaf starts with `tabyss-verify-`.
