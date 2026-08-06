/* Tabyss — background service worker (v2.1)
 *
 * On-device tracking: time per domain/day/hour, site switches, rabbit-hole
 * runs, media accounting (video / shorts / feed-scroll via content-script
 * beats), category goals, 20-20-20 eye breaks, and Office Mode water/stand
 * reminders. Nothing ever leaves the machine — there is no network call
 * anywhere.
 */

// Chrome runs this file as a service worker (importScripts); Firefox runs it
// as an MV3 event page where common.js/product.js load via manifest order.
if (typeof importScripts === "function") importScripts("common.js", "product.js");

const MAX_DELTA_S = 90; // cap a single commit so machine-sleep gaps aren't counted
const HOLE_MIN_S = 25 * 60; // continuous same-site run that counts as a rabbit hole
const HOLE_CATS = ["Entertainment", "Social"];
const SUNSET_COOLDOWN_MS = 2 * 3600 * 1000;
const EYE_SECONDS = 20; // the "20 seconds" of 20-20-20
// A gap this long means the machine really slept; anything shorter is ordinary
// MV3 worker suspension and must not restart the Office mode cycles.
const SLEEP_GAP_MS = 10 * 60 * 1000;

async function restrictStorageAccess() {
  try {
    // Content scripts only communicate through validated messages; page-adjacent
    // contexts never need raw access to the user's complete browsing history.
    await chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
  } catch (_) {
    /* Older Chrome versions may not expose setAccessLevel. */
  }
}

async function ensureSchema() {
  const { meta } = await chrome.storage.local.get("meta");
  if (!meta || Number(meta.schemaVersion) < SCHEMA_VERSION) {
    await chrome.storage.local.set({
      meta: {
        ...(isPlainObject(meta) ? meta : {}),
        schemaVersion: SCHEMA_VERSION,
        migratedAt: Date.now(),
      },
    });
  }
}

/* Fire-and-forget entry points (alarms, tab events, notification buttons) must
 * never surface as unhandled rejections — log and move on. */
function swallow(promise) {
  Promise.resolve(promise).catch((error) => {
    console.warn("Tabyss background task failed:", error && error.message ? error.message : error);
  });
}

function setup() {
  restrictStorageAccess();
  swallow(withStore(ensureSchema)); // meta is also written by import — serialize
  if (chrome.idle?.setDetectionInterval) {
    getSettings()
      .then((s) => chrome.idle.setDetectionInterval(clampIdle(s.idleSeconds)))
      .catch(() => {});
  }
  chrome.alarms.create("tick", { periodInMinutes: 1 });
  chrome.alarms.create("maintenance", { periodInMinutes: 360 }); // prune every 6h
  swallow(maintenance());
  swallow(flush()); // start a session immediately so tracking begins on install/startup
  swallow(reconcileFocus());
}
function clampIdle(n) {
  return Math.max(15, Math.min(600, Number(n) || 60));
}

chrome.runtime.onInstalled.addListener((details) => {
  setup();
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  }
});
chrome.runtime.onStartup.addListener(setup);
restrictStorageAccess();

// Clicking a Tabyss notification opens the dashboard. Legacy Plan schedule
// notifications are cleared without reopening the retired Plan interface.
// (notifications API is desktop-only — absent on Firefox for Android.)
if (chrome.notifications?.onClicked) {
  chrome.notifications.onClicked.addListener((id) => {
    if (!id.startsWith("plan-schedule:")) swallow(chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") }));
    chrome.notifications.clear(id);
  });
}

// Notification action buttons (fallback when the page overlay can't show):
// button 0 = Done, button 1 = Snooze. Firefox has no notification buttons —
// there the notification body click (dashboard) is the only affordance.
if (chrome.notifications?.onButtonClicked) {
  chrome.notifications.onButtonClicked.addListener((id, btn) => {
    const kind = id.startsWith("well-water") ? "water" : id.startsWith("well-stand") ? "stand" : id.startsWith("well-eye") ? "eye" : null;
    if (!kind) return;
    chrome.notifications.clear(id);
    if (kind === "eye") {
      if (btn === 1) swallow(breakSnooze("eye", null));
      else swallow(breakDone("eye"));
    } else {
      if (btn === 1) swallow(wellSnooze(kind, 10));
      else swallow(wellDone(kind));
    }
  });
}

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === "tick") swallow(flush());
  else if (a.name === "maintenance") swallow(maintenance());
  else if (a.name === "focus-end") swallow(reconcileFocus());
});
chrome.tabs.onActivated.addListener(() => swallow(flush()));
chrome.tabs.onUpdated.addListener((_id, info, tab) => {
  if (info.url && tab.active) swallow(flush());
});
chrome.windows?.onFocusChanged?.addListener(() => swallow(flush()));
chrome.idle?.onStateChanged?.addListener(() => swallow(flush()));

async function openSavedPages() {
  try {
    const win = await chrome.windows.getLastFocused();
    if (!win || !Number.isInteger(win.id)) throw new Error("No browser window");
    await chrome.sidePanel.open({ windowId: win.id }); // Chrome
    return;
  } catch (_) { /* fall through */ }
  try {
    await chrome.sidebarAction.open(); // Firefox (valid from a user command)
    return;
  } catch (_) { /* fall through */ }
  await chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html") });
}

if (chrome.commands?.onCommand) {
  chrome.commands.onCommand.addListener((command) => {
    if (command === "open-command-center") swallow(openSavedPages());
  });
}

