/* Tabyss — background service worker (v2.0)
 *
 * On-device tracking: time per domain/day/hour, site switches, rabbit-hole
 * runs, media accounting (video / shorts / feed-scroll via content-script
 * beats), category goals, 20-20-20 eye breaks, and Office Mode water/stand
 * reminders. Nothing ever leaves the machine — there is no network call
 * anywhere.
 */

importScripts("common.js", "product.js");

const MAX_DELTA_S = 90; // cap a single commit so machine-sleep gaps aren't counted
const HOLE_MIN_S = 25 * 60; // continuous same-site run that counts as a rabbit hole
const HOLE_CATS = ["Entertainment", "Social"];
const SUNSET_COOLDOWN_MS = 2 * 3600 * 1000;
const EYE_SECONDS = 20; // the "20 seconds" of 20-20-20

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

function setup() {
  restrictStorageAccess();
  ensureSchema().catch(() => {});
  getSettings().then((s) => chrome.idle.setDetectionInterval(clampIdle(s.idleSeconds)));
  chrome.alarms.create("tick", { periodInMinutes: 1 });
  chrome.alarms.create("maintenance", { periodInMinutes: 360 }); // prune every 6h
  maintenance();
  flush(); // start a session immediately so tracking begins on install/startup
  reconcileFocus();
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

// Clicking a Tabyss notification opens the dashboard.
chrome.notifications.onClicked.addListener((id) => {
  if (id.startsWith("plan-schedule:")) openCommandCenter();
  else chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  chrome.notifications.clear(id);
});

// Notification action buttons (fallback when the page overlay can't show):
// button 0 = Done, button 1 = Snooze.
chrome.notifications.onButtonClicked.addListener((id, btn) => {
  const kind = id.startsWith("well-water") ? "water" : id.startsWith("well-stand") ? "stand" : id.startsWith("well-eye") ? "eye" : null;
  if (!kind) return;
  chrome.notifications.clear(id);
  if (kind === "eye") {
    if (btn === 1) breakSnooze("eye", null);
    else breakDone("eye");
  } else {
    if (btn === 1) wellSnooze(kind, 10);
    else wellDone(kind);
  }
});

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === "tick") {
    flush();
    checkScheduledPlans().catch(() => {});
  }
  else if (a.name === "maintenance") maintenance();
  else if (a.name === "focus-end") reconcileFocus();
});
chrome.tabs.onActivated.addListener(() => flush());
chrome.tabs.onUpdated.addListener((_id, info, tab) => {
  if (info.url && tab.active) {
    flush();
    maybeShowGuard(tab).catch(() => {});
  }
});
chrome.tabs.onActivated.addListener(async (info) => {
  try {
    const tab = await chrome.tabs.get(info.tabId);
    await maybeShowGuard(tab);
  } catch (_) {}
});
chrome.windows.onFocusChanged.addListener(() => flush());
chrome.idle.onStateChanged.addListener(() => flush());

async function openCommandCenter() {
  try {
    const win = await chrome.windows.getLastFocused();
    if (!win || !Number.isInteger(win.id)) throw new Error("No browser window");
    await chrome.sidePanel.open({ windowId: win.id });
  } catch (_) {
    await chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html") });
  }
}

