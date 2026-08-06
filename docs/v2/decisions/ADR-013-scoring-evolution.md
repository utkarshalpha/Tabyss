# ADR-013 - Intent-aware Score Evolution

Date: 2026-08-02

## Context

The current focus score emphasizes productive-category share, switch discipline, participation, and rabbit-hole penalties. Permanent domain categories can misrepresent tasks such as education on YouTube, client work on social platforms, or deliberate rest.

## Options

### A. Preserve the current formula unchanged

- Benefit: Stable and familiar.
- Compromise: Cannot express user intent and may moralize necessary activity.

### B. Replace it immediately with a fully new intent score

- Benefit: Clean conceptual model.
- Compromise: Sparse plans, broken historical comparison, and an abrupt trust change.

### C. Versioned transition from category-based focus to intent alignment - recommended

- Benefit: Preserves current usefulness for unplanned periods while improving fairness when plans exist.
- Compromise: Needs version labels, component explanations, and careful comparison.

## Recommendation

Use C. V2 score components should include:

- Intentional alignment when a plan exists.
- Switch discipline relative to session type.
- Successful recovery.
- Sustainable break/shutdown behavior where chosen.
- Neutral treatment for unplanned but user-corrected activity.
- Adequate-data thresholds.

Historical V1 scores remain identifiable as the V1 algorithm and are not silently recalculated as if intent data existed.

## Validation

- Test score explanations with users across work, study, creator, and rest scenarios.
- Backtest against anonymized/synthetic weeks for unintuitive incentives.

## Status

Proposed.
