const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

const common = fs.readFileSync(path.join(__dirname, "..", "common.js"), "utf8");
const background = fs.readFileSync(path.join(__dirname, "..", "background.js"), "utf8");
const listeners = {};
const state = {
  window: { id: 1, focused: true },
  tab: { id: 7, active: true, url: "https://example.com/work", audible: false, incognito: false },
  idle: "active",
  accessLevels: [],
  alarms: {},
  warnings: [],
};
const testConsole = Object.create(console);
testConsole.warn = (...args) => state.warnings.push(args.join(" "));
const event = (name) => ({ addListener: (listener) => { listeners[name] = listener; } });
const storageState = {};
let context;
const cloneForContext = (value) => context
  ? vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(value))})`, context)
  : value;
const local = {
  get: async (keys) => {
    if (keys == null) return cloneForContext({ ...storageState });
    const list = Array.isArray(keys) ? keys : [keys];
    return cloneForContext(Object.fromEntries(
      list.filter((key) => Object.hasOwn(storageState, key)).map((key) => [key, storageState[key]])
    ));
  },
  set: async (patch) => { Object.assign(storageState, patch); },
  clear: async () => { for (const key of Object.keys(storageState)) delete storageState[key]; },
  setAccessLevel: async (options) => { state.accessLevels.push(options.accessLevel); },
};
const chrome = {
  runtime: {
    id: "tabyss-test",
    getURL: (value) => `chrome-extension://tabyss-test/${String(value || "").replace(/^\//, "")}`,
    onInstalled: event("installed"),
    onStartup: event("startup"),
    onMessage: event("message"),
  },
  storage: { local },
  notifications: {
    onClicked: event("notification-click"),
    onButtonClicked: event("notification-button"),
    create: () => {},
    clear: () => {},
  },
  alarms: {
    onAlarm: event("alarm"),
    create: async (name, options) => { state.alarms[name] = options; },
    clear: async (name) => delete state.alarms[name],
    get: async (name) => state.alarms[name] || null,
  },
  tabs: {
    onActivated: event("tab-activated"),
    onUpdated: event("tab-updated"),
    query: async () => [state.tab],
    create: () => {},
    sendMessage: async () => {},
  },
  windows: {
    onFocusChanged: event("window-focus"),
    getLastFocused: async () => state.window,
  },
  idle: {
    onStateChanged: event("idle"),
    setDetectionInterval: () => {},
    queryState: (_seconds, callback) => callback(state.idle),
  },
};

