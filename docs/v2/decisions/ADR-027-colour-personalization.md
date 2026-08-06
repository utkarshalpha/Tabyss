# ADR-027 — Colour personalization: six palettes × three appearance modes

Status: Accepted (owner-directed, 2026-08-02); supersedes the single-palette
clause of ADR-026. The System/Light/Dark appearance model of ADR-026 is retained
and extended.

## Context

ADR-026 shipped one fixed palette (Abyss & Ember) with a System/Light/Dark
picker. The owner directed a complete colour-personalization system: users
independently choose one of six colour palettes and one of three appearance
modes, with immediate preview, local persistence, and no change to the logo,
product functionality, permissions, privacy boundaries, or network behavior.

## Decision

1. **Configuration.** `TABYSS_PALETTES` in `common.js` is the single source of
   truth: cobalt (default), teal, abyss, plum, forest, ember — each with full
   light and dark colour sets (13 colours per scheme, owner-supplied values).
   The CSS variable blocks in `styles.css` are generated from this exact
   configuration by `gen-palettes.py` logic; an automated test asserts the two
   stay in sync.
2. **Semantics.** Success / warning / danger colours are shared per scheme
   across all palettes and never change meaning. Category colours and the
   persona/Wrapped artwork remain product-owned and are not palette-driven.
3. **Application.** The palette is stamped as `data-palette` and the appearance
   as `data-theme` (absent = System) on the root element. System mode is the
   no-attribute state, so `prefers-color-scheme` continues to drive colours in
   pure CSS with no flash and no JS dependency; `applyAppearance()` also sets
   `color-scheme` and dispatches `tabyss-theme-change` so charts and canvases
   redraw.
4. **Settings.** `settings.palette` and `settings.appearance` are allowlisted in
   `sanitizeSettings`; anything invalid or legacy (including the retired
   `theme` key) falls back to `cobalt` + `system` without touching other
   settings. Persistence goes through the worker `SAVE_SETTINGS` mutex like all
   other settings.
5. **UI.** Settings gains an Appearance section: six accessible radio-cards
   (name, one-line description, three swatches rendered from the configuration
   for the active scheme) plus System/Light/Dark radios with descriptions.
   Changes preview immediately; the existing Save button persists them. Open
   extension pages restyle via a shared `chrome.storage.onChanged` listener in
   `common.js`.

## Consequences

- Every surface consumes the shared semantic variables; no component hardcodes
  palette colours.
- Existing users land on Cobalt + System after update; no other settings are
  affected.
- No new permissions, remote assets, dependencies, or network requests.
- The palette count is fixed at six; adding one requires updating
  `TABYSS_PALETTES`, regenerating the CSS blocks, and extending the sync test.
