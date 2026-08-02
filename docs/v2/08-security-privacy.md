# Security, Privacy, and Permission Plan

## Security objective

Compromise of one surface, imported file, page, or optional integration must not silently expose or corrupt the user's browsing history, rules, captures, or account credentials.

## Privacy objective

The user should be able to determine:

- What Tabyss can access.
- What it records.
- Where it is stored.
- What leaves the device.
- Who can see connected/shared information.
- How to pause, correct, export, and delete it.

## Data classification

### Restricted

- Domains and session timeline.
- Saved page URLs, titles, and optional notes.
- Preserved compatibility Plan/Space/checkpoint records from earlier local V2 builds.
- Captured selected text, tasks, and notes.
- Profile and plan names.
- Optional integration tokens.
- Encryption/recovery keys.

### Sensitive derived

- Focus scores.
- Unplanned-use and intervention outcomes.
- Wellbeing and sleep/shutdown patterns.
- Personas and behavioral summaries.

### Operational

- Extension version.
- Schema version.
- Permission state.
- Coarse storage and error codes.

### Public by explicit action

- User-approved share card fields.
- User-selected exported report.

Data never changes class merely because it is aggregated. A detailed timeline aggregate can remain sensitive.

## Trust boundaries

- Website page versus isolated content script.
- Content script versus service worker.
- Extension page versus service worker.
- Imported file versus local storage.
- Optional integration versus local product.
- Optional telemetry endpoint versus personal analytics.
- Share/export action versus private data.

## Findings and final-local-V2 status

### High priority

1. **Resolved:** imports have a UI size limit, safe-tree checks, versioned allowlists,
   bounded values/collections, dangerous-key rejection, double validation, preview,
   and a pre-import local safety backup.
2. **Resolved:** foreground, media, explicit-capture, Space, checkpoint, and recovery
   paths exclude Incognito tabs.
3. **Resolved:** ignore matching is canonical and respects hostname label boundaries.
4. **Accepted residual:** the all-HTTP/HTTPS content script is still required for
   media classification, wellbeing overlays, and the Focus Contract guard. It has no
   storage access, receives no secrets, reads no page text/form values, and its
   message actions are sender-allowlisted. Optional-host migration remains possible
   but is not represented as complete.
5. **Resolved by default:** domain names are redacted from OS notification copy unless
   the user explicitly opts in. Local schedule notifications use generic copy and a
   daily budget; user-written Plan names and intentions stay off the lock screen.

### Defense-in-depth

1. **Implemented:** restrict `chrome.storage.local` to trusted extension contexts.
2. **Partially implemented:** allowlist message sender, type, and bounded payload;
   content signals are additionally rate/budget constrained where applicable. A
   fully versioned generated message contract remains future hardening.
3. Encrypt exported backups that contain restricted data.
4. **Partially implemented:** bounded schemas, corruption fail-closed behavior,
   deterministic backup/restore, and recovery checkpoints are present; near-quota
   UX remains a release hardening item.
5. **Implemented for the guard:** fullscreen and login/auth/payment/checkout paths
   suppress the intervention locally.
6. Add share/export previews and safe defaults.

## Permission strategy

### Current required permissions

- `tabs`
- `storage`
- `idle`
- `alarms`
- `notifications`
- `favicon`
- `sidePanel`
- HTTP/HTTPS content-script matches

### Proposed capability grouping

| Capability | Permission/API need | Product behavior when unavailable |
|---|---|---|
| Basic active-domain tracking | tabs, idle, storage, alarms | Core unavailable; explain clearly |
| Notifications | notifications | In-extension reminders only |
| Favicons | favicon | Letter/category fallback |
| Side panel | sidePanel | Popup/dashboard fallback |
| On-page interventions/media | optional host access/content script | Extension-page/notification fallback; media detail unavailable |
| Blocking | declarativeNetRequest and approved host/rule strategy | Observe/notify only |
| Tab grouping | tabGroups | Save/restore without group control |
| Capture selection | contextMenus/active user action and site access where required | Current-page metadata or manual entry only |

Every new permission needs:

- Feature owner.
- User benefit.
- Data-flow diagram.
- Optional-versus-required analysis.
- Store-warning impact.
- Grant and denial copy.
- Revocation detection.
- Test coverage.
- Privacy-policy update.

### Session-linked domain context

ADR-025 intentionally links a bounded set of visited domains to an Intentional
Session. This is more sensitive than daily aggregate domain totals even though it
remains local. Controls are mandatory: worker-derived input only, normalized domains,
24 unique entries maximum, no full URL/title/content/per-site duration, normal
Incognito and ignore exclusions, trusted storage access, validated import/export,
retention/reset/clear coverage, and explicit Privacy disclosure. No new permission
or content-script signal is used.

## Content-script hardening

