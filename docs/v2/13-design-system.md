# Abyss & Ember Design System

Status: Accepted in ADR-026. ADR-022 keeps the original V1.5 runtime mark;
ADR-024/025 keep the Today-first, minimal, one-click session flow.

## Brand idea

Tabyss makes browser behavior visible without turning attention into a game. The
visual language moves from violet abyss through magenta to ember orange, while the
established white hourglass remains the recognizable toolbar mark. The experience
should feel calm, precise, private, and on the user's side.

Principles:

- Calm, not gamified.
- Honest numbers over hype.
- Privacy is visible, not hidden in policy copy.
- Gradient is reserved for identity moments, focus progress, persona art, and
  Wrapped. Never use it as a routine button, card, or text fill.

## Color language

| Role | Light | Dark | Meaning |
|---|---:|---:|---|
| Plane | `#F5F3FA` | `#0E0B15` | Page ground: lavender-white to deep abyss |
| Surface | `#FCFBFE` | `#16121F` | Popup and panel ground |
| Card | `#FFFFFF` | `#1B1626` | Raised blocks and toasts |
| Ink | `#17121F` | `#F4F1FA` | Primary text: violet-black, never pure black |
| Secondary ink | `#4C4458` | `#C2BBD1` | Body and supporting copy |
| Muted reference | `#8D8798` | `#8D8798` | Artifact reference; preserved as a non-text token |
| Muted text | `#716A7D` | `#A59EAF` | Contrast-adjusted tertiary labels |
| Border | `rgba(23,18,31,.13)` | `rgba(244,241,250,.11)` | Quiet component boundaries |
| Track | `#ECE8F4` | `#262031` | Progress and inactive controls |
| Brand | `#7C3AED` | `#A78BFA` | Primary action, focus, links |
| Brand strong | `#6D28D9` | `#C4B5FD` | High-emphasis brand state |
| Magenta | `#DB2777` | `#F472B6` | Identity-gradient partner |
| Sand amber | `#E2992F` | `#EFB65A` | Warnings and approaching limits |
| Coral | `#D6414E` | `#F06A80` | Destructive action or true error only |
| Good | `#1F9D62` | `#4FCC8E` | Completed, restored, healthy |

Identity gradient: `linear-gradient(120deg, #7C3AED, #DB2777, #F97316)`.
Category/data-visualization colors remain a separate eight-hue palette and must
always be paired with labels or another non-color cue.

## Appearance behavior

- Settings offers native **System**, **Light**, and **Dark** radio choices.
- System is the default and follows `prefers-color-scheme` live.
- Light/Dark override the OS on every extension page by applying a root theme.
- A selection previews immediately and persists with the normal Settings Save
  action. Invalid/imported values fail safely to System.
- The setting stays in local extension storage and the validated backup record.

## Geometry and elevation

- Inputs and selects: 10px radius.
- Buttons: 10px radius, minimum 36px compact target.
- Cards and panels: 16px radius.
- Popup outer shell: 22px radius with clipped surface, a 4px abyss reveal around
  the corners, and soft shadow so the rounding remains visible.
- Tooltip/heads-up card: 18px radius; full wellbeing overlay: 24px radius.
- Hero/ritual containers and dialogs: 24px radius.
- Chips are pills only when the content is truly compact.
- Use plum-tinted shadows: light float `0 18px 44px rgba(23,18,31,.16)`;
  dark float `0 18px 44px rgba(0,0,0,.55)`.
- Spacing follows a practical 4/8px rhythm with 12, 16, 24, and 32px groups.

## Typography

The supplied design names Bricolage Grotesque, Instrument Sans, and Spline Sans
Mono. Tabyss cannot fetch remote fonts under its zero-network/CSP contract, so the
runtime uses local platform approximations:

- Display/headings/large numerals: `ui-rounded`, Arial Rounded MT Bold, Segoe UI,
  then system sans.
- Body: Segoe UI Variable Text, Segoe UI, then system sans.
- Micro labels/small data: Cascadia Code, SFMono, Consolas, then system mono.

Large durations and scores use the display stack. Mono is reserved for compact
data and short uppercase kickers. Body copy is 12.5–14px in compact surfaces and
14px on full pages. Use direct verbs: Start, Complete, End, Save, Open.

## State vocabulary

| Runtime state | User-facing language |
|---|---|
| No active session | Start a session |
| Running | Running |
| Paused | Paused |
| Timer elapsed | Ready to review |
| Completed | Completed |
| Abandoned | Ended |
| Sparse data | Still learning your rhythm |
| Error | Say what stayed safe and the next recovery action |

## Core components

- **Brand lockup:** exact V1.5 local bitmap plus Tabyss and optional privacy copy.
- **Primary button:** one solid violet action per decision group; never gradient.
- **Secondary button:** neutral surface and border.
- **Theme picker:** three native radios in labelled cards with a live preview status.
- **Session card:** neutral secondary card with one task, one duration, Start, compact
  live controls, visited-site chips, and direct Complete/End.
- **Today card:** total, intentional/productive context, focus ring, and two cues.
- **Disclosure:** native `details` for secondary analytics and controls.
- **Status chip:** semantic label plus color; color alone never communicates state.
- **Error/recovery message:** explains preserved state and the next action.

## Popup hierarchy

1. Brand and local/privacy reassurance.
2. Today snapshot and next cue.
3. Optional minimal session action or active session.
4. Expandable browsing details, categories, goals, sites, and Office Mode.
5. Weekly story and destructive reset as quiet footer actions.

Saved pages belongs in the side panel; deep review and configuration belong on the
dashboard and Settings. The design-system prototype's older checkout flow is not a
runtime requirement because ADR-024/025 supersede it.

## Icon usage

- Canonical sources are the original V1.5 `icon16.png`, `icon48.png`, and
  `icon128.png`, restored byte-for-byte under ADR-022.
- The mark shown in the supplied Abyss & Ember artifact and
  `assets/brand/tabyss-mark.svg` are superseded design studies.
- Website favicons identify sites and Saved pages; they never replace the product
  mark.
- Do not place text inside the mark or recolor semantic icons with the gradient.

## Accessibility and motion

- Use native semantics and visible focus rings before custom ARIA.
- Every icon-only button needs an accessible name and at least a 36px target.
- Respect reduced motion; information never relies on animation.
- Forced-colors/high-contrast modes preserve borders, controls, progress, and state.
- At 200% zoom the popup scrolls vertically without horizontal overflow or hidden
  primary actions.
- Copy and controls remain truthful in empty, loading, paused, review, error,
  disabled, denied, and recovery states.

## Colour personalization (ADR-027)

Six user-selectable palettes (Cobalt Focus default, Teal Clarity, Abyss Violet,
Plum Premium, Forest Calm, Ember Energy), each defining 13 colours per scheme,
combined independently with System / Light / Dark. `TABYSS_PALETTES` in
common.js is the source of truth; styles.css variable blocks are generated from
it and an automated test keeps them in sync. Semantic success/warning/danger
colours are shared per scheme and palette-invariant. Components consume only
the semantic variables (--plane, --surface, --card, --ink, --ink2, --muted,
--border, --track, --brand*, --on-brand, --brand-soft, --success*, --warning*,
--danger*); no component hardcodes palette colours.
