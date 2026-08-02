# ADR-022 - Restore the Original V1.5 Brand Mark

Date: 2026-08-02

## Context

The V2 design-foundation build regenerated the three runtime icon sizes while
preserving the hourglass concept. After reviewing the finished Command Center, the
owner explicitly selected the original V1.5 mark as the permanent Tabyss logo. Brand
recognition and continuity matter more than a subtle redraw that does not create
additional user value.

This decision changes only the brand asset clause in ADR-020. The Calm Optimistic
color, type, geometry, accessibility, and interaction system remains accepted.

## Options

### A. Keep the regenerated V2 mark

- Benefit: Matches the vector source created during the design-foundation build.
- Compromise: Overrides the owner's established logo and weakens continuity with
  the trusted V1.5 product.

### B. Restore the exact V1.5 runtime bitmaps - selected

- Benefit: Preserves the recognizable mark with no approximation or new asset risk.
- Compromise: The historical product did not include a canonical editable vector;
  the three committed PNG sizes are the source of truth.

### C. Redraw a third variant inspired by V1.5

- Benefit: Could produce a new vector source.
- Compromise: Repeats the unwanted redesign and cannot guarantee pixel identity.

## Decision

- Restore `icon16.png`, `icon48.png`, and `icon128.png` byte-for-byte from V1.5
  commit `50301b3`.
- Treat those historical PNGs as the canonical runtime brand assets.
- Keep the Tabyss toolbar/action icon stable; website favicons identify saved pages
  only and never replace the product mark.
- Do not regenerate, stylize, or replace the mark without a new owner-approved ADR.
- Retain the rest of ADR-020's Calm Optimistic design system.

## Consequences

- Popup, side panel, dashboard, settings, manifest, and store package all return to
  the exact V1.5 logo automatically because they reference the shared PNG files.
- `assets/brand/tabyss-mark.svg` is a superseded V2 design-study source, not the
  canonical logo and not a packaged runtime asset.
- No permission, data, behavior, dependency, network, or migration changes.

## Validation

- Require Git blob identities to match V1.5 for all three icon sizes.
- Render the extension lockup and inspect the 16px toolbar asset in unpacked Chrome.
- Run the complete deterministic packaging gate and record the resulting hash.

## Status

Accepted - the owner explicitly directed restoration of the original V1.5 logo.
This supersedes only ADR-020's regenerated-icon decision.