function isOwnSender(sender) {
  return !!sender && sender.id === chrome.runtime.id;
}
function isExtensionPageSender(sender) {
  return isOwnSender(sender) && typeof sender.url === "string" &&
    sender.url.startsWith(chrome.runtime.getURL(""));
}
function isContentScriptSender(sender) {
  return isOwnSender(sender) && !!sender.tab && !sender.tab.incognito &&
    typeof sender.url === "string" && /^https?:\/\//.test(sender.url);
}
function sendResult(promise, sendResponse, after) {
  Promise.resolve(promise).then((value) => {
    if (after) after(value);
    sendResponse({ ok: true, ...(isPlainObject(value) ? value : {}) });
  }).catch((error) => {
    console.warn("Tabyss request failed:", error && error.message ? error.message : "unknown error");
    const safeErrors = {
      FOCUS_ALREADY_ACTIVE: "A focus session is already active.",
      FOCUS_NOT_ACTIVE: "There is no active focus session.",
      FOCUS_INVALID_TEXT: "Add a short intention and keep details within the shown limits.",
      FOCUS_INVALID_DURATION: "Choose a supported focus duration.",
      FOCUS_INVALID_REASON: "Choose a supported reason for ending the session.",
      FOCUS_IMPORT_ACTIVE: "Finish or end the active focus session before restoring a backup.",
      FOCUS_HISTORY_CORRUPT: "Focus history could not be validated. Restore a known-good backup or clear local data before starting another session.",
      FOCUS_INVALID_MODE: "Choose timer or stopwatch mode.",
      FOCUS_INVALID_SITES: "Session sites could not be validated.",
      FOCUS_INVALID_TRANSITION: "That action is not available in the current session state.",
      PRODUCT_DATA_CORRUPT: "V2 product data could not be validated. Export a backup before repairing or clearing it.",
      PRODUCT_INVALID_TEXT: "Review the name, intention, or note and keep it within the shown limit.",
      PRODUCT_INVALID_ID: "That saved item could not be identified safely.",
      PRODUCT_INVALID_URL: "Only valid HTTP or HTTPS pages can be saved.",
      PRODUCT_INVALID_DOMAIN: "Review the site rules and enter domains such as example.com.",
      PRODUCT_INVALID_PROFILE: "That profile could not be validated.",
      PRODUCT_INVALID_PLAN: "That plan could not be validated.",
      PRODUCT_INVALID_SPACE: "That Space could not be validated.",
      PRODUCT_INVALID_CAPSULE: "That saved page could not be validated.",
      PRODUCT_INVALID_CHECKPOINT: "That browser checkpoint could not be validated.",
      PRODUCT_INVALID_CONTRACT: "That Focus Contract could not be validated.",
      PRODUCT_TAB_LIMIT: "This action needs a complete recovery point. Reduce the window to 100 savable tabs and try again.",
      PRODUCT_CHECKPOINT_IN_USE: "That checkpoint protects the current Focus Contract. Restore or keep the current tabs first.",
      PRODUCT_NOT_FOUND: "That saved item no longer exists.",
      PRODUCT_CONFIRM_REQUIRED: "Review the affected tabs before confirming this action.",
    };
    sendResponse({ ok: false, code: error && error.code || null, error: safeErrors[error && error.code] || "The request could not be completed safely." });
  });
  return true;
}

const ACTIVE_PRODUCT_ACTIONS = new Set(["save-capsule", "update-capsule", "delete-capsule"]);

// Messages are allowlisted by both action and source context. Content scripts
// can report only media/wellness actions; extension pages can mutate Saved pages.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!isPlainObject(msg) || typeof msg.type !== "string" || !isOwnSender(sender)) return false;
  const extensionPage = isExtensionPageSender(sender);
  const contentScript = isContentScriptSender(sender);
  switch (msg.type) {
    case "SAVE_SETTINGS":
      // Pages never write the settings key themselves: the worker sanitizes and
      // commits inside the storage mutex so a save can't race an import/clear.
      return extensionPage ? sendResult(saveSettings(msg.settings), sendResponse, setup) : false;
    case "FLUSH_NOW":
      return extensionPage ? sendResult(flush(), sendResponse) : false;
    case "RESET_TODAY":
      return extensionPage ? sendResult(resetToday(), sendResponse) : false;
    case "IMPORT_DATA":
      return extensionPage ? sendResult(importData(msg.data), sendResponse, setup) : false;
    case "CLEAR_ALL_DATA":
      return extensionPage ? sendResult(clearAllData(), sendResponse, setup) : false;
    case "EXPORT_DATA":
      return extensionPage ? sendResult(exportData(), sendResponse) : false;
    case "GET_FOCUS_DATA":
      return extensionPage ? sendResult(getFocusData(), sendResponse) : false;
    case "START_FOCUS":
      return extensionPage ? sendResult(focusCommand("start", msg), sendResponse) : false;
    case "PAUSE_FOCUS":
      return extensionPage ? sendResult(focusCommand("pause", msg), sendResponse) : false;
    case "RESUME_FOCUS":
      return extensionPage ? sendResult(focusCommand("resume", msg), sendResponse) : false;
    case "EXTEND_FOCUS":
      return extensionPage ? sendResult(focusCommand("extend", msg), sendResponse) : false;
    case "COMPLETE_FOCUS":
      return extensionPage ? sendResult(focusCommand("complete", msg), sendResponse) : false;
    case "ABANDON_FOCUS":
      return extensionPage ? sendResult(focusCommand("abandon", msg), sendResponse) : false;
    case "GET_PRODUCT_DATA":
      return extensionPage ? sendResult(productCommand("get", msg), sendResponse) : false;
    case "PRODUCT_COMMAND":
      return extensionPage && ACTIVE_PRODUCT_ACTIONS.has(msg.action)
        ? sendResult(productCommand(msg.action, msg), sendResponse)
        : false;
    case "MEDIA_BEAT":
      return contentScript ? sendResult(mediaBeat(msg, sender), sendResponse) : false;
    case "BREAK_SNOOZE":
      return contentScript ? sendResult(breakSnooze(msg.kind, msg.mins), sendResponse) : false;
    case "BREAK_SKIP":
      return contentScript ? sendResult(breakSkip(msg.kind), sendResponse) : false;
    case "BREAK_DONE":
      return contentScript ? sendResult(breakDone(msg.kind), sendResponse) : false;
    case "WELL_DONE":
      return contentScript ? sendResult(wellDone(msg.kind), sendResponse) : false;
    case "WELL_SNOOZE":
      return contentScript ? sendResult(wellSnooze(msg.kind, msg.mins), sendResponse) : false;
    default:
      return false;
  }
});

function domainOf(url) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return null;
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/* Idle is desktop-only; on Firefox for Android the foreground tab IS the
 * user's attention, so absence of the API reads as "active". */