- Dynamically register only enabled capability/site scopes where feasible.
- Do not expose storage or secrets.
- Use a single shadow-root or clearly namespaced UI container.
- Treat all DOM values as untrusted.
- Never insert page strings using unsafe HTML.
- Limit MutationObservers and disconnect when inactive.
- Bound video/element scans.
- Remove injected UI/listeners when module is disabled or extension updated.
- Do not run on internal, store, file, incognito, or excluded sensitive contexts.
- Fail open on unsupported site changes.

## Import/export controls

Import:

- Maximum file size and decompressed size.
- JSON parser and schema-version check.
- Plain-object checks; reject dangerous keys such as `__proto__`, `constructor`, and `prototype`.
- Bounded key counts, string lengths, nesting, arrays, dates, durations, and domains.
- Validate all enum values.
- Import into staging storage.
- Preview merge/replace/delete effect.
- Back up current data.
- Apply transactionally and verify.

Export:

- Choose scope and date range.
- Explain included restricted data.
- Default to encrypted backup for full history.
- Separate share report from backup.
- No domain names on a share card unless individually enabled.
- Redact diagnostics automatically.

## Blocking and intervention safety

- Maintain permanent allow rules for extension pages and recovery paths.
- Provide emergency disable from extension settings.
- Do not block authentication, payment, browser settings, extension store, or user-specified safety sites by category inference.
- Validate DNR rule count, precedence, and generated patterns.
- On rule-engine inconsistency, fail open and alert the user.
- On-page UI must never resemble a website login or system security prompt.
- Provide keyboard and screen-reader escape paths consistent with the selected strictness contract.

## Optional connected security requirements

No connected feature should be implemented until a specific Accepted ADR defines:

- Threat model.
- Authentication and session handling.
- Data minimization.
- Encryption in transit and at rest.
- Client-side encryption for restricted sync data.
- Key generation, recovery, device revocation, and rotation.
- Server log redaction.
- Retention and deletion.
- Vendor/subprocessor and policy requirements.
- Offline fallback.
- Incident response.

`chrome.storage.sync` is not an appropriate restricted-history store. It has small quotas and is not a user-controlled end-to-end encryption design.

## Abuse cases

- User imports a huge or malicious backup.
- Compromised page attempts to spoof or interfere with overlay.
- Content script sends forged/bursty messages.
- Malicious extension page state tries to trigger destructive commands.
- User is locked out by a malformed strict rule.
- Share card accidentally exposes a domain.
- Notification exposes sensitive activity on lock screen.
- Optional integration receives more fields than needed.
- Lost device retains access to connected data.
- Family/accountability feature becomes coercive monitoring.

Each case requires prevention, detection, recovery, and user communication.

## Security verification

- Threat model reviewed before implementation.
- Static analysis and secret scanning.
- Dependency and license scanning if dependencies are accepted.
- Message-contract fuzzing.
- Import fuzzing and zip-bomb/large-file testing where applicable.
- DNR rule property tests.
- Permission grant/revoke tests.
- Content-script DOM and hostile-page tests.
- Migration corruption/rollback tests.
- Encryption test vectors for any connected capability.
- Manual penetration test before connected backup/accountability release.
- Chrome Web Store policy review before submission.

## Residual compromises

- Chrome's tabs permission provides access to sensitive tab properties needed for tracking.
- Users can disable or uninstall the extension to bypass strict behavior.
- Local device compromise can expose unencrypted local extension storage.
- Website DOM changes can break supported-site controls.
- OS notifications may be visible beyond the browser unless content is redacted.
- A Chrome extension cannot guarantee OS-wide digital-wellbeing enforcement.

Final local V2 adds these explicit compromises:

- User-saved Space, Plan-page, Return Capsule, and checkpoint URLs/titles are
  sensitive and are stored unencrypted in the browser profile. A full JSON backup
  contains them. Local-device or browser-profile compromise can expose them.
- `tabs` is a broad capability. Sender allowlists and explicit-capture UX constrain
  Tabyss behavior, but Chrome's permission warning cannot express that narrower use.
- The mindful guard is an in-page, agency-preserving intervention. A hostile page can
  style over, remove, or interfere with injected UI; Tabyss fails open and never
  treats display as enforcement.
- Sensitive-context suppression is a conservative local path heuristic plus
  fullscreen detection. It cannot identify every confidential workflow without
  reading page content, which Tabyss deliberately refuses to do.
- Spaces/checkpoints restore safe HTTP(S) pages but do not preserve tab groups,
  navigation history, scroll position, form state, or page session state. Restoring
  a URL can re-run normal site navigation behavior.
- Current-window operations are deliberate. Multi-window grouping and full crash
  history would require more complex reconciliation and are not silently inferred.
- There is no encrypted sync, key recovery, remote deletion, account revocation,
  moderation, or abuse system. Therefore cloud and social/family capabilities are
  absent rather than weakly implemented.

These limits must be stated honestly rather than hidden in legal text.
