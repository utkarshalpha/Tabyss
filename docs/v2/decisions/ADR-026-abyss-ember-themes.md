# ADR-026 - Adopt Abyss & Ember with User-Selected Themes

Date: 2026-08-02

## Context

The owner supplied `Tabyss Extension Design System.zip` as the visual source of
truth and asked the final V2 build to follow it, expose theme choice in Settings,
and make the popup/tooltip edges more rounded. The supplied system is named
**Abyss & Ember** and defines exact light/dark surfaces, a violet-magenta-ember
identity gradient, display/body/micro-label type roles, calm voice, and compact
component geometry.

Two existing owner decisions remain binding: ADR-022 keeps the exact V1.5 runtime
logo, and ADR-025 keeps the simplified one-click session flow. The design artifact
contains a newer mark and older session interaction examples; those are reference
studies, not authorization to reverse the later product decisions.

## Options

### A. Apply only the new colors and keep OS-only appearance

- Benefit: Smallest change and no new setting.
- Compromise: Does not satisfy the requested theme control or fully establish the
  supplied component/type language.

### B. Adopt the design tokens, add System/Light/Dark, and preserve later owner decisions - selected

- Benefit: Closely follows the supplied system across every extension surface while
  keeping the trusted logo, simple session, local architecture, and user control.
- Compromise: The named web fonts need offline-safe local approximations, and visual
  QA is required across three appearance modes.

### C. Copy the prototype wholesale, including fonts, logo, and older flows

- Benefit: Highest literal similarity to the reference prototype.
- Compromise: Would replace the approved logo, regress session UX, and either add
  remote font requests or package new dependencies without an accepted decision.

## Decision

- Use the supplied light tokens: lavender plane `#F5F3FA`, surface `#FCFBFE`, white
  card, ink `#17121F`, violet `#7C3AED`, magenta `#DB2777`, ember `#F97316`, sand
  amber `#E2992F`, coral `#D6414E`, and green `#1F9D62`.
- Use the supplied dark tokens: deep plane `#0E0B15`, surface `#16121F`, card
  `#1B1626`, ink `#F4F1FA`, violet `#A78BFA`, magenta `#F472B6`, sand amber
  `#EFB65A`, coral `#F06A80`, and green `#4FCC8E`.
- Preserve the supplied `#8D8798` muted reference, but use contrast-adjusted
  `#716A7D` light and `#A59EAF` dark for small tertiary text. Production readability
  overrides literal use of a low-contrast reference swatch.
- Reserve the violet-magenta-ember gradient for identity, focus progress, persona,
  and Wrapped moments. Primary buttons remain solid violet.
- Add a local `theme` setting with allowlisted values `system`, `light`, and `dark`.
  Default to `system`; explicit choices override the OS across extension pages.
- Put three native radio choices at the top of Settings. Selection previews
  immediately; the existing Save action persists it. No permission, network path,
  telemetry, or account is added.
- Use local font stacks that approximate Bricolage Grotesque, Instrument Sans, and
  Spline Sans Mono. Do not load Google Fonts or another remote/local dependency.
  Display faces apply to headings and large numbers; mono applies only to compact
  labels and small data.
- Use 10px controls/buttons, 16px cards, and a 22px popup shell with a 4px plane
  reveal that keeps its clipped corners visible. The 22px shell is the owner's
  explicit rounded-edge override over the prototype's 16px shell.
  In-page heads-up cards use 18px corners and full wellbeing overlays use 24px.
- Keep the exact V1.5 `icon16.png`, `icon48.png`, and `icon128.png` under ADR-022.
- Keep Today's insight first and direct Complete/End under ADR-024/025; do not copy
  the prototype's older checkout or multi-step session examples.

## Consequences

- All extension surfaces share one exact light/dark color language and can be forced
  independently of the device theme.
- Theme is an additive, sanitized field in the existing settings object and backup;
  legacy settings migrate by receiving the `system` default. Storage metadata and
  backup format do not need a version increase because existing allowlisted settings
  already round-trip as one record and older runtimes ignore unknown keys.
- Category colors remain a separate labelled data palette. Theme-aware chart colors
  now respect the selected theme, not only the OS preference.
- The source ZIP is a design input, not a packaged runtime dependency. The package
  remains vanilla, local-only, and deterministic.

## Validation

- Unit-test theme allowlisting and invalid-value fallback.
- Contract-test native Settings controls, live application, exact token presence,
  explicit theme selectors, and rounded shell/overlay geometry.
- Render System, Light, and Dark Settings; verify native accessibility names, visible
  preview status, token changes, and the V1.5 logo.
- Render the popup at 380px and verify the 22px shell, supplied dark palette, solid
  primary action, Today-first hierarchy, and unchanged one-click session flow.
- Run the complete syntax, security, documentation, and deterministic package gate.

## Status

Accepted - the owner supplied the design system and explicitly authorized its
implementation, theme control, and rounder edge treatment for the final V2 build.
This supersedes ADR-020 only for color tokens, typography roles, component geometry,
and appearance behavior. ADR-022/024/025 remain authoritative for logo and flow.
