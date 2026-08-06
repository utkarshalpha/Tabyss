# Wave 0 Build Record - Trust Foundation

Date: 2026-08-02

Branch: `codex/v2-wave0-hardening`

Status: Implemented and self-reviewed; not merged; manual unpacked-extension release gates remain.

## Objective and user value

Make the current local-first extension safe enough to become the base of V2: private browsing stays private, ignore rules behave as users expect, lock-screen text is discreet, storage is isolated from page-adjacent code, and backups can be restored without accepting arbitrary storage structures or racing live tracking.

## Decisions

- [ADR-014](../decisions/ADR-014-v2-feature-waves.md) - separate reviewable V2 branches/waves.
- [ADR-015](../decisions/ADR-015-private-browsing-boundaries.md) - Incognito/ignore/notification defaults.
- [ADR-016](../decisions/ADR-016-backup-restore-safety.md) - versioned strict JSON restore.
- [ADR-017](../decisions/ADR-017-runtime-trust-boundaries.md) - trusted storage and sender allowlists.
- [ADR-002](../decisions/ADR-002-local-first-core.md) - no backend or account introduced.

## Implemented behavior

- Incognito foreground and media events are excluded.
- Ignore input accepts URLs/hosts, stores canonical hosts, deduplicates, and excludes subdomains on a domain-label boundary.
- Recap and Digital sunset notifications omit site names unless the new Settings checkbox is enabled.
- All settings reads pass through a bounded allowlist sanitizer.
- Exports use backup format 2 with product/version/time metadata.
- Imports validate twice, preview affected sections/warnings, and download a pre-import safety backup.
- Import and clear moved into the service-worker storage mutex and reset live runtime state.
- Content scripts cannot access raw local storage and have a narrow message allowlist.
- Dashboard and Settings exports share one payload builder.

## Main files

- Runtime: `common.js`, `background.js`, `options.html`, `options.js`, `dashboard.js`.
- Tests: `tests/common.test.js`, `tests/background.test.js`, `tests/chrome-mock.js`, `tests/ui-server.js`.
- Product/release record: `PRIVACY.md`, `QA_CHECKLIST.md`, `CHANGELOG.md`, this build record, ADR-014 through ADR-017.

## Evidence

- `node --check` passes for every changed JavaScript file.
- `node --test tests/common.test.js tests/background.test.js`: 12/12 passing.
- `git diff --check`: passing.
- Chrome local UI smoke: exact options HTML/CSS/JS rendered with the test adapter; new privacy control was off by default; ignore input and Save flow produced visible Saved confirmation; no console warnings/errors.
- Visual check: dark theme hierarchy, labels, rows, and privacy copy rendered without overlap or clipping in the connected Chrome viewport.

## Known limitations and remaining gates

- Browser safety automation cannot open `chrome://extensions`; loading the unpacked build, real service-worker console inspection, Incognito enablement, notification delivery, actual download/file chooser, and extension-origin sender metadata remain manual QA checklist items.
- This wave does not establish TypeScript message types, CI, IndexedDB, DNR blocking, or the V2 design system; their ADRs remain Proposed.
- The UI mock validates the real page code and layout but is not a substitute for the extension-origin integration pass.

## Rollback and recovery

- Revert the Wave 0 branch commit before merge if a regression is found.
- Backup format 2 remains JSON and legacy format-1/no-version backups remain readable.
- A failed restore performs no write; a confirmed restore first downloads the current data.
- Rolling back runtime code does not delete user storage. Older builds ignore the added `notificationDetails` setting and backup metadata.
