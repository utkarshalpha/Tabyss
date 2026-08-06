# ADR-017 - Runtime Trust Boundaries

Date: 2026-08-02

## Context

Tabyss content scripts run beside arbitrary web pages. Previously, local storage used Chrome's default access level and the worker switched on runtime message type without validating the sender context. Mutation actions also existed outside the worker.

## Options

### A. Trust all same-extension messages and default storage access

- Benefit: Least code.
- Compromise: Excessive blast radius if a content script or extension page is compromised.

### B. Trusted-context storage plus action/source allowlists - selected

- Benefit: Content scripts cannot read history and can invoke only narrow media/wellness actions; data mutations remain in the worker.
- Compromise: Every new message requires an explicit contract and test.

### C. Remove content scripts

- Benefit: Smallest page-adjacent attack surface.
- Compromise: Removes media classification and in-page break experiences.

## Decision

- Set `chrome.storage.local` access to `TRUSTED_CONTEXTS` on worker load and setup.
- Accept messages only from the current extension ID.
- Allow settings, flush, reset, import, and clear only from extension pages.
- Allow media and wellness actions only from non-Incognito HTTP(S) content-script senders.
- Return coarse user-facing errors while keeping detailed failure text in the worker console.

## Consequences

- Content scripts communicate through an allowlisted worker interface and never read raw history.
- Extension pages opened in normal tabs remain valid trusted senders; sender classification uses the extension URL rather than absence of `sender.tab`.
- New actions must identify their permitted source and validate their payload.

## Validation

- Tests cover trusted storage initialization, extension-tab classification, foreign-extension rejection, regular/incognito content classification, and listener registration.

## Status

Accepted - implemented in V2 Wave 0.
