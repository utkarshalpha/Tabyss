# ADR-012 - Capability-based Permission Model

Date: 2026-08-02

## Context

Current content script access covers every HTTP/HTTPS page to support media detection and overlays. V2 adds blocking, capture, side panel, tab groups, and supported-site controls. Requesting every permission at install would weaken trust and create permission shock.

## Options

### A. Request all V2 permissions at installation

- Benefit: Simplest implementation and no later prompts.
- Compromise: Poor comprehension, larger attack surface, and warnings for features a user may never enable.

### B. Required tracking permissions plus capability-based optional permissions - recommended

- Benefit: Least privilege, contextual explanation, module-level control.
- Compromise: More denied/revoked states and dynamic registration logic.

### C. Minimal `activeTab` interaction only

- Benefit: Lowest warning surface.
- Compromise: Cannot deliver automatic active-domain tracking or background plans reliably.

## Recommendation

Use B. Keep only permissions strictly required by the accepted core. Request host access, blocking, tab-group, capture, and side-panel capabilities at the moment the related feature is enabled where Chrome permits.

## Consequences

- Every module needs unavailable, denied, and revoked behavior.
- Permission state is visible in the Capability Center.
- Store copy must distinguish automatic core tracking from optional page controls.

## Validation

- Chrome API spike for optional host permissions and dynamic content-script registration.
- Comprehension test for install-time versus contextual prompts.

## Status

Proposed.
