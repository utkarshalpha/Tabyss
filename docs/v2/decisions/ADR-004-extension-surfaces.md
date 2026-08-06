# ADR-004 - Extension Surfaces

Date: 2026-08-02

## Context

The current popup carries many analytics and controls. V2 adds active-session control, plans, Spaces, and interventions that need more persistent space.

## Options

### A. Keep popup plus dashboard only

- Benefit: No additional permission/surface.
- Compromise: Popup becomes overloaded and disappears on blur.

### B. Replace new tab as the primary surface

- Benefit: High-frequency visibility and more room.
- Compromise: Intrusive and competes with existing new-tab preferences.

### C. Action popup plus side-panel Command Center, dashboard, and optional new tab - recommended

- Benefit: Correct surface for glance, active control, deep analysis, and optional start ritual.
- Compromise: More UI states and a side-panel permission/version requirement.

## Recommendation

Use C. Keep popup concise, make side panel the working surface, dashboard the analytical/configuration surface, and new-tab replacement opt-in.

## Validation

- Prototype start-focus, drift recovery, and Space control in popup versus side panel.
- Test narrow side-panel widths and keyboard flows.

## Status

Proposed.