function queryIdleState(seconds) {
  if (!chrome.idle?.queryState) return Promise.resolve("active");
  // Callback form: promise-based idle.queryState needs Chrome 116+; the shim
  // works on every MV3 Chrome.
  return new Promise((res) => chrome.idle.queryState(seconds, res));
}

async function computeState(settings) {
  let tab = null;
  if (chrome.windows?.getLastFocused) {
    let win;
    try {
      win = await chrome.windows.getLastFocused();
    } catch {
      win = null;
    }
    if (!win || !win.focused) return { domain: null, counting: false, tabId: null };
    [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
  } else {
    // Firefox for Android has no windows API — there is exactly one visible
    // "window", so the active tab stands in for the focused-window check.
    [tab] = await chrome.tabs.query({ active: true });
  }
  if (!tab || !tab.url || tab.incognito) return { domain: null, counting: false, tabId: null };

  const domain = domainOf(tab.url);
  if (!domain || isIgnoredDomain(domain, settings.ignore))
    return { domain: null, counting: false, tabId: null };

  // Idle check comes last, with one exception: an audible tab (video/music
  // playing) counts as active even with no keyboard/mouse input — otherwise
  // a Netflix binge would read as "idle" and never be tracked.
  const idleState = await queryIdleState(clampIdle(settings.idleSeconds));
  if (idleState !== "active" && !tab.audible)
    return { domain: null, counting: false, tabId: null };

  return { domain, counting: true, tabId: tab.id };
}

// A finished same-site run becomes a rabbit hole if it was long enough and in a
// doomscroll-prone category. The hole is filed under the day/hour the run
// STARTED — finalize can happen after midnight for a run that began before it.
function finalizeRun(run, holes, settings) {
  if (!run || run.accum < HOLE_MIN_S) return;
  const cat = categorize(run.domain, settings.overrides);
  if (!HOLE_CATS.includes(cat)) return;
  const startedAt = Number.isFinite(run.startedAt) ? run.startedAt : Date.now();
  const day = dateKey(startedAt);
  holes[day] = holes[day] || [];
  if (holes[day].length >= 24) return; // sanity cap per day
  holes[day].push({ domain: run.domain, secs: run.accum, hour: new Date(startedAt).getHours() });
}

// Split a committed interval at the local hour boundary so seconds land in the
// hour (and day — midnight is an hour boundary) they actually happened in.
// delta ≤ MAX_DELTA_S, so at most one boundary is ever crossed.
function splitAtHourBoundary(startMs, endMs) {
  const boundary = new Date(startMs);
  boundary.setMinutes(60, 0, 0); // rolls to the start of the next hour
  const split = boundary.getTime();
  const total = Math.round((endMs - startMs) / 1000);
  const segments = [];
  const firstSecs = Math.min(total, Math.round((Math.min(endMs, split) - startMs) / 1000));
  if (firstSecs > 0) segments.push({ at: startMs, secs: firstSecs });
  // The remainder is total minus what the first segment took, so the two
  // segments always sum exactly to the committed delta.
  if (split < endMs && total - firstSecs > 0) segments.push({ at: split, secs: total - firstSecs });
  return segments;
}

/* All storage read-modify-write transactions are serialized through one
 * promise-chain mutex — flush, maintenance, media beats, wellness updates and
 * reset each do get→mutate→set over shared keys, and interleaving them loses
 * committed data. */
let storeChain = Promise.resolve();
function withStore(fn) {
  const p = storeChain.then(fn, fn);
  storeChain = p.then(() => {}, () => {});
  return p;
}
function flush() { return withStore(doFlush); }
function maintenance() { return withStore(doMaintenance); }
function resetToday() { return withStore(doResetToday); }
function importData(data) { return withStore(() => doImportData(data)); }
function clearAllData() { return withStore(doClearAllData); }
function exportData() { return withStore(doExportData); }
function getFocusData() { return withStore(doGetFocusData); }
function focusCommand(action, payload) { return withStore(() => doFocusCommand(action, payload)); }
function reconcileFocus() { return withStore(doReconcileFocus); }
function productCommand(action, payload) { return withStore(() => doProductCommand(action, payload)); }
function saveSettings(settings) { return withStore(() => doSaveSettings(settings)); }

async function doSaveSettings(value) {
  const clean = sanitizeSettings(isPlainObject(value) ? value : {});
  await chrome.storage.local.set({ settings: clean });
  return { settings: clean };
}

async function doFlush() {
  const now = Date.now();
  const settings = await getSettings();
  const store = await chrome.storage.local.get([
    "session", "usage", "hours", "switches", "run", "holes", "notified", "sunsetLast", "wellnessState", "focusActive",
  ]);
  const usage = store.usage || {};
  const hours = store.hours || {};
  const switches = store.switches || {};
  const holes = store.holes || {};
  const notified = store.notified || {};
  let goalsChanged = false;
  let run = store.run || null;
  let sunsetLast = store.sunsetLast || 0;
  const ws = store.wellnessState || { activeSecs: 0, lastWater: now, lastStand: now, eyeSnoozeUntil: 0 };
  const session = store.session;
  let focusActive = validStoredFocusActive(store.focusActive);
  let focusSitesChanged = false;
  const day = dateKey(now);

  // A gap breaks the *browsing* streak, so the eye-break clock restarts.
  if (ws.lastFlush && now - ws.lastFlush > MAX_DELTA_S * 1000) {
    ws.activeSecs = 0;
  }
  // Office cycles are wall-clock and must survive ordinary worker suspension.
  // They used to restart on the same 90s gap, but MV3 suspends this worker
  // constantly and delays alarms well past 90s precisely when the browser is
  // in the background — which is when Office mode is supposed to be counting.
  // The 50-minute water timer was therefore reset to zero before it could ever
  // elapse. Only a real sleep/shutdown gap restarts these; presence is already
  // handled by the idle check below.
  if (ws.lastFlush && now - ws.lastFlush > SLEEP_GAP_MS) {
    ws.lastWater = now;
    ws.lastStand = now;
  }
  // A stored state written by an older build may predate these fields; without
  // a value `now - undefined` is NaN and the reminder never fires at all.
  if (!Number.isFinite(ws.lastWater)) ws.lastWater = now;
  if (!Number.isFinite(ws.lastStand)) ws.lastStand = now;
  const prevFlush = ws.lastFlush;
  ws.lastFlush = now;

  // Daily recap: first flush of a new day looks back at yesterday.
  if (ws.lastDay && ws.lastDay !== day && settings.recapEnabled !== false) {
    const y = ws.lastDay;
    const yTotal = Object.values(usage[y] || {}).reduce((s, v) => s + v, 0);
    if (yTotal >= 1800) {
      const yScore = focusScoreForDay(usage[y], switches[y], holes[y], settings.overrides);
      const top = Object.entries(usage[y] || {}).sort((a, b) => b[1] - a[1])[0];
      notifySafe(
        "recap",
        // after a multi-day gap, name the actual day instead of lying "yesterday"
        shiftDay(day, -1) === y ? "Yesterday on Tabyss" : `${prettyDate(y)} on Tabyss`,
        recapNotificationMessage(yTotal, yScore, top, settings)
      );
    }
  }
  ws.lastDay = day;

  if (session && session.counting && session.domain && session.start) {
    let delta = Math.floor((now - session.start) / 1000);
    // A delta beyond one tick means sleep/lid-close/shutdown — continuity is
    // broken: the same-site run must not stitch across the gap, the eye-break
    // clock resets, and water/stand cycles restart (you weren't at the desk).
    if (delta > MAX_DELTA_S) {
      if (run) {
        finalizeRun(run, holes, settings); // a genuine pre-gap 25m+ run still counts
        run = null;
      }
      ws.activeSecs = 0; // browsing streak broken; office cycles are wall-clock
    }
    if (delta > 0 && delta <= MAX_DELTA_S * 100) {
      // clamp: guards clock changes / long sleeps from inflating a bucket
      if (delta > MAX_DELTA_S) delta = MAX_DELTA_S;
      for (const segment of splitAtHourBoundary(now - delta * 1000, now)) {
        const segDay = dateKey(segment.at);
        usage[segDay] = usage[segDay] || {};
        usage[segDay][session.domain] = (usage[segDay][session.domain] || 0) + segment.secs;
        hours[segDay] = hours[segDay] || {};
        const segHour = new Date(segment.at).getHours();
        hours[segDay][segHour] = (hours[segDay][segHour] || 0) + segment.secs;
      }
      ws.activeSecs += delta;
      // rabbit-hole run accounting: extend or roll over the same-site run
      if (run && run.domain === session.domain) {
        run.accum += delta;
      } else {
        finalizeRun(run, holes, settings);
        run = { domain: session.domain, accum: delta, startedAt: now - delta * 1000 };
      }
      goalsChanged = checkGoals(day, usage[day] || {}, settings, notified) || goalsChanged;
      if (
        focusActive?.status === "running" &&
        Number.isFinite(focusActive.segmentStartedAt) &&
        Math.max(session.start, focusActive.segmentStartedAt) < now
      ) {
        const updatedFocus = focusWithVisitedDomain(focusActive, session.domain);
        focusSitesChanged = updatedFocus !== focusActive;
        focusActive = updatedFocus;
      }
    }
  }

  const state = await computeState(settings);

  // Site-switch counting: a focused move from one site to a different site.
  if (session && session.domain && state.domain && state.domain !== session.domain) {
    switches[day] = (switches[day] || 0) + 1;
  }
  // Leaving the web finalizes any in-progress run. The eye-break clock only
  // resets once the away period has lasted ≥ EYE_SECONDS — a genuine 20-second
  // look-away IS the break; a 2-second alt-tab is not and must not wipe
  // 19 minutes of accrued screen time.
  if (!state.counting) {
    if (run) {
      finalizeRun(run, holes, settings);
      run = null;
    }
    if (!ws.awaySince) ws.awaySince = now;
    else if (now - ws.awaySince >= EYE_SECONDS * 1000) ws.activeSecs = 0;
  } else if (ws.awaySince) {
    // away span just ended — decide on re-entry whether it was a real break
    if (now - ws.awaySince >= EYE_SECONDS * 1000) ws.activeSecs = 0;
    ws.awaySince = 0;
  }

  // Digital sunset: gentle nudge when browsing stimulating sites late at night.
  if (state.counting && settings.sunsetEnabled !== false) {
    const h = new Date(now).getHours();
    const startH = clampSunsetHour(settings.sunsetHour);
    const inWindow = h >= startH || h < 4; // window wraps past midnight
    const cat = categorize(state.domain, settings.overrides);
    if (inWindow && HOLE_CATS.includes(cat) && now - sunsetLast > SUNSET_COOLDOWN_MS) {
      sunsetLast = now;
      // Stable id: a new nudge replaces the previous one instead of stacking.
      notifySafe("sunset", "The feed will keep 🌆",
        sunsetNotificationMessage(state.domain, settings));
    }
  }

  // Desk presence: OS-level input, so time spent in another application still
  // counts. Queried once and shared by the eye clock and the office cycles.
  const present = (await queryIdleState(clampIdle(settings.idleSeconds))) === "active";

  // Screen time is screen time. The eye clock used to advance only while Chrome
  // held focus, so switching to another app froze it and the reminder never
  // arrived — which is exactly when a notification is the only way to reach
  // you. Away from the browser but still at the desk, it keeps counting; the
  // break then has no focused tab to draw on and falls through to the OS
  // notification with its Done and Snooze buttons.
  if (!state.counting && present && Number.isFinite(prevFlush)) {
    ws.activeSecs += Math.min(MAX_DELTA_S, Math.max(0, Math.round((now - prevFlush) / 1000)));
  }

  // At most ONE break per flush — a second trigger in the same pass would
  // clobber the first overlay while its cycle was already consumed. A deferred
  // break's condition is preserved and fires on the next tick instead.
  let breakFired = false;

  // Heads-up pill ~1 minute before the eye break so the blur never surprises.
  const eyeThresh = clampMin(settings.eyeIntervalMin, 1, 120, 20) * 60;
  if (ws.activeSecs < eyeThresh - 60) ws.preWarned = false;
  if (
    settings.eyeEnabled !== false &&
    state.counting &&
    state.tabId != null &&
    !ws.preWarned &&
    ws.activeSecs >= eyeThresh - 60 &&
    ws.activeSecs < eyeThresh &&
    now >= (ws.eyeSnoozeUntil || 0)
  ) {
    ws.preWarned = true;
    chrome.tabs
      .sendMessage(state.tabId, { type: "SHOW_PREBREAK", seconds: Math.max(10, eyeThresh - ws.activeSecs) })
      .catch(() => {});
  }

  // 20-20-20 eye break: after eyeIntervalMin of continuous screen time.
  if (
    !breakFired &&
    settings.eyeEnabled !== false &&
    (state.counting || present) &&
    ws.activeSecs >= clampMin(settings.eyeIntervalMin, 1, 120, 20) * 60 &&
    now >= (ws.eyeSnoozeUntil || 0)
  ) {
    breakFired = true;
    ws.activeSecs = 0;
    ws.eyeSnoozeUntil = 0;
    triggerBreak(state, {
      kind: "eye",
      emoji: "👀",
      title: "Eyes need a horizon",
      body: "Look at something 20 feet away for 20 seconds. Blink slowly — the tabs will wait.",
      seconds: EYE_SECONDS,
      snoozeMin: clampMin(settings.eyeSnoozeMin, 1, 30, 5),
      silent: settings.notificationSound === false,
    }, "well-eye");
  }

  // Office Mode: water + stand reminders on their own cycles. Not gated on
  // browsing (being at the desk is the point — another app still counts), but
  // gated on system presence so a machine left awake overnight doesn't remind
  // an empty room every 50 minutes.
  if (settings.officeMode) {
    if (!present) {
      ws.lastWater = now;
      ws.lastStand = now;
    } else {
      if (!breakFired && now - ws.lastWater >= clampMin(settings.waterIntervalMin, 10, 240, 50) * 60000) {
        breakFired = true;
        ws.lastWater = now;
        triggerBreak(state, {
          kind: "water",
          emoji: "💧",
          title: "Water o'clock",
          body: "Small sip, big saves.",
              silent: settings.notificationSound === false,
        }, "well-water");
      }
      if (!breakFired && now - ws.lastStand >= clampMin(settings.standIntervalMin, 15, 240, 60) * 60000) {
        breakFired = true;
        ws.lastStand = now;
        triggerBreak(state, {
          kind: "stand",
          emoji: "🚶",
          title: "Unfold yourself",
          body: "Ninety seconds on your feet resets the hips and the mind.",
              silent: settings.notificationSound === false,
        }, "well-stand");
      }
    }
  }

  const storagePatch = {
    usage, hours, switches, holes, run, sunsetLast, wellnessState: ws,
    session: { domain: state.domain, counting: state.counting, start: now },
  };
  // Goal markers commit atomically with the usage they describe.
  if (goalsChanged) storagePatch.notified = notified;
  if (focusSitesChanged) storagePatch.focusActive = focusActive;
  await chrome.storage.local.set(storagePatch);
}

function clampSunsetHour(n) {
  n = Number(n);
  return Number.isFinite(n) ? Math.max(20, Math.min(23, Math.round(n))) : 23;
}
function clampMin(n, lo, hi, dflt) {
  n = Number(n);
  return Number.isFinite(n) && n > 0 ? Math.max(lo, Math.min(hi, Math.round(n))) : dflt;
}

function notifySafe(id, title, message, buttons, silent) {
  try {
    const opts = { type: "basic", iconUrl: "icon128.png", title, message, priority: 1 };
    // Chrome chimes by default; `silent` suppresses it without hiding the
    // notification, so the reminder still arrives when sound is turned off.
    if (silent) opts.silent = true;
    // Buttons only where the platform can deliver their clicks (not Firefox).
    if (buttons && chrome.notifications?.onButtonClicked) opts.buttons = buttons;
    chrome.notifications.create(id, opts);
  } catch (_) {
    /* notifications may be OS-blocked */
  }
}

function recapNotificationMessage(total, score, top, settings) {
  return `${fmt(total)} online${score != null ? ` · focus ${score}` : ""}` +
    (settings.notificationDetails && top ? ` · top: ${top[0]}` : "");
}

function sunsetNotificationMessage(domain, settings) {
  return settings.notificationDetails
    ? `It's late — you're on ${domain}. Your future self says wind down.`
    : "It's late and you've been on a stimulating site. Your future self says wind down.";
}

/* Show a break on the active page (blur overlay); fall back to a notification
 * with Done/Snooze buttons when no content script can be reached. */
/* Breaks are delivered as an OS notification, always.
 *
 * The page overlay (full blur, or a corner card) was removed because it could
 * not be relied on: a content script is only injected when a page loads, so
 * every tab already open when the extension installs or updates has no
 * receiver, and the overlay silently does nothing there. A notification has no
 * such dependency, reaches you when Chrome is not focused or not even in
 * front, and carries the same Done and Snooze buttons. */
async function triggerBreak(state, cfg, idPrefix) {
  // Stable id: a new reminder replaces its predecessor instead of stacking.
  notifySafe(idPrefix, `${cfg.emoji} ${cfg.title}`, cfg.body, [
    { title: cfg.kind === "eye" ? "Done" : "Done ✓" },
    { title: "Snooze" },
  ], cfg.silent);
}

/* ---------- wellness transactions (all through the mutex) ---------- */

function breakSnooze(kind, mins) {
  if (kind !== "eye") return;
  return withStore(async () => {
    const settings = await getSettings();
    const { wellnessState: ws = {} } = await chrome.storage.local.get("wellnessState");
    const m = clampMin(mins, 1, 60, clampMin(settings.eyeSnoozeMin, 1, 30, 5));
    ws.eyeSnoozeUntil = Date.now() + m * 60000;
    // keep the clock at the threshold so the break re-fires right after snooze
    ws.activeSecs = clampMin(settings.eyeIntervalMin, 1, 120, 20) * 60;
    await chrome.storage.local.set({ wellnessState: ws });
  });
}

function breakSkip(kind) {
  if (kind !== "eye") return;
  return withStore(async () => {
    const day = dateKey(Date.now());
    const { wellness = {} } = await chrome.storage.local.get("wellness");
    wellness[day] = wellness[day] || {};
    wellness[day].eyeSkipped = (wellness[day].eyeSkipped || 0) + 1;
    await chrome.storage.local.set({ wellness });
  });
}

function breakDone(kind) {
  if (kind !== "eye") return;
  return withStore(async () => {
    const day = dateKey(Date.now());
    const { wellness = {} } = await chrome.storage.local.get("wellness");
    wellness[day] = wellness[day] || {};
    wellness[day].eyeTaken = (wellness[day].eyeTaken || 0) + 1;
    await chrome.storage.local.set({ wellness });
  });
}

function wellDone(kind) {
  if (kind !== "water" && kind !== "stand") return;
  return withStore(async () => {
    const now = Date.now();
    const day = dateKey(now);
    const { wellness = {}, wellnessState: ws = {} } = await chrome.storage.local.get([
      "wellness", "wellnessState",
    ]);
    wellness[day] = wellness[day] || {};
    const key = kind === "water" ? "waterDone" : "standDone";
    wellness[day][key] = (wellness[day][key] || 0) + 1;
    if (kind === "water") ws.lastWater = now;
    else ws.lastStand = now;
    await chrome.storage.local.set({ wellness, wellnessState: ws });
  });
}

function wellSnooze(kind, mins) {
  if (kind !== "water" && kind !== "stand") return;
  return withStore(async () => {
    const settings = await getSettings();
    const { wellnessState: ws = {} } = await chrome.storage.local.get("wellnessState");
    const m = clampMin(mins, 1, 60, 10);
    const interval = kind === "water"
      ? clampMin(settings.waterIntervalMin, 10, 240, 50)
      : clampMin(settings.standIntervalMin, 15, 240, 60);
    // back-date the cycle so the reminder re-fires in `m` minutes
    const backdated = Date.now() - (interval - m) * 60000;
    if (kind === "water") ws.lastWater = backdated;
    else ws.lastStand = backdated;
    await chrome.storage.local.set({ wellnessState: ws });
  });
}

/* ---------- media beats from the content script ---------- */

function mediaBeat(msg, sender) {
  const tab = sender && sender.tab;
  if (!tab || !tab.active || !tab.url || tab.incognito) return; // only a regular focused tab counts
  const domain = domainOf(tab.url);
  if (!domain) return;
  const kind = ["video", "shorts"].includes(msg.kind) ? msg.kind : null;
  if (!kind) return;
  const secs = Math.min(60, Math.max(1, Number(msg.secs) || 0));
  return withStore(async () => {
    const settings = await getSettings();
    if (settings.mediaEnabled === false) return;
    if (isIgnoredDomain(domain, settings.ignore)) return;
    const day = dateKey(Date.now());
    const { media = {} } = await chrome.storage.local.get("media");
    media[day] = media[day] || {};
    media[day][kind] = media[day][kind] || {};
    media[day][kind][domain] = (media[day][kind][domain] || 0) + secs;
    await chrome.storage.local.set({ media });
  });
}

/* ---------- goals ---------- */

/* Mutates the caller's `notified` map; returns whether it changed. The caller
 * commits it in the same storage.set as the usage it describes, so a marker can
 * never outlive a failed usage commit. */
function checkGoals(day, usageDay, settings, notified) {
  const goals = settings.goals || {};
  if (!Object.values(goals).some((v) => v > 0)) return false;

  const catTotals = {};
  for (const [domain, secs] of Object.entries(usageDay)) {
    const cat = categorize(domain, settings.overrides);
    catTotals[cat] = (catTotals[cat] || 0) + secs;
  }

  let changed = false;
  // Persist an (empty) per-day marker whenever goals are active — it both
  // dedupes notifications and records "goals were in effect this day" for the
  // goal_keeper badge, which must never be earned retroactively.
  if (!notified[day]) {
    notified[day] = {};
    changed = true;
  }

  for (const [cat, mins] of Object.entries(goals)) {
    if (!mins || mins <= 0) continue;
    if ((catTotals[cat] || 0) >= mins * 60 && !notified[day][cat]) {
      notified[day][cat] = true;
      changed = true;
      notifySafe(`goal-${day}-${cat}`, "Tabyss — daily limit reached",
        `You've hit your ${mins}m ${cat} limit today (${fmt(catTotals[cat])} so far). ` +
        "Goals are checked on-device — no site name shown.");
    }
  }
  return changed;
}

/* ---------- V2 quick intention / focus sessions ---------- */

function validStoredFocusActive(value) {
  if (!isPlainObject(value) || value.version !== FOCUS_ACTIVE_VERSION) return null;
  if (typeof value.id !== "string" || !/^[A-Za-z0-9_-]{8,100}$/.test(value.id)) return null;
  if (typeof value.intention !== "string" || !value.intention || value.intention.length > FOCUS_MAX_TEXT) return null;
  if (typeof value.successDefinition !== "string" || value.successDefinition.length > FOCUS_MAX_DETAIL) return null;
  if (!["timer", "stopwatch"].includes(value.mode) || !["running", "paused", "review"].includes(value.status)) return null;
  if (!Number.isFinite(value.startedAt) || value.startedAt < 946684800000 || value.startedAt > 4102444800000) return null;
  if (!Number.isFinite(value.updatedAt) || value.updatedAt < value.startedAt) return null;
  if (!Number.isFinite(value.accumulatedMs) || value.accumulatedMs < 0 || value.accumulatedMs > FOCUS_MAX_RUNNING_MS) return null;
  if (value.status === "running" && (!Number.isFinite(value.segmentStartedAt) || value.segmentStartedAt < value.startedAt)) return null;
  if (value.status !== "running" && value.segmentStartedAt != null) return null;
  if (value.mode === "timer") {
    if (!Number.isInteger(value.targetMinutes) || value.targetMinutes < 5 || value.targetMinutes > 720) return null;
    if (value.targetMs !== value.targetMinutes * 60000 || value.targetMs > FOCUS_MAX_RUNNING_MS) return null;
    if (value.accumulatedMs > value.targetMs) return null;
  } else if (value.targetMinutes != null || value.targetMs != null) return null;
  if (value.status === "review" && value.reviewReason !== (value.mode === "timer" ? "timer" : "safety")) return null;
  if (value.status !== "review" && value.reviewReason != null) return null;
  let visitedDomains;
  try { visitedDomains = normalizeFocusVisitedDomains(value.visitedDomains); }
  catch (_) { return null; }
  return { ...value, visitedDomains };
}

function readFocusHistory(value) {
  try {
    return { sessions: sanitizeFocusSessions(value == null ? [] : value), valid: true };
  } catch (error) {
    console.warn("Tabyss focus history is invalid:", error && error.message ? error.message : "unknown error");
    return { sessions: [], valid: false };
  }
}

function newFocusId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function pruneFocusHistory(records, retentionDays) {
  const cutoff = shiftDay(dateKey(Date.now()), -Math.max(1, Number(retentionDays) || 180));
  return records.filter((record) => record.day >= cutoff).slice(-FOCUS_MAX_HISTORY);
}

/* Amber toolbar dot while a session is live — the one signal that survives
 * closing the popup. Text-free so it never leaks the intention. */
function syncFocusBadge(active) {
  try {
    chrome.action.setBadgeText({ text: active ? "●" : "" });
    if (active) {
      chrome.action.setBadgeBackgroundColor({ color: "#EFB65A" });
      chrome.action.setBadgeTextColor?.({ color: "#2A1007" });
    }
  } catch (_) { /* badge is cosmetic */ }
}

async function syncFocusAlarm(active, now) {
  syncFocusBadge(active);
  await chrome.alarms.clear("focus-end");
  if (!active || active.status !== "running") return;
  const remaining = active.mode === "timer"
    ? focusRemainingMs(active, now)
    : Math.max(0, FOCUS_MAX_RUNNING_MS - focusElapsedMs(active, now));
  if (remaining > 0) await chrome.alarms.create("focus-end", { when: now + remaining });
}

async function loadAndReconcileFocus() {
  const now = Date.now();
  const store = await chrome.storage.local.get(["focusActive", "focusSessions"]);
  let active = validStoredFocusActive(store.focusActive);
  const history = readFocusHistory(store.focusSessions);
  const sessions = history.sessions;
  let changed = !!store.focusActive && !active;
  let enteredReview = false;
  if (active && focusNeedsReview(active, now)) {
    active = focusTransition(active, "review", now).active;
    changed = true;
    enteredReview = true;
  }
  if (changed) await chrome.storage.local.set({ focusActive: active });
  await syncFocusAlarm(active, now);
  if (enteredReview) {
    const settings = await getSettings();
    notifySafe(
      "focus-review",
      active.reviewReason === "safety" ? "Focus session paused for review" : "Focus session ready to review",
      settings.notificationDetails ? `Check in on: ${active.intention}` : "Open Tabyss to complete, extend, or end the session."
    );
  }
  return { active, sessions, historyValid: history.valid, now };
}

function publicFocusData(active, sessions, now, historyValid = true) {
  return { focus: focusView(active, now), focusSessions: sessions, focusHistoryAvailable: historyValid };
}

async function captureCurrentFocusSite(active) {
  if (!active || active.status !== "running") return active;
  const settings = await getSettings();
  const state = await computeState(settings);
  return focusWithVisitedDomain(active, state.domain);
}

async function doGetFocusData() {
  const state = await loadAndReconcileFocus();
  const active = await captureCurrentFocusSite(state.active);
  if (active !== state.active) await chrome.storage.local.set({ focusActive: active });
  return publicFocusData(active, state.sessions, state.now, state.historyValid);
}

async function doReconcileFocus() {
  return doGetFocusData();
}

async function doFocusCommand(action, payload) {
  const state = await loadAndReconcileFocus();
  let active = state.active;
  let sessions = state.sessions;
  if (!state.historyValid) focusFailure("FOCUS_HISTORY_CORRUPT");
  const now = Date.now();
  if (action === "start") {
    if (active) focusFailure("FOCUS_ALREADY_ACTIVE");
    const settings = await getSettings();
    const current = await computeState(settings);
    active = createFocusActive({
      ...payload,
      visitedDomains: current.domain ? [current.domain] : [],
    }, now, newFocusId());
  } else {
    active = await captureCurrentFocusSite(active);
    const result = focusTransition(active, action, now, payload);
    active = result.active;
    if (result.record) {
      const settings = await getSettings();
      sessions = pruneFocusHistory([...sessions, result.record], settings.retentionDays);
    }
  }
  await chrome.storage.local.set({ focusActive: active, focusSessions: sessions });
  await syncFocusAlarm(active, now);
  if (action === "complete" || action === "abandon") await finishActiveContract();
  return publicFocusData(active, sessions, now);
}

async function doExportData() {
  await doFlush();
  const data = await chrome.storage.local.get(EXPORT_DATA_KEYS);
  return { data: buildExportPayload(data) };
}

/* ---------- V2 Saved pages and validated compatibility records ---------- */

function newProductId(prefix) {
  return `${prefix}_${crypto.randomUUID().toLowerCase()}`;
}

async function loadProductData() {
  const { product } = await chrome.storage.local.get("product");
  return sanitizeProductData(product);
}

async function saveProductData(product) {
  const safe = sanitizeProductData(product);
  await chrome.storage.local.set({ product: safe });
  return safe;
}

function currentProductProfile(product, requested) {
  const id = requested || product.activeProfileId;
  return product.profiles.some((profile) => profile.id === id) ? id : product.activeProfileId;
}

async function currentWindowTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  return (Array.isArray(tabs) ? tabs : []).filter((tab) => !tab.incognito);
}

