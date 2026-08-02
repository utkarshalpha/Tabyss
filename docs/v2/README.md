# Tabyss V2 Product Definition

Status: Active product program. Individual proposals remain gated by their ADR status.

This folder defines V2 as a complete Chrome-extension product generation. It does not assume a future major version for essential Chrome-extension functionality. Connected services are considered only as optional extension capabilities and do not weaken local-only operation.

## Reading order

1. [Product charter](00-product-charter.md)
2. [Product positioning](01-product-positioning.md)
3. [Users, jobs, and benefits](02-users-jtbd-benefits.md)
4. [Competitive capability map](03-competitive-capability-map.md)
5. [Feature catalog](04-feature-catalog.md)
6. [Experience and UX](05-experience-and-ux.md)
7. [Analytics and North Star](06-analytics-and-north-star.md)
8. [Chrome-extension system design](07-system-design.md)
9. [Security, privacy, and permissions](08-security-privacy.md)
10. [Delivery and SDLC](09-delivery-sdlc.md)
11. [Research and open questions](10-research-and-open-questions.md)
12. [V2 master checklist](11-v2-master-checklist.md)
13. [Decision register](decisions/README.md)
14. [Build register](builds/README.md)

## Document rules

- Repository facts describe the current 1.5.0 implementation.
- V2 statements are proposals until their linked ADR is Accepted.
- Every major capability must connect to the core loop: plan, focus, recover, reflect.
- Every feature must define denied, disabled, empty, error, and recovery behavior.
- Connected capabilities must disclose exactly what leaves the device.
- A feature is not production-ready until product, UX, data, privacy, security, operations, and lifecycle requirements agree.

## V2 definition of done

V2 is complete when the extension can help a user:

1. Understand current browser behavior accurately.
2. Express what they intended to do.
3. Protect that intention with proportionate controls.
4. Recover from distraction without shame.
5. Organize the tabs required for the intended task.
6. Review whether the chosen behavior improved.
7. Keep all core functionality local and controllable.
8. Optionally connect integrations without turning local mode into a degraded trial.

## Scope language

- Core: works entirely inside the installed Chrome extension.
- Optional connected: the extension calls a user-selected third-party or Tabyss service for a named feature.
- Out of scope: functionality requiring a mobile application, native desktop process, VPN, OS-wide blocker, or general-purpose web application.
