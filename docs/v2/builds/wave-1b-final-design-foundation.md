# Wave 1B - Calm Optimistic Design Foundation

Date: 2026-08-02

Branch: `codex/v2-final-design-foundation`

State: Implemented and locally verified; unpacked-extension visual and assistive-
technology release gates remain.

## Objective and user value

Establish the final V2 visual/interaction foundation without replacing the trusted
tracking and focus engine. The primary result is an action-first popup that helps a
user begin or manage one intentional session before presenting passive analytics.
The work also evolves the existing hourglass into a production brand asset and turns
the broader feature brainstorm into a ranked V2 opportunity backlog.

Exit gate for this branch:

- Calm Optimistic tokens and icon assets are documented and implemented.
- The popup prioritizes the intention/session action and progressively discloses
  detailed analytics without removing existing controls or data.
- Brand lockups are consistent across popup, dashboard, and settings.
- Existing permissions, runtime package, storage, privacy, and focus behavior do not
  change.
- Source/security tests and deterministic packaging pass.

## Decisions and product evidence

- [ADR-020](../decisions/ADR-020-calm-optimistic-design-system.md) is the binding
  design decision approved by the owner.
- [ADR-002](../decisions/ADR-002-local-first-core.md),
  [ADR-017](../decisions/ADR-017-runtime-trust-boundaries.md),
  [ADR-018](../decisions/ADR-018-quality-and-packaging-baseline.md), and
  [ADR-019](../decisions/ADR-019-intent-session-state.md) remain unchanged.
- Competitive research was synthesized into the
  [V2 opportunity backlog](../12-product-opportunity-backlog.md). Backlog presence is
  not implementation or release acceptance.

## Changed behavior and files

### Runtime presentation

- `popup.html`: new action-first information hierarchy, brand/privacy lockup, compact
  Today card, native details disclosure, and friendlier focus language.
- `popup.js`: user-facing state vocabulary maps persisted runtime states to “In
  focus,” “Paused,” and “Ready to review”; the Next cue area displays at most two
  items. Data contracts and state transitions are unchanged.
- `styles.css`: Calm Optimistic light/dark tokens, semantic feedback colors,
  standardized radii, accessible focus treatments, reduced-motion continuity,
  higher-contrast and forced-colors foundations, and migrated shared surfaces.
- `dashboard.html` and `options.html`: use the production icon brand lockup.
- `icon16.png`, `icon48.png`, `icon128.png`: regenerated production icon sizes.
- `assets/brand/tabyss-mark.svg`: canonical editable vector source; it is not a new
  runtime dependency or package entry.

### Product and decision record

- `docs/v2/12-product-opportunity-backlog.md`: ranked P0/P1/P2 opportunities and
  explicit anti-patterns.
- `docs/v2/13-design-system.md`: color, geometry, typography, component, state,
  icon, and accessibility specification.
- `docs/v2/decisions/ADR-020-calm-optimistic-design-system.md`: options, selected
  direction, consequences, and validation.
- Registers, master checklist, and `PROMPTS.md`: branch/build/decision trace.

## Data, privacy, permissions, and threats

- No schema, migration, storage key, message payload, permission, content-script
  scope, network path, account, analytics, dependency, or remote code changed.
- The canonical SVG is source-only; runtime continues to package the three local PNG
  sizes already allowed by the package contract.
- Progressive disclosure changes visibility, not collection. Existing top sites,
  categories, persona, media, goals, and Office Mode remain local and available.
- The settings icon retains an accessible name; the decorative brand icon has an
  empty alternative; state chips include text and never rely on color alone.

## Verification evidence

### Automated

- `node --check popup.js`: pass.
- UI reference/ID contract: 4/4 pages pass with no duplicate or missing target IDs.
- `verify.ps1`: pass, 33/33 Node tests.
- Manifest, permission, local-executable, runtime package, no-network-client, import,
  focus state-machine, and trusted-storage checks: pass inside the verifier.
- V2 relative-document links and git whitespace: pass.
- Deterministic runtime package: 16 allowlisted files, both builds exactly
  `192835324bdd2f7a518caca2b85b2fcfeca4a104150d15b19ccb845efeeecd98`.

### Browser/UI adapter

- Dark-mode local preview exercised at a 380px popup body and 1.25 device-pixel
  ratio with seeded local-only data.
- Empty creation, running, checkout, details-collapsed, and details-expanded states
  rendered without horizontal overflow (`scrollWidth === clientWidth === 380`).
- Starting a session produced the friendly `In focus` label and all three controls.
- Opening checkout hid the live controls, showed the form, and moved keyboard focus
  to `focusNote`.
- Native details toggling worked and exposed persona, Office Mode, media, category,
  goal, and top-site sections.
- The optional success definition was confirmed hidden with zero bounds when empty.
- The regenerated 16px and 128px icons were visually inspected for a recognizable
  white hourglass, clean rails/waist, rounded silhouette, and gradient continuity.

### Accessibility and performance assessment

- Native headings, regions, form labels, button names, progress semantics, and
  details/summary structure were present in the browser accessibility snapshot.
- Computed WCAG contrast checks passed for the main light/dark text pairs and white
  primary-button text: light ink 15.98:1, light secondary 6.56:1, light muted at
  least 4.76:1, dark ink 16.55:1, dark secondary 10.82:1, dark muted 6.40:1,
  light primary 6.72:1, and dark primary 6.09:1.
- Reduced-motion behavior is preserved; explicit high-contrast and forced-colors
  rules were added.
- No dependency, remote asset, new runtime request, new worker loop, or storage write
  was added. A formal CPU/memory/render performance trace was not run for this
  presentation-only slice.

## Known limitations and deferred gates

- Chrome unpacked-extension review is still required for real popup lifecycle,
  light/dark/high-contrast screenshots, keyboard-only traversal, screen reader,
  reduced motion, forced colors, and 200% zoom on the target release browsers.
- The opportunity backlog, side-panel Command Center, onboarding, Focus Home, Focus
  Workspace, Return Capsule, drift recovery, blocking, sync, and accountability are
  not implemented by this branch. Each needs its own accepted decision and vertical
  slice.
- The existing Wrapped surface remains intentionally immersive and has not yet been
  rebuilt onto the shared stylesheet; its release accessibility matrix remains open.
- Hosted CI did not run because no push was authorized.

## Rollback and recovery

- Revert this branch commit to restore the prior presentation and icon files. No
  user-data rollback or migration is needed because no data contract changed.
- The prior Wave 1 focus state and outcomes remain readable before, during, and after
  rollback.
- Do not clear extension storage to roll back a visual change.

## Review status

Ready for code/design review after commit. It is not a store-release approval until
the manual unpacked-extension gates above are completed.
