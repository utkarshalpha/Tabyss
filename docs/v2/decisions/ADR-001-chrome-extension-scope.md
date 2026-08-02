# ADR-001 - Chrome-extension-only Core Scope

Date: 2026-08-02

## Context

Early brainstorming included mobile, native desktop, and broad connected-product ideas. The owner clarified that the current V2 definition concerns the existing Chrome extension.

## Options

### A. Chrome extension plus native/mobile applications

- Benefit: OS-wide and cross-device control.
- Compromise: Different products, permissions, stores, teams, security models, and a much larger program.

### B. Chrome extension core with optional connection points - selected

- Benefit: Keeps scope grounded in the current product while allowing selected integrations.
- Compromise: Cannot promise blocking of arbitrary desktop/mobile apps.

### C. Chrome extension with mandatory cloud web application

- Benefit: Easier account/reporting experiences.
- Compromise: Breaks the local-only product boundary and creates an unnecessary core dependency.

## Decision

V2 core functionality is delivered by the Chrome extension. Connected features may be discussed and separately approved, but no mobile app, native desktop companion, VPN, or mandatory web application is required for the core product.

## Consequences

- Store copy must describe browser scope honestly.
- System design prioritizes Chrome APIs and MV3 lifecycle.
- Integrations fail gracefully to a complete local experience.
- OS-wide blocking and mobile activity remain non-capabilities.

## Status

Accepted - explicitly directed by the owner on 2026-08-02.
