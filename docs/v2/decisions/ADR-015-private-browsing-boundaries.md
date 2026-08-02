# ADR-015 - Private Browsing Boundaries

Date: 2026-08-02

## Context

The current worker could count Incognito foreground time when the user enabled Tabyss in Incognito, ignore rules matched only an exact hostname, and recap/sunset notifications could reveal domains on an OS lock screen.

## Options

### A. Keep existing behavior and rely on user awareness

- Benefit: No migration or UI work.
- Compromise: Hidden privacy surprises and fragile ignore behavior.

### B. Exclude Incognito, make ignore rules boundary-safe, and redact notifications by default - selected

- Benefit: The safest default matches the product promise; users can still opt into useful notification detail.
- Compromise: No Incognito productivity insight, and ignoring a base domain intentionally excludes all subdomains.

### C. Track Incognito in a separate opt-in dataset

- Benefit: More complete personal analytics.
- Compromise: Higher consent, storage, UI, and accidental-disclosure risk with limited core value.

## Decision

- Never record Incognito foreground time, media beats, or content-script wellness events.
- An ignore rule matches the exact hostname and any label-boundary subdomain, never a lookalike suffix.
- Site names are absent from OS notification text by default. The user may explicitly enable them in Settings.

## Consequences

- Incognito exclusion is unconditional even when Chrome allows the extension to run there.
- Ignore input is normalized from a URL or hostname into a canonical hostname.
- The privacy policy and QA checklist must state these behaviors.

## Validation

- Unit tests cover Incognito state, content sender rejection, exact/subdomain/lookalike matching, and redacted/opt-in notification copy.
- An unpacked Chrome Incognito pass remains a manual release gate because automated browser control cannot open `chrome://extensions`.

## Status

Accepted - implemented in V2 Wave 0 under the owner's security and build authorization.