context = vm.createContext({ URL, Date, console: testConsole, chrome, crypto: webcrypto, window: {}, importScripts: () => {} });
vm.runInContext(`${common}\n${background}\n;globalThis.__backgroundTest = {
  isExtensionPageSender, isContentScriptSender, computeState,
  recapNotificationMessage, sunsetNotificationMessage,
  doFocusCommand, doGetFocusData, doImportData, doExportData,
  doMaintenance, doResetToday
};`, context);
const api = context.__backgroundTest;
const inContext = (value) => vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(value))})`, context);

test("raw extension storage is restricted to trusted contexts", () => {
  assert.deepEqual(state.accessLevels, ["TRUSTED_CONTEXTS"]);
});

test("sender classification accepts extension tabs and rejects incognito content", () => {
  const extensionTab = {
    id: "tabyss-test",
    url: "chrome-extension://tabyss-test/options.html",
    tab: { id: 9 },
  };
  assert.equal(api.isExtensionPageSender(extensionTab), true);
  assert.equal(api.isContentScriptSender(extensionTab), false);
  assert.equal(api.isContentScriptSender({
    id: "tabyss-test", url: "https://example.com/", tab: { id: 9, incognito: false },
  }), true);
  assert.equal(api.isContentScriptSender({
    id: "tabyss-test", url: "https://example.com/", tab: { id: 9, incognito: true },
  }), false);
  assert.equal(api.isExtensionPageSender({
    id: "different-extension", url: "chrome-extension://tabyss-test/options.html",
  }), false);
});

test("foreground state excludes incognito and ignored subdomains", async () => {
  state.tab = { id: 7, active: true, url: "https://mail.example.com/inbox", audible: false, incognito: true };
  assert.deepEqual(JSON.parse(JSON.stringify(await api.computeState({ idleSeconds: 60, ignore: [] }))), {
    domain: null, counting: false, tabId: null,
  });

  state.tab.incognito = false;
  assert.deepEqual(JSON.parse(JSON.stringify(await api.computeState({ idleSeconds: 60, ignore: ["example.com"] }))), {
    domain: null, counting: false, tabId: null,
  });

  state.tab.url = "https://evil-example.com/";
  assert.deepEqual(JSON.parse(JSON.stringify(await api.computeState({ idleSeconds: 60, ignore: ["example.com"] }))), {
    domain: "evil-example.com", counting: true, tabId: 7,
  });
});

test("notification copy redacts domains unless the user opts in", () => {
  const top = ["private.example", 1200];
  assert.equal(api.recapNotificationMessage(3600, 82, top, { notificationDetails: false }).includes("private.example"), false);
  assert.equal(api.recapNotificationMessage(3600, 82, top, { notificationDetails: true }).includes("private.example"), true);
  assert.equal(api.sunsetNotificationMessage("private.example", { notificationDetails: false }).includes("private.example"), false);
  assert.equal(api.sunsetNotificationMessage("private.example", { notificationDetails: true }).includes("private.example"), true);
});

test("runtime message listener is installed", () => {
  assert.equal(typeof listeners.message, "function");
});

test("focus commands persist active state, schedule recovery and export outcomes", async () => {
  delete storageState.focusActive;
  delete storageState.focusSessions;
  delete state.alarms["focus-end"];

  const started = await api.doFocusCommand("start", inContext({
    intention: "Write the launch brief",
    successDefinition: "Draft shared",
    mode: "timer",
    targetMinutes: 25,
  }));
  assert.equal(started.focus.status, "running");
  assert.equal(storageState.focusActive.intention, "Write the launch brief");
  assert.ok(state.alarms["focus-end"].when > Date.now());

  const recovered = await api.doGetFocusData();
  assert.equal(recovered.focus.id, started.focus.id);
  const dueAt = Date.now() - 25 * 60000 - 1000;
  storageState.focusActive.startedAt = dueAt;
  storageState.focusActive.segmentStartedAt = dueAt;
  storageState.focusActive.updatedAt = dueAt;
  const review = await api.doGetFocusData();
  assert.equal(review.focus.status, "review");
  assert.equal(review.focus.reviewReason, "timer");
  assert.equal(state.alarms["focus-end"], undefined);
  await assert.rejects(
    api.doImportData(inContext({ exportedFrom: "Tabyss", usage: {} })),
    (error) => error.code === "FOCUS_IMPORT_ACTIVE"
  );

  const completed = await api.doFocusCommand("complete", inContext({ note: "Shared with the team" }));
  assert.equal(completed.focus, null);
  assert.equal(completed.focusSessions.length, 1);
  assert.equal(completed.focusSessions[0].outcome, "completed");
  assert.equal(state.alarms["focus-end"], undefined);

  const exported = await api.doExportData();
  assert.equal(exported.data.formatVersion, 3);
  assert.equal(exported.data.focusSessions[0].note, "Shared with the team");
});

test("retention and reset-today also govern focus outcomes and active state", async () => {
  const recent = JSON.parse(JSON.stringify(storageState.focusSessions[0]));
  const old = {
    ...recent,
    id: "old_focus_session_001",
    startedAt: Date.UTC(2024, 0, 2, 9),
    endedAt: Date.UTC(2024, 0, 2, 10),
    day: "2024-01-02",
  };
  storageState.focusSessions = [old, recent];
  storageState.settings = { retentionDays: 30 };
  await api.doMaintenance();
  assert.equal(storageState.focusSessions.length, 1);
  assert.equal(storageState.focusSessions[0].id, recent.id);

  await api.doFocusCommand("start", inContext({ intention: "Reset test", mode: "stopwatch" }));
  assert.ok(storageState.focusActive);
  await api.doResetToday();
  assert.equal(storageState.focusActive, null);
  assert.equal(storageState.focusSessions.length, 0);
  assert.equal(state.alarms["focus-end"], undefined);
});

test("corrupt focus history fails closed instead of being overwritten", async () => {
  const warningsBefore = state.warnings.length;
  storageState.focusSessions = [{ injected: true }];
  const before = JSON.stringify(storageState.focusSessions);
  await assert.rejects(
    api.doFocusCommand("start", inContext({ intention: "Must not overwrite", mode: "stopwatch" })),
    (error) => error.code === "FOCUS_HISTORY_CORRUPT"
  );
  await api.doMaintenance();
  assert.equal(JSON.stringify(storageState.focusSessions), before);
  assert.ok(state.warnings.length > warningsBefore);
  storageState.focusSessions = [];
});
