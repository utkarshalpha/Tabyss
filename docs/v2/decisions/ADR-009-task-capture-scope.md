# ADR-009 - Task Capture Scope

Date: 2026-08-02

## Context

Browser productivity competitors let users capture pages/tasks, but a full task manager would dilute Tabyss and create extensive synchronization/collaboration scope.

## Options

### A. No task capability

- Benefit: Focused product scope.
- Compromise: Intentions remain disconnected from actionable browser items.

### B. Lightweight local Action Capture plus integrations - recommended

- Benefit: Connects pages/tabs to plans while respecting specialist task tools.
- Compromise: Requires small inbox/search/done UX and adapter maintenance.

### C. Full task/project manager

- Benefit: All-in-one experience.
- Compromise: Major unrelated product, collaboration, recurring task, calendar, notification, and sync complexity.

## Recommendation

Use B. Support current page, explicitly selected text, estimate, due date, profile/Space, completion, and third-party handoff. Do not add general project boards, team assignment, or document collaboration.

## Status

Proposed.