if (chrome.commands?.onCommand) {
  chrome.commands.onCommand.addListener((command) => {
    if (command === "open-command-center") openCommandCenter();
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
      FOCUS_INVALID_TRANSITION: "That action is not available in the current session state.",
      PRODUCT_DATA_CORRUPT: "V2 product data could not be validated. Export a backup before repairing or clearing it.",
      PRODUCT_INVALID_TEXT: "Review the name, intention, or note and keep it within the shown limit.",
      PRODUCT_INVALID_ID: "That saved item could not be identified safely.",
      PRODUCT_INVALID_URL: "Only valid HTTP or HTTPS pages can be saved.",
      PRODUCT_INVALID_DOMAIN: "Review the site rules and enter domains such as example.com.",
      PRODUCT_INVALID_PROFILE: "That profile could not be validated.",
      PRODUCT_INVALID_PLAN: "That plan could not be validated.",
      PRODUCT_INVALID_SPACE: "That Space could not be validated.",
      PRODUCT_INVALID_CAPSULE: "That Return Capsule could not be validated.",
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

// Messages are allowlisted by both action and source context. Content scripts
// can report only media/wellness actions; only extension pages can mutate data.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!isPlainObject(msg) || typeof msg.type !== "string" || !isOwnSender(sender)) return false;
  const extensionPage = isExtensionPageSender(sender);
  const contentScript = isContentScriptSender(sender);
  switch (msg.type) {
    case "SETTINGS_CHANGED":
      if (!extensionPage) return false;
      setup();
      sendResponse({ ok: true });
      return false;
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
      return extensionPage ? sendResult(productCommand("get", msg, sender), sendResponse) : false;
    case "PRODUCT_COMMAND":
      return extensionPage ? sendResult(productCommand(msg.action, msg, sender), sendResponse) : false;
    case "GUARD_DECISION":
      return contentScript ? sendResult(guardDecision(msg, sender), sendResponse) : false;
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

async function computeState(settings) {
  let win;
  try {
    win = await chrome.windows.getLastFocused();
  } catch {
    win = null;
  }
  if (!win || !win.focused) return { domain: null, counting: false, tabId: null };

  const [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
  if (!tab || !tab.url || tab.incognito) return { domain: null, counting: false, tabId: null };

  const domain = domainOf(tab.url);
  if (!domain || isIgnoredDomain(domain, settings.ignore))
    return { domain: null, counting: false, tabId: null };

  // Idle check comes last, with one exception: an audible tab (video/music
  // playing) counts as active even with no keyboard/mouse input — otherwise
  // a Netflix binge would read as "idle" and never be tracked.
  // Callback form: promise-based idle.queryState needs Chrome 116+; the shim
  // works on every MV3 Chrome.
  const idleState = await new Promise((res) =>
    chrome.idle.queryState(clampIdle(settings.idleSeconds), res)
  );
  if (idleState !== "active" && !tab.audible)
    return { domain: null, counting: false, tabId: null };

  return { domain, counting: true, tabId: tab.id };
}

// A finished same-site run becomes a rabbit hole if it was long enough and in a
// doomscroll-prone category.
function finalizeRun(run, holes, day, settings) {
  if (!run || run.accum < HOLE_MIN_S) return;
  const cat = categorize(run.domain, settings.overrides);
  if (!HOLE_CATS.includes(cat)) return;
  holes[day] = holes[day] || [];
  if (holes[day].length >= 24) return; // sanity cap per day
  holes[day].push({ domain: run.domain, secs: run.accum, hour: new Date().getHours() });
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
function productCommand(action, payload, sender) { return withStore(() => doProductCommand(action, payload, sender)); }
function guardDecision(payload, sender) { return withStore(() => doGuardDecision(payload, sender)); }

async function doFlush() {
  const now = Date.now();
  const settings = await getSettings();
  const store = await chrome.storage.local.get([
    "session", "usage", "hours", "switches", "run", "holes", "sunsetLast", "wellnessState",
  ]);
  const usage = store.usage || {};
  const hours = store.hours || {};
  const switches = store.switches || {};
  const holes = store.holes || {};
  let run = store.run || null;
  let sunsetLast = store.sunsetLast || 0;
  const ws = store.wellnessState || { activeSecs: 0, lastWater: now, lastStand: now, eyeSnoozeUntil: 0 };
  const session = store.session;
  const day = dateKey(now);

  // A wall-clock gap since the previous flush means sleep/shutdown regardless
  // of whether the last session was counting — restart the wellness cycles.
  if (ws.lastFlush && now - ws.lastFlush > MAX_DELTA_S * 1000) {
    ws.activeSecs = 0;
    ws.lastWater = now;
    ws.lastStand = now;
  }
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
        finalizeRun(run, holes, day, settings); // a genuine pre-gap 25m+ run still counts
        run = null;
      }
      ws.activeSecs = 0;
      ws.lastWater = now;
      ws.lastStand = now;
    }
    if (delta > 0 && delta <= MAX_DELTA_S * 100) {
      // clamp: guards clock changes / long sleeps from inflating a bucket
      if (delta > MAX_DELTA_S) delta = MAX_DELTA_S;
      const hour = new Date(now).getHours();
      usage[day] = usage[day] || {};
      usage[day][session.domain] = (usage[day][session.domain] || 0) + delta;
      hours[day] = hours[day] || {};
      hours[day][hour] = (hours[day][hour] || 0) + delta;
      ws.activeSecs += delta;
      // rabbit-hole run accounting: extend or roll over the same-site run
      if (run && run.domain === session.domain) {
        run.accum += delta;
      } else {
        finalizeRun(run, holes, day, settings);
        run = { domain: session.domain, accum: delta };
      }
      await checkGoals(day, usage[day], settings);
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
      finalizeRun(run, holes, day, settings);
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
      notifySafe(`sunset-${now}`, "Digital sunset 🌆",
        sunsetNotificationMessage(state.domain, settings));
    }
  }

  // At most ONE break per flush — a second trigger in the same pass would
  // clobber the first overlay while its cycle was already consumed. A deferred
  // break's condition is preserved and fires on the next tick instead.
  let breakFired = false;

  // Heads-up pill ~1 minute before the eye break so the blur never surprises.
  const eyeThresh = clampMin(settings.eyeIntervalMin, 5, 120, 20) * 60;
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
    state.counting &&
    ws.activeSecs >= clampMin(settings.eyeIntervalMin, 5, 120, 20) * 60 &&
    now >= (ws.eyeSnoozeUntil || 0)
  ) {
    breakFired = true;
    ws.activeSecs = 0;
    ws.eyeSnoozeUntil = 0;
    triggerBreak(state, {
      kind: "eye",
      emoji: "👀",
      title: "20-20-20 eye break",
      body: "Look at something about 20 feet away for 20 seconds. Your eyes will thank you.",
      seconds: EYE_SECONDS,
      snoozeMin: clampMin(settings.eyeSnoozeMin, 1, 30, 5),
    }, "well-eye");
  }

  // Office Mode: water + stand reminders on their own cycles. Not gated on
  // browsing (being at the desk is the point — another app still counts), but
  // gated on system presence so a machine left awake overnight doesn't remind
  // an empty room every 50 minutes.
  if (settings.officeMode) {
    const present =
      (await new Promise((res) => chrome.idle.queryState(clampIdle(settings.idleSeconds), res))) ===
      "active";
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
          title: "Hydration check",
          body: "Time to drink some water. Small sips, big wins.",
        }, "well-water");
      }
      if (!breakFired && now - ws.lastStand >= clampMin(settings.standIntervalMin, 15, 240, 60) * 60000) {
        breakFired = true;
        ws.lastStand = now;
        triggerBreak(state, {
          kind: "stand",
          emoji: "🚶",
          title: "Stand up & stretch",
          body: "You've been at the desk a while — take a short walk.",
        }, "well-stand");
      }
    }
  }

  await chrome.storage.local.set({
    usage, hours, switches, holes, run, sunsetLast, wellnessState: ws,
    session: { domain: state.domain, counting: state.counting, start: now },
  });
}