async function publicProductData(product) {
  const tabs = await currentWindowTabs();
  const duplicates = productDuplicateGroups(tabs);
  return {
    product,
    duplicates,
  };
}

async function doProductCommand(action, payload) {
  const product = await loadProductData();
  const now = Date.now();
  if (action === "get") return publicProductData(product);

  if (action === "save-capsule") {
    let source = payload.capsule;
    if (!isPlainObject(source) || !source.url) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (!tab) productFailure("PRODUCT_NOT_FOUND");
      source = { url: tab.url, title: tab.title, note: payload.note };
    }
    const capsule = sanitizeProductCapsule({
      id: newProductId("capsule"),
      profileId: currentProductProfile(product, source.profileId),
      planId: source.planId || product.activeContract?.planId || "",
      url: source.url,
      title: source.title,
      note: source.note,
      status: "saved",
      savedAt: now,
      updatedAt: now,
    });
    product.capsules = [capsule, ...product.capsules].slice(0, PRODUCT_LIMITS.capsules);
    await saveProductData(product);
    return { ...(await publicProductData(product)), savedCapsule: capsule };
  }

  if (action === "update-capsule") {
    const id = productId(payload.capsuleId, "capsule");
    if (!product.capsules.some((item) => item.id === id)) productFailure("PRODUCT_NOT_FOUND");
    product.capsules = product.capsules.map((item) => item.id === id
      ? { ...item, status: payload.status === "done" ? "done" : "saved", note: productText(payload.note ?? item.note, PRODUCT_LIMITS.note), updatedAt: now }
      : item);
    await saveProductData(product);
    return publicProductData(product);
  }

  if (action === "delete-capsule") {
    const id = productId(payload.capsuleId, "capsule");
    product.capsules = product.capsules.filter((item) => item.id !== id);
    await saveProductData(product);
    return publicProductData(product);
  }

  productFailure("PRODUCT_NOT_FOUND");
}

