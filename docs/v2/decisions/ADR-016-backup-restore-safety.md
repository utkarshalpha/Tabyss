# ADR-016 - Backup and Restore Safety

Date: 2026-08-02

## Context

The previous options flow parsed arbitrary JSON and wrote recognized top-level values directly to local storage. It had no product marker, format compatibility check, data bounds, unsafe-key defense, preview, or rollback aid. Import/clear also bypassed the worker's storage mutex.

## Options

### A. Preserve permissive JSON import

- Benefit: Maximum tolerance of hand-edited files.
- Compromise: Corruption, quota, prototype-pollution, future-version, and race risks.

### B. Versioned strict restore with preview and safety backup - selected

- Benefit: Predictable migrations, explainable errors, bounded data, and a user-owned recovery artifact.
- Compromise: Invalid hand-edited files are rejected instead of partly imported.

### C. Replace JSON with a new binary archive

- Benefit: Stronger packaging and future compression options.
- Compromise: Breaks transparency and legacy compatibility; unnecessary for current local data size.

## Decision

- Keep human-readable JSON and add `exportedFrom`, `formatVersion`, and `exportedAt`.
- Restore only eight allowlisted sections: usage, hours, switches, holes, notified, media, wellness, and settings.
- Validate file size in the UI, then validate marker, version, structure, depth, entry counts, dates, hours, domains, categories, number bounds, setting keys, and dangerous object keys.
- Preview affected sections and warnings. After confirmation, download the current state as a safety backup.
- Validate again in the worker and serialize restore/clear with all tracking storage writes.
- Continue accepting legacy Tabyss exports without `formatVersion`, with an explicit warning.

## Consequences

- A future format fails closed until the installed extension supports it.
- Partial legacy backups replace only the sections present; omitted sections remain unchanged.
- Runtime-only session, run, sunset, and wellness-cycle state is reset after restore.
- The 5 MB UI limit is part of this JSON generation and may change through a superseding ADR if storage architecture changes.

## Validation

- Tests cover a full legacy round trip, current metadata, normalization, wrong-product and future-version rejection, invalid dates/hours/numbers, and nested unsafe keys.
- Chrome UI smoke testing covers the settings copy and save feedback; import file-chooser/download behavior remains in the manual extension release pass.

## Status

Accepted - implemented in V2 Wave 0.