function clampSunsetHour(n) {
  n = Number(n);
  return Number.isFinite(n) ? Math.max(20, Math.min(23, Math.round(n))) : 23;
}
function clampMin(n, lo, hi, dflt) {
  n = Number(n);
  return Number.isFinite(n) && n > 0 ? Math.max(lo, Math.min(hi, Math.round(n))) : dflt;
}

function notifySafe(id, title, message, buttons) {
  try {
    const opts = { type: "basic", iconUrl: "icon128.png", title, message, priority: 1 };
    if (buttons) opts.buttons = buttons;
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
async function triggerBreak(state, cfg, idPrefix) {
  if (state && state.tabId != null) {
    try {
      await chrome.tabs.sendMessage(state.tabId, { type: "SHOW_BREAK", cfg });
      return;
    } catch (_) {
      /* no content script on this page (chrome://, store, PDF) — fall back */
    }
  }
  // Stable id: a new reminder replaces its predecessor instead of stacking.
  notifySafe(idPrefix, `${cfg.emoji} ${cfg.title}`, cfg.body, [
    { title: cfg.kind === "eye" ? "Done" : "Done ✓" },
    { title: "Snooze" },
  ]);
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
    ws.activeSecs = clampMin(settings.eyeIntervalMin, 5, 120, 20) * 60;
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
  const kind = ["video", "shorts", "scroll"].includes(msg.kind) ? msg.kind : null;
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

async function checkGoals(day, usageDay, settings) {
  const goals = settings.goals || {};
  if (!Object.values(goals).some((v) => v > 0)) return;

  const catTotals = {};
  for (const [domain, secs] of Object.entries(usageDay)) {
    const cat = categorize(domain, settings.overrides);
    catTotals[cat] = (catTotals[cat] || 0) + secs;
  }

  const { notified = {} } = await chrome.storage.local.get("notified");
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
        `You've hit your ${mins}m ${cat} limit today (${fmt(catTotals[cat])} so far).`);
    }
  }
  if (changed) await chrome.storage.local.set({ notified });
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
  return value;
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

async function syncFocusAlarm(active, now) {
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

async function doGetFocusData() {
  const state = await loadAndReconcileFocus();
  return publicFocusData(state.active, state.sessions, state.now, state.historyValid);
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
    active = createFocusActive(payload, now, newFocusId());
  } else {
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

/* ---------- V2 plans, Spaces, Return Capsules and recovery ---------- */

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

function productTabRecord(tab) {
  try {
    const url = productUrl(tab.url);
    const rawTitle = typeof tab.title === "string" ? tab.title.trim() : "";
    return {
      url,
      title: productText((rawTitle || new URL(url).hostname).slice(0, PRODUCT_LIMITS.title), PRODUCT_LIMITS.title, true),
      pinned: tab.pinned === true,
      index: boundedNumber(tab.index, 0, 10000, 0),
    };
  } catch (_) { return null; }
}

async function currentWindowTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  return (Array.isArray(tabs) ? tabs : []).filter((tab) => !tab.incognito);
}

function checkpointInto(product, tabs, label, reason) {
  const records = tabs.map(productTabRecord).filter(Boolean);
  if (records.length > PRODUCT_LIMITS.tabsPerSpace) productFailure("PRODUCT_TAB_LIMIT");
  const checkpoint = sanitizeProductCheckpoint({
    id: newProductId("checkpoint"),
    label: productText(label || "Browser checkpoint", 80, true),
    tabs: records,
    createdAt: Date.now(),
    reason,
  });
  product.checkpoints = [checkpoint, ...product.checkpoints].slice(0, PRODUCT_LIMITS.checkpoints);
  return checkpoint;
}

async function restoreProductTabs(records, preserveCopies = false) {
  const existing = await chrome.tabs.query({});
  const keys = new Set();
  const existingCounts = new Map();
  for (const tab of existing || []) {
    const key = productUrlKey(tab.url);
    if (!key) continue;
    keys.add(key);
    existingCounts.set(key, (existingCounts.get(key) || 0) + 1);
  }
  const desiredCounts = new Map();
  let opened = 0;
  let skipped = 0;
  let failed = 0;
  for (const record of records) {
    const key = productUrlKey(record.url);
    if (!key) { skipped++; continue; }
    if (preserveCopies) {
      const desired = (desiredCounts.get(key) || 0) + 1;
      desiredCounts.set(key, desired);
      if (desired <= (existingCounts.get(key) || 0)) { skipped++; continue; }
    } else if (keys.has(key)) { skipped++; continue; }
    try {
      await chrome.tabs.create({ url: record.url, active: false, pinned: record.pinned === true });
      keys.add(key);
      opened++;
    } catch (_) { failed++; }
  }
  return { opened, skipped, failed };
}

function planById(product, id) {
  const plan = product.plans.find((item) => item.id === id);
  if (!plan) productFailure("PRODUCT_NOT_FOUND");
  return plan;
}

function spaceById(product, id) {
  const space = product.spaces.find((item) => item.id === id);
  if (!space) productFailure("PRODUCT_NOT_FOUND");
  return space;
}

function contractForTabs(product, plan, tabs) {
  const unrelated = tabs.filter((tab) => !tab.incognito && !tab.pinned && !productTabIsPlanned(tab, plan));
  const sourceUrls = [...plan.relevantUrls];
  if (plan.spaceId) {
    const space = product.spaces.find((item) => item.id === plan.spaceId);
    if (space) sourceUrls.push(...space.tabs.map((tab) => tab.url));
  }
  const currentKeys = new Set(tabs.map((tab) => productUrlKey(tab.url)).filter(Boolean));
  const open = [];
  const seen = new Set();
  for (const url of sourceUrls) {
    const key = productUrlKey(url);
    if (!key || currentKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    open.push({ url, domain: new URL(url).hostname });
  }
  return {
    planId: plan.id,
    planName: plan.name,
    intention: plan.intention,
    protection: plan.protection,
    restoreOnFinish: plan.restoreOnFinish,
    parkUnrelated: plan.parkUnrelated,
    unrelated: unrelated.map((tab) => ({
      id: tab.id,
      title: String(tab.title || "Untitled tab").slice(0, 120),
      domain: normalizeDomainInput(new URL(tab.url).hostname) || "site",
      url: tab.url,
    })),
    open,
  };
}

function recordRecovery(product, kind) {
  const day = dateKey(Date.now());
  const counts = product.recoveryByDay[day] || { shown: 0, returned: 0, continued: 0, saved: 0 };
  if (Object.hasOwn(counts, kind)) counts[kind] = Math.min(100000, counts[kind] + 1);
  product.recoveryByDay[day] = counts;
  const days = Object.keys(product.recoveryByDay).sort();
  for (const old of days.slice(0, Math.max(0, days.length - PRODUCT_LIMITS.recoveryDays))) delete product.recoveryByDay[old];
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

  if (action === "upsert-profile") {
    const incoming = isPlainObject(payload.profile) ? payload.profile : {};
    const id = incoming.id || newProductId("profile");
    const existing = product.profiles.find((profile) => profile.id === id);
    const profile = sanitizeProductProfile({
      id,
      name: incoming.name,
      color: incoming.color || PRODUCT_PROFILE_COLORS[product.profiles.length % PRODUCT_PROFILE_COLORS.length],
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    });
    if (!existing && product.profiles.length >= PRODUCT_LIMITS.profiles) productFailure("PRODUCT_INVALID_PROFILE");
    product.profiles = existing
      ? product.profiles.map((item) => item.id === id ? { ...profile, builtIn: item.builtIn } : item)
      : [...product.profiles, profile];
    await saveProductData(product);
    return publicProductData(product);
  }

  if (action === "set-profile") {
    const id = productId(payload.profileId, "profile");
    if (!product.profiles.some((profile) => profile.id === id)) productFailure("PRODUCT_NOT_FOUND");
    product.activeProfileId = id;
    await saveProductData(product);
    return publicProductData(product);
  }

  if (action === "delete-profile") {
    const id = productId(payload.profileId, "profile");
    const profile = product.profiles.find((item) => item.id === id);
    if (!profile || profile.builtIn) productFailure("PRODUCT_NOT_FOUND");
    const activePlan = product.activeContract && product.plans.find((item) => item.id === product.activeContract.planId);
    if (product.activeContract?.status === "active" && activePlan?.profileId === id) productFailure("PRODUCT_CONFIRM_REQUIRED");
    product.profiles = product.profiles.filter((item) => item.id !== id);
    product.plans = product.plans.filter((item) => item.profileId !== id);
    product.spaces = product.spaces.filter((item) => item.profileId !== id);
    product.capsules = product.capsules.filter((item) => item.profileId !== id);
    if (product.activeProfileId === id) product.activeProfileId = "profile_personal";
    await saveProductData(product);
    return publicProductData(product);
  }

  if (action === "upsert-plan") {
    const incoming = isPlainObject(payload.plan) ? payload.plan : {};
    const id = incoming.id || newProductId("plan");
    const existing = product.plans.find((plan) => plan.id === id);
    const plan = sanitizeProductPlan({
      ...incoming,
      id,
      profileId: currentProductProfile(product, incoming.profileId),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    });
    if (!existing && product.plans.length >= PRODUCT_LIMITS.plans) productFailure("PRODUCT_INVALID_PLAN");
    if (plan.spaceId && !product.spaces.some((space) => space.id === plan.spaceId)) productFailure("PRODUCT_NOT_FOUND");
    product.plans = existing ? product.plans.map((item) => item.id === id ? plan : item) : [plan, ...product.plans];
    await saveProductData(product);
    return publicProductData(product);
  }

  if (action === "delete-plan") {
    const id = productId(payload.planId, "plan");
    if (product.activeContract?.planId === id && product.activeContract.status === "active") productFailure("PRODUCT_CONFIRM_REQUIRED");
    product.plans = product.plans.filter((item) => item.id !== id);
    product.capsules = product.capsules.map((item) => item.planId === id ? { ...item, planId: "" } : item);
    if (product.activeContract?.planId === id) product.activeContract = null;
    await saveProductData(product);
    return publicProductData(product);
  }

  if (action === "save-space") {
    const incoming = isPlainObject(payload.space) ? payload.space : {};
    const tabs = await currentWindowTabs();
    const id = incoming.id || newProductId("space");
    const existing = product.spaces.find((space) => space.id === id);
    const space = sanitizeProductSpace({
      id,
      profileId: currentProductProfile(product, incoming.profileId),
      name: incoming.name,
      tabs: tabs.map(productTabRecord).filter(Boolean),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    });
    if (!existing && product.spaces.length >= PRODUCT_LIMITS.spaces) productFailure("PRODUCT_INVALID_SPACE");
    product.spaces = existing ? product.spaces.map((item) => item.id === id ? space : item) : [space, ...product.spaces];
    await saveProductData(product);
    return { ...(await publicProductData(product)), savedSpace: space };
  }

  if (action === "delete-space") {
    const id = productId(payload.spaceId, "space");
    product.spaces = product.spaces.filter((item) => item.id !== id);
    product.plans = product.plans.map((item) => item.spaceId === id ? { ...item, spaceId: "" } : item);
    await saveProductData(product);
    return publicProductData(product);
  }

  if (action === "restore-space") {
    const space = spaceById(product, productId(payload.spaceId, "space"));
    return { ...(await publicProductData(product)), restore: await restoreProductTabs(space.tabs) };
  }

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

  if (action === "contract-preview") {
    const plan = planById(product, productId(payload.planId, "plan"));
    return { ...(await publicProductData(product)), contract: contractForTabs(product, plan, await currentWindowTabs()) };
  }

  if (action === "start-plan") {
    const plan = planById(product, productId(payload.planId, "plan"));
    const tabs = await currentWindowTabs();
    const contract = contractForTabs(product, plan, tabs);
    const focusState = await loadAndReconcileFocus();
    if (focusState.active) focusFailure("FOCUS_ALREADY_ACTIVE");
    if (contract.parkUnrelated && contract.unrelated.length && payload.confirmed !== true) {
      return { ...(await publicProductData(product)), contract, requiresConfirmation: true };
    }
    const checkpoint = checkpointInto(product, tabs, `Before ${plan.name}`, "focus");
    // Persist the rollback point before opening or removing any tabs. If the
    // worker is interrupted mid-transition, recovery remains available.
    await saveProductData(product);
    if (plan.spaceId) await restoreProductTabs(spaceById(product, plan.spaceId).tabs);
    await restoreProductTabs(plan.relevantUrls.map((url, index) => ({ url, title: new URL(url).hostname, pinned: false, index })));
    if (contract.parkUnrelated && contract.unrelated.length) {
      await chrome.tabs.remove(contract.unrelated.map((tab) => tab.id));
    }
    const focusData = await doFocusCommand("start", {
      intention: plan.intention,
      successDefinition: plan.successDefinition,
      mode: plan.mode,
      targetMinutes: plan.targetMinutes,
    });
    product.activeProfileId = plan.profileId;
    product.activeContract = {
      planId: plan.id,
      checkpointId: checkpoint.id,
      startedAt: now,
      finishedAt: 0,
      restoreOnFinish: plan.restoreOnFinish,
      status: "active",
    };
    await saveProductData(product);
    return { ...(await publicProductData(product)), focus: focusData.focus, focusSessions: focusData.focusSessions, contract };
  }

  if (action === "restore-contract") {
    if (product.activeContract?.status !== "finished" || !product.activeContract.checkpointId) productFailure("PRODUCT_NOT_FOUND");
    const checkpoint = product.checkpoints.find((item) => item.id === product.activeContract.checkpointId);
    if (!checkpoint) productFailure("PRODUCT_NOT_FOUND");
    const restore = await restoreProductTabs(checkpoint.tabs, true);
    product.activeContract = null;
    await saveProductData(product);
    return { ...(await publicProductData(product)), restore };
  }

  if (action === "dismiss-contract") {
    if (product.activeContract?.status !== "finished") productFailure("PRODUCT_NOT_FOUND");
    product.activeContract = null;
    await saveProductData(product);
    return publicProductData(product);
  }

  if (action === "checkpoint") {
    const checkpoint = checkpointInto(product, await currentWindowTabs(), payload.label || "Manual checkpoint", "manual");
    await saveProductData(product);
    return { ...(await publicProductData(product)), checkpoint };
  }

  if (action === "restore-checkpoint") {
    const id = productId(payload.checkpointId, "checkpoint");
    const checkpoint = product.checkpoints.find((item) => item.id === id);
    if (!checkpoint) productFailure("PRODUCT_NOT_FOUND");
    return { ...(await publicProductData(product)), restore: await restoreProductTabs(checkpoint.tabs, true) };
  }

  if (action === "delete-checkpoint") {
    const id = productId(payload.checkpointId, "checkpoint");
    if (product.activeContract?.checkpointId === id) productFailure("PRODUCT_CHECKPOINT_IN_USE");
    product.checkpoints = product.checkpoints.filter((item) => item.id !== id);
    await saveProductData(product);
    return publicProductData(product);
  }

  if (action === "close-duplicates") {
    if (payload.confirmed !== true) productFailure("PRODUCT_CONFIRM_REQUIRED");
    const tabs = await currentWindowTabs();
    const groups = productDuplicateGroups(tabs);
    const remove = [];
    for (const group of groups) {
      const keeper = group.find((tab) => tab.active) || group[0];
      remove.push(...group.filter((tab) => tab.id !== keeper.id).map((tab) => tab.id));
    }
    if (!remove.length) return { ...(await publicProductData(product)), closed: 0 };
    checkpointInto(product, tabs, "Before closing duplicate tabs", "duplicates");
    await saveProductData(product);
    await chrome.tabs.remove(remove);
    return { ...(await publicProductData(product)), closed: remove.length };
  }

  if (action === "guard-shown") {
    recordRecovery(product, "shown");
    await saveProductData(product);
    return {};
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

async function returnToPlannedTab(plan, currentTab) {
  try {
    const tabs = await chrome.tabs.query({ windowId: currentTab.windowId });
    const target = tabs.find((tab) => tab.id !== currentTab.id && productTabIsPlanned(tab, plan));
    if (target) {
      await chrome.tabs.update(target.id, { active: true });
      return;
    }
    if (plan.relevantUrls[0]) await chrome.tabs.create({ url: plan.relevantUrls[0], active: true });
  } catch (_) {}
}

async function doGuardDecision(payload, sender) {
  const product = await loadProductData();
  const contract = product.activeContract;
  if (!contract || contract.status !== "active" || !sender?.tab) productFailure("PRODUCT_NOT_FOUND");
  const plan = planById(product, contract.planId);
  const domain = productDomain(new URL(sender.tab.url).hostname);
  const decision = ["return", "continue", "save"].includes(payload.decision) ? payload.decision : null;
  if (!decision) productFailure("PRODUCT_NOT_FOUND");
  if (decision === "continue") {
    const minutes = boundedNumber(payload.minutes, 1, 60, 10);
    product.guardBypasses[domain] = Date.now() + minutes * 60000;
    recordRecovery(product, "continued");
  } else if (decision === "save") {
    product.capsules = [sanitizeProductCapsule({
      id: newProductId("capsule"),
      profileId: plan.profileId,
      planId: plan.id,
      url: sender.tab.url,
      title: String(sender.tab.title || domain).slice(0, PRODUCT_LIMITS.title),
      note: "Saved during focus",
      status: "saved",
      savedAt: Date.now(),
      updatedAt: Date.now(),
    }), ...product.capsules].slice(0, PRODUCT_LIMITS.capsules);
    recordRecovery(product, "saved");
    await returnToPlannedTab(plan, sender.tab);
  } else {
    recordRecovery(product, "returned");
    await returnToPlannedTab(plan, sender.tab);
  }
  await saveProductData(product);
  return { decision };
}

const guardShownRecently = new Map();
async function maybeShowGuard(tab) {
  if (!tab || tab.incognito || !tab.active || typeof tab.url !== "string" || !/^https?:\/\//.test(tab.url)) return;
  const store = await chrome.storage.local.get(["focusActive", "product"]);
  const active = validStoredFocusActive(store.focusActive);
  if (!active || active.status !== "running") return;
  const product = sanitizeProductData(store.product);
  const contract = product.activeContract;
  if (!contract || contract.status !== "active") return;
  const plan = product.plans.find((item) => item.id === contract.planId);
  if (!plan || plan.protection !== "nudge" || productTabIsPlanned(tab, plan)) return;
  const domain = productDomain(new URL(tab.url).hostname);
  if ((product.guardBypasses[domain] || 0) > Date.now()) return;
  const key = `${active.id}:${tab.id}:${domain}`;
  if (Date.now() - (guardShownRecently.get(key) || 0) < 60000) return;
  guardShownRecently.set(key, Date.now());
  const response = await chrome.tabs.sendMessage(tab.id, {
    type: "SHOW_GUARD",
    cfg: {
      intention: active.intention,
      domain,
      reason: plan.blockedDomains.length && productDomainMatches(domain, plan.blockedDomains)
        ? "This site is on the plan’s pause list."
        : "This site is outside the current Focus Contract.",
    },
  });
  if (response?.shown === true) await productCommand("guard-shown", { domain }, null);
}

async function checkScheduledPlans() {
  const product = await loadProductData();
  const { focusActive } = await chrome.storage.local.get("focusActive");
  if (validStoredFocusActive(focusActive)) return;
  const now = new Date();
  const minute = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const promptKey = `${dateKey(now.getTime())}T${minute}`;
  const todayPrefix = `${dateKey(now.getTime())}T`;
  let remaining = Math.max(0, product.preferences.notificationBudget -
    Object.values(product.schedulePrompts).filter((key) => key.startsWith(todayPrefix)).length);
  if (!remaining) return;
  let changed = false;
  for (const plan of product.plans) {
    if (!remaining || !plan.schedule.enabled || plan.schedule.time !== minute ||
        !plan.schedule.days.includes(now.getDay()) || product.schedulePrompts[plan.id] === promptKey) continue;
    try {
      await chrome.notifications.create(`plan-schedule:${plan.id}`, {
        type: "basic",
        iconUrl: "icon128.png",
        title: "Your scheduled focus plan is ready",
        message: "Open Tabyss to review the plan before anything changes.",
        priority: 0,
      });
      product.schedulePrompts[plan.id] = promptKey;
      remaining--;
      changed = true;
    } catch (_) {}
  }
  if (changed) await saveProductData(product);
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
  const history = readFocusHistory(store.focusSessions);
  if (!history.valid) {
    if (pruned) await chrome.storage.local.set(out);
    return;
  }
  const focusSessions = pruneFocusHistory(history.sessions, days);
  const storedFocusCount = Array.isArray(store.focusSessions) ? store.focusSessions.length : 0;
  const focusChanged = focusSessions.length !== storedFocusCount ||
    (store.focusSessions != null && !Array.isArray(store.focusSessions));
  if (focusChanged) out.focusSessions = focusSessions;
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
  await chrome.storage.local.set({ ...store, run: null, session: null });
}

/* Restore/clear are serialized with tracking writes. Imports are revalidated in
 * this trusted context even when the options page already showed a preview. */
async function doImportData(data) {
  const result = validateImportData(data);
  const { focusActive } = await chrome.storage.local.get("focusActive");
  if (validStoredFocusActive(focusActive)) focusFailure("FOCUS_IMPORT_ACTIVE");
  if (focusActive) {
    await chrome.storage.local.set({ focusActive: null });
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
  await chrome.alarms.clear("focus-end");
  await chrome.storage.local.clear();
  await chrome.storage.local.set({ meta: { schemaVersion: SCHEMA_VERSION } });
}

// Rebuild the one-shot focus alarm whenever MV3 evaluates a fresh worker.
// The alarm is only a wake-up hint; timestamps remain the source of truth.
reconcileFocus().catch(() => {});