async function finishActiveContract() {
  let product;
  try { product = await loadProductData(); } catch (_) { return; }
  if (!product.activeContract || product.activeContract.status !== "active") return;
  product.activeContract.status = "finished";
  product.activeContract.finishedAt = Date.now();
  await saveProductData(product);
}

/* ---------- housekeeping & reset ---------- */

// Periodic housekeeping: prune all date-keyed maps beyond the retention window.
async function doMaintenance() {
  const settings = await getSettings();
  const store = await chrome.storage.local.get([
    "usage", "hours", "notified", "switches", "holes", "media", "wellness", "focusSessions", "product",
  ]);
  const days = settings.retentionDays;
  let pruned = 0;
  const out = {};
  for (const key of ["usage", "hours", "notified", "switches", "holes", "media", "wellness"]) {
    const map = store[key] || {};
    pruned += pruneByRetention(map, days);
    out[key] = map;
  }
  // Corrupt focus history is left untouched (the user may still export/repair
  // it), but it must not stop the other stores from being pruned.
  const history = readFocusHistory(store.focusSessions);
  let focusChanged = false;
  if (history.valid) {
    const focusSessions = pruneFocusHistory(history.sessions, days);
    const storedFocusCount = Array.isArray(store.focusSessions) ? store.focusSessions.length : 0;
    focusChanged = focusSessions.length !== storedFocusCount ||
      (store.focusSessions != null && !Array.isArray(store.focusSessions));
    if (focusChanged) out.focusSessions = focusSessions;
  }
  if (store.product != null) {
    try {
      const product = sanitizeProductData(store.product);
      const productPruned = pruneByRetention(product.recoveryByDay, days);
      if (productPruned) {
        pruned += productPruned;
        out.product = product;
      }
    } catch (error) {
      console.warn("Tabyss product maintenance skipped:", error?.code || "invalid product data");
    }
  }
  if (pruned || focusChanged) await chrome.storage.local.set(out);
}

