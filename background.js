/* Tabyss — background service worker (v1.3)
 *
 * On-device tracking: time per domain/day/hour, site switches, rabbit-hole
 * runs, media accounting (video / shorts / feed-scroll via content-script
 * beats), category goals, 20-20-20 eye breaks, and Office Mode water/stand
 * reminders. Nothing ever leaves the machine — there is no network call
 * anywhere.
 */

importScripts("common.js");

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

function setup() {
  restrictStorageAccess();
  getSettings().then((s) => chrome.idle.setDetectionInterval(clampIdle(s.idleSeconds)));
  chrome.alarms.create("tick", { periodInMinutes: 1 });
  chrome.alarms.create("maintenance", { periodInMinutes: 360 }); // prune every 6h
  maintenance();
  flush(); // start a session immediately so tracking begins on install/startup
}
function clampIdle(n) {
  return Math.max(15, Math.min(600, Number(n) || 60));
}

chrome.runtime.onInstalled.addListener((details) => {
  chrome.storage.local.get("meta").then(({ meta }) => {
    if (!meta) chrome.storage.local.set({ meta: { schemaVersion: SCHEMA_VERSION } });
  });
  setup();
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  }
});
chrome.runtime.onStartup.addListener(setup);
restrictStorageAccess();

// Clicking a Tabyss notification opens the dashboard.
chrome.notifications.onClicked.addListener((id) => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
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
  if (a.name === "tick") flush();
  else if (a.name === "maintenance") maintenance();
});
chrome.tabs.onActivated.addListener(() => flush());
chrome.tabs.onUpdated.addListener((_id, info, tab) => {
  if (info.url && tab.active) flush();
});
chrome.windows.onFocusChanged.addListener(() => flush());
chrome.idle.onStateChanged.addListener(() => flush());

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
    sendResponse({ ok: false, error: "The request could not be completed safely." });
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

/* ---------- housekeeping & reset ---------- */

// Periodic housekeeping: prune all date-keyed maps beyond the retention window.
async function doMaintenance() {
  const settings = await getSettings();
  const store = await chrome.storage.local.get([
    "usage", "hours", "notified", "switches", "holes", "media", "wellness",
  ]);
  const days = settings.retentionDays;
  let pruned = 0;
  const out = {};
  for (const key of ["usage", "hours", "notified", "switches", "holes", "media", "wellness"]) {
    const map = store[key] || {};
    pruned += pruneByRetention(map, days);
    out[key] = map;
  }
  if (pruned) await chrome.storage.local.set(out);
}

/* Reset today's data — runs in the worker, inside the mutex, and clears the
 * live session/run so the deleted day can't partially reappear on next tick. */
async function doResetToday() {
  const day = dateKey(Date.now());
  const store = await chrome.storage.local.get([
    "usage", "hours", "switches", "holes", "notified", "media", "wellness",
  ]);
  for (const k of ["usage", "hours", "switches", "holes", "notified", "media", "wellness"]) {
    if (store[k]) delete store[k][day];
  }
  await chrome.storage.local.set({ ...store, run: null, session: null });
}

/* Restore/clear are serialized with tracking writes. Imports are revalidated in
 * this trusted context even when the options page already showed a preview. */
async function doImportData(data) {
  const result = validateImportData(data);
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
  await chrome.storage.local.clear();
  await chrome.storage.local.set({ meta: { schemaVersion: SCHEMA_VERSION } });
}
