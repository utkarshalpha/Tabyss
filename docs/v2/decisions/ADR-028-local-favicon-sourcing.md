# ADR-028 — Exact-open-tab favicon sourcing from Chrome's local cache

Status: Accepted (owner-directed, 2026-08-02).

## Context

Wellbeing/media rows showed only a letter fallback whenever the canonical
`https://<domain>/` entry was missing from Chrome's favicon cache, even though
the cache usually holds an icon for the exact page the user has open. Remote
favicon services (Google, DuckDuckGo, Clearbit, Icon Horse) are ruled out by
the privacy contract.

## Decision

1. **Local cache only.** Every favicon URL is built by the shared
   `faviconUrl()` helper through `chrome.runtime.getURL("/_favicon/")`. The
   helper rejects non-HTTP(S) and credential-bearing URLs and strips fragments.
   A tab's own fav-icon URL field is never used as an image source (it can be a
   remote HTTP(S) URL and would trigger a network request).
2. **Exact-tab preference.** A trusted extension page builds a transient
   in-memory `Map<normalizedDomain, exactSafePageUrl>` from one
   `chrome.tabs.query({})` per render pass (`buildOpenTabFaviconMap`, pure and
   unit-tested). Incognito tabs, non-HTTP(S) URLs, and credential-bearing URLs
   are excluded; hostnames are www-stripped and matched exactly, so subdomain
   boundaries hold (docs.google.com never stands in for google.com;
   evil-example.com never matches example.com). Active tab wins, then the most
   recently seen normal tab. The map is never persisted and never reaches
   content scripts.
3. **Renderer.** The shared race-safe `renderFavicon()` paints the letter
   fallback first (palette-soft background, primary-colour letter), then tries
   the exact page URL, then the canonical domain; a candidate replaces the
   fallback only after a successful decode and only if the row was not
   re-rendered meanwhile. A broken-image glyph can never appear, and success or
   failure causes no layout shift. Icons are decorative (`alt=""`) because the
   domain text is always adjacent.

## Consequences

- No new permission (`tabs` and `favicon` already granted), no network
  requests, no favicon bytes or full URLs stored, no analytics change.
- Applied to the dashboard "Watch time & wellbeing" site rows; other chips keep
  their existing canonical-domain rendering until migrated to the shared
  renderer.
- Automated coverage: exact-vs-canonical preference, incognito/credential/
  non-HTTP rejection, boundary matching, candidate fallback order, permission
  set unchanged, no remote favicon host or network client in page sources.