/* Reset today's data — runs in the worker, inside the mutex, and clears the
 * live session/run so the deleted day can't partially reappear on next tick. */
async function doResetToday() {
  const day = dateKey(Date.now());
  const store = await chrome.storage.local.get([
    "usage", "hours", "switches", "holes", "notified", "media", "wellness", "focusSessions", "focusActive",
  ]);
  for (const k of ["usage", "hours", "switches", "holes", "notified", "media", "wellness"]) {
    if (store[k]) delete store[k][day];
  }
  const history = readFocusHistory(store.focusSessions);
  if (!history.valid) focusFailure("FOCUS_HISTORY_CORRUPT");
  store.focusSessions = history.sessions.filter((record) => record.day !== day);
  const active = validStoredFocusActive(store.focusActive);
  if (!active || dateKey(active.startedAt) === day) {
    store.focusActive = null;
    syncFocusBadge(null);
    await chrome.alarms.clear("focus-end");
  }
  try {
    const product = await loadProductData();
    delete product.recoveryByDay[day];
    if (product.activeContract?.status === "active" && dateKey(product.activeContract.startedAt) === day) {
      product.activeContract.status = "finished";
      product.activeContract.finishedAt = Date.now();
    }
    await saveProductData(product);
  } catch (_) {
    // Product corruption fails closed; reset must not overwrite a record the user
    // may still be able to recover from an export.
  }
  // Today's wellness clocks and the sunset cooldown are part of "today" too.
  await chrome.storage.local.set({ ...store, run: null, session: null, wellnessState: null, sunsetLast: 0 });
}

/* Restore/clear are serialized with tracking writes. Imports are revalidated in
 * this trusted context even when the options page already showed a preview. */
async function doImportData(data) {
  const result = validateImportData(data);
  const { focusActive } = await chrome.storage.local.get("focusActive");
  if (validStoredFocusActive(focusActive)) focusFailure("FOCUS_IMPORT_ACTIVE");
  if (focusActive) {
    await chrome.storage.local.set({ focusActive: null });
    syncFocusBadge(null);
    await chrome.alarms.clear("focus-end");
  }
  await chrome.storage.local.set({
    ...result.patch,
    session: null,
    run: null,
    sunsetLast: 0,
    wellnessState: null,
    meta: { schemaVersion: SCHEMA_VERSION },
  });
  return { importedKeys: result.importedKeys, warnings: result.warnings };
}

async function doClearAllData() {
  syncFocusBadge(null);
  await chrome.alarms.clear("focus-end");
  await chrome.storage.local.clear();
  await chrome.storage.local.set({ meta: { schemaVersion: SCHEMA_VERSION } });
}

// Rebuild the one-shot focus alarm whenever MV3 evaluates a fresh worker.
// The alarm is only a wake-up hint; timestamps remain the source of truth.
reconcileFocus().catch(() => {});
