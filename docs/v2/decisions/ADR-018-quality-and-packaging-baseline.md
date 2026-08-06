# ADR-018 - Quality and Packaging Baseline

Date: 2026-08-02

## Context

Tabyss had a manual `package.ps1` whitelist and release checklist but no CI workflow, shared verification command, manifest policy tests, or reproducible archive rule. `Compress-Archive` can retain source timestamps, so identical source is not sufficient evidence of an identical store artifact.

## Options

### A. Keep manual packaging and QA only

- Benefit: No additional engineering surface.
- Compromise: Permission drift, missing runtime files, accidental test/doc packaging, and non-reproducible artifacts can reach review.

### B. Dependency-free policy tests, deterministic PowerShell packaging, and Windows CI - selected

- Benefit: Matches the current stack, adds no runtime/build dependency, and makes local and CI evidence use one command.
- Compromise: Full extension E2E remains manual until an Accepted engineering-toolchain decision supplies a supported browser runner.

### C. Adopt a Node package manager, bundler, test browser, and release framework now

- Benefit: Stronger ecosystem and easier future TypeScript migration.
- Compromise: Prematurely accepts ADR-011 and expands supply-chain/migration risk before the architecture decision is approved.

## Decision

- `package-files.json` is the single runtime archive contract.
- `package.ps1` writes entries in contract order, fixes every ZIP timestamp to 2000-01-01, accepts a safe output override, and prints SHA-256.
- `.gitattributes` fixes text files to LF so clean Windows checkouts do not change packaged bytes.
- `verify.ps1` runs syntax, Node tests, whitespace, V2 link, exact ZIP content/order/timestamp, and two-build hash checks in a validated temporary directory.
- Manifest and network policy tests fail on unaccepted permission changes, remote runtime assets, network-client primitives, missing assets, or non-runtime package entries.
- GitHub Actions runs the same verifier on Windows. The official checkout action is pinned to the full v4.4.0 commit SHA with read-only contents permission and persisted credentials disabled.

## Consequences

- Any permission, remote connection, runtime file, or packaging change must deliberately update the contract/test and its ADR.
- CI proves source-level and artifact-level invariants but not Chrome worker lifecycle, extension-origin integration, or visual/accessibility behavior.
- The supported release artifact is produced on the Windows gate; broader cross-runner validation can be added without changing runtime architecture.
- A later Accepted ADR-011 may replace the tooling, but must preserve these gates or supersede them explicitly.

## Validation

- Local verification passes 17 tests and produces byte-identical independent ZIPs.
- The archive contains exactly 16 allowlisted runtime files and no docs, tests, workflows, or build scripts.
- The package and verifier use no third-party local dependency.

## Status

Accepted - implemented as the second V2 foundation branch under the owner's instruction to continue builds with recorded decisions.
