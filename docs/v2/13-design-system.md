# Calm Optimistic Design System

Status: Foundation accepted in ADR-020; surface migration is incremental.

## Brand idea

Tabyss helps attention move through a healthy cycle: choose, focus, pause, and
return. The hourglass represents time without feeling like a stopwatch or warning.
Its softened waist and sunrise gradient add warmth while preserving the existing
toolbar identity.

## Color language

| Role | Light reference | Meaning |
|---|---|---|
| Canvas | `#F5F2F8` | Quiet warm-neutral page background |
| Surface | `#FCFBFE` | Popup and inset surface |
| Card | `#FFFFFF` | Raised, actionable grouping |
| Ink | `#251B2E` | Primary readable text |
| Violet | `#5B3FD6` | Primary action and focus |
| Rose | `#C73F88` | Brand expression, never error |
| Sunrise | `#E76F3D` | Brand expression and warmth |
| Mint | `#1E7A58` | Completed, restored, healthy |
| Amber | `#946112` | Paused, approaching a limit |
| Coral | `#B83A52` | Destructive action or true error |
| Sky | `#2F6FBA` | Neutral information and guidance |

Dark mode uses lighter foreground variants on deep plum surfaces. Semantic colors
remain consistent in meaning. Category/data visualization colors are a separate
palette and must always be paired with labels or patterns.

## Geometry and elevation

- Inputs and selects: 10px radius.
- Buttons: 12px radius, minimum 36px target in compact surfaces.
- Cards and panels: 16px radius.
- Hero/ritual containers: 24px radius.
- Chips and state labels: pill only when the content is genuinely compact.
- Use soft plum-tinted shadows, not black floating sheets.
- Spacing follows a practical 4/8px rhythm with 12, 16, 24, and 32px groups.

## Typography

- Use the platform system sans stack; use a local monospace stack for durations and
  compact numeric comparisons.
- Sentence case is the default. Uppercase is reserved for short kickers and never
  used for destructive warnings.
- Keep body copy at or above 13px in the popup and 14px on full pages.
- Prefer direct verbs: Begin session, Return to plan, Save for later, Review today.

## State vocabulary

| Runtime state | User-facing language |
|---|---|
| No active focus | Ready when you are |
| Running | In focus |
| Paused | Paused |
| Timer elapsed | Ready to review |
| Completed | Finished as planned |
| Abandoned | Ended unfinished |
| Sparse data | Still learning your rhythm |
| Error | Say what stayed safe and the next recovery action |

## Core components

- **Brand lockup:** local icon plus Tabyss wordmark and optional privacy reassurance.
- **Primary button:** solid accessible violet, one per decision group.
- **Secondary button:** neutral surface and border; never visually competes with the
  primary action.
- **Quiet action:** text/icon action for navigation or optional detail.
- **Focus card:** the first popup card; holds intention, duration, finish line, or
  live controls.
- **Today card:** compact total, intentional/productive context, focus ring, and up
  to two next cues.
- **Disclosure:** secondary analytics and controls use a clearly named native
  `details` element and remain fully keyboard accessible.
- **Status chip:** semantic text plus color; color alone never communicates state.
- **Error/recovery message:** explains the failed action, preserved state, and next
  step where possible.

## Popup information hierarchy

1. Brand and private/local state.
2. One primary focus/intention action or the active session.
3. Compact Today snapshot and next cue.
4. Expandable browsing details, persona, categories, goals, sites, and Office Mode.
5. Weekly story and destructive reset as quiet footer actions.

The popup is a launch and glance surface. Deep review and configuration belong on
the dashboard/Command Center and settings.

## Icon usage

- Canonical vector source: `assets/brand/tabyss-mark.svg`.
- Runtime bitmap sizes: `icon16.png`, `icon48.png`, and `icon128.png`.
- Never place text inside the mark or recolor semantic-state icons with the brand
  gradient.
- Use the 48px bitmap for extension-page lockups; let CSS size it to 24–28px.
- The 16px icon must preserve the white rails/waist and rounded gradient silhouette.

## Accessibility and motion

- Visible focus rings must not depend on box shadow alone.
- Support keyboard-only operation and native semantics before custom ARIA.
- Every icon-only button needs an accessible name and at least a 36px target.
- Respect reduced motion; no information may rely on animation.
- In forced-colors mode, preserve borders, controls, progress, and current state.
- At 200% zoom, the popup may scroll vertically but must not require horizontal
  scrolling or hide its primary action.
- Copy and controls must remain meaningful in empty, loading, paused, review, error,
  disabled, denied, and recovery states.
