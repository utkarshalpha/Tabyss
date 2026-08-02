# ADR-006 - Browser Blocking Mechanism

Date: 2026-08-02

## Context

V2 needs reliable site limits and focus allowlists without observing network traffic or relying only on late content-script overlays.

## Options

### A. Content-script overlay blocking

- Benefit: Flexible UI on pages.
- Compromise: Page already loads; site DOM can interfere; broad host access.

### B. `webRequest` observation/interception

- Benefit: Request-level visibility.
- Compromise: Greater privacy surface; MV3 blocking restrictions; unnecessary data access.

### C. `declarativeNetRequest` main-frame block/redirect plus optional mindful overlay - recommended

- Benefit: Chrome enforces rules without giving extension request contents; reliable navigation block.
- Compromise: Rule limits/precedence and permission UX must be managed.

## Recommendation

Use C. DNR handles configured navigation rules; content script provides mindful intervention only on explicitly enabled scopes.

## Validation

- Rule limit and precedence spike.
- Recovery/allowlist property tests.
- Store-warning and denied-permission UX test.

## Status

Proposed.
