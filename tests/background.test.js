const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

const common = fs.readFileSync(path.join(__dirname, "..", "common.js"), "utf8");
const product = fs.readFileSync(path.join(__dirname, "..", "product.js"), "utf8");
const background = fs.readFileSync(path.join(__dirname, "..", "background.js"), "utf8");
const listeners = {};
const state = {
  window: { id: 1, focused: true },
  tab: { id: 7, active: true, url: "https://example.com/work", audible: false, incognito: false },
  idle: "active",
  accessLevels: [],
  alarms: {},
  warnings: [],
  notifications: [],
  productAtRemove: null,
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
  commands: { onCommand: event("command") },
  sidePanel: { open: async () => {} },
  storage: { local },
  notifications: {
    onClicked: event("notification-click"),
    onButtonClicked: event("notification-button"),
    create: async (id, options) => { state.notifications.push({ id, options }); },
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
    query: async () => state.tabs || [state.tab],
    get: async () => state.tab,
    create: async (options = {}) => {
      if (!state.tabs) return;
      state.tabs.push({ id: 100 + state.tabs.length, windowId: 1, index: state.tabs.length, active: options.active === true, pinned: options.pinned === true, incognito: false, title: options.url, url: options.url });
    },
    update: async (id, options = {}) => {
      if (!state.tabs) return;
      for (const tab of state.tabs) tab.active = tab.id === id ? options.active === true : options.active === true ? false : tab.active;
    },
    remove: async (ids) => {
      state.productAtRemove = JSON.parse(JSON.stringify(storageState.product || null));
      if (state.tabs) state.tabs = state.tabs.filter((tab) => ![].concat(ids).includes(tab.id));
    },
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
vm.runInContext(`${common}\n${product}\n${background}\n;globalThis.__backgroundTest = {
  isExtensionPageSender, isContentScriptSender, computeState,
  recapNotificationMessage, sunsetNotificationMessage,
  doFocusCommand, doGetFocusData, doImportData, doExportData,
  doFlush, doMaintenance, doResetToday, doProductCommand, ACTIVE_PRODUCT_ACTIONS
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

test("runtime mutation surface is limited to Saved pages", () => {
  assert.deepEqual([...api.ACTIVE_PRODUCT_ACTIONS].sort(), ["delete-capsule", "save-capsule", "update-capsule"]);
});

test("Saved pages bounds site titles, completes the lifecycle and rejects private or unsafe captures", async () => {
  delete storageState.product;
  state.tabs = null;
  const originalTab = state.tab;
  const longTitle = "utkarshalpha/Tabyss: Privacy-first browser extension — your browsing personality, computed on-device. Zero network requests.";
  state.tab = { id: 7, active: true, url: "https://github.com/utkarshalpha/Tabyss", title: longTitle, incognito: false };
  try {
    const saved = await api.doProductCommand("save-capsule", inContext({ note: "Read after lunch" }));
    const page = JSON.parse(JSON.stringify(saved.savedCapsule));
    assert.equal(page.title.length, 120);
    assert.equal(longTitle.startsWith(page.title), true);
    assert.equal(page.note, "Read after lunch");
    assert.equal(page.status, "saved");

    const completed = await api.doProductCommand("update-capsule", inContext({
      capsuleId: page.id,
      status: "done",
      note: page.note,
    }));
    assert.equal(completed.product.capsules[0].status, "done");

    await api.doProductCommand("delete-capsule", inContext({ capsuleId: page.id }));
    assert.equal(storageState.product.capsules.length, 0);

    state.tab = { ...state.tab, incognito: true };
    await assert.rejects(api.doProductCommand("save-capsule", inContext({ note: "private" })), /PRODUCT_PRIVATE_PAGE/);

    state.tab = { ...state.tab, incognito: false, url: "chrome://settings" };
    await assert.rejects(api.doProductCommand("save-capsule", inContext({ note: "unsupported" })), /PRODUCT_INVALID_URL/);

    state.tab = { ...state.tab, url: "https://example.com/" };
    await assert.rejects(
      api.doProductCommand("save-capsule", inContext({ note: "x".repeat(241) })),
      /PRODUCT_INVALID_NOTE/
    );
    assert.equal(storageState.product.capsules.length, 0);
  } finally {
    state.tab = originalTab;
    state.tabs = null;
    delete storageState.product;
  }
});

test("focus commands persist active state, schedule recovery and export outcomes", async () => {
  delete storageState.focusActive;
  delete storageState.focusSessions;
  delete state.alarms["focus-end"];
  state.tabs = null;
  state.tab = { id: 7, active: true, url: "https://docs.example.com/brief", audible: false, incognito: false };

  const started = await api.doFocusCommand("start", inContext({
    intention: "Write the launch brief",
    successDefinition: "Draft shared",
    mode: "timer",
    targetMinutes: 25,
  }));
  assert.equal(started.focus.status, "running");
  assert.deepEqual(JSON.parse(JSON.stringify(started.focus.visitedDomains)), ["docs.example.com"]);
  assert.equal(storageState.focusActive.intention, "Write the launch brief");
  assert.ok(state.alarms["focus-end"].when > Date.now());

  storageState.session = { domain: "research.example.com", counting: true, start: Date.now() - 5000 };
  state.tab.url = "https://youtube.com/watch?v=1";
  await api.doFlush();
  assert.deepEqual(JSON.parse(JSON.stringify(storageState.focusActive.visitedDomains)), ["docs.example.com", "research.example.com"]);
  const recovered = await api.doGetFocusData();
  assert.equal(recovered.focus.id, started.focus.id);
  assert.deepEqual(JSON.parse(JSON.stringify(recovered.focus.visitedDomains)), ["docs.example.com", "research.example.com", "youtube.com"]);
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
  assert.deepEqual(JSON.parse(JSON.stringify(completed.focusSessions[0].visitedDomains)), ["docs.example.com", "research.example.com", "youtube.com"]);
  assert.equal(state.alarms["focus-end"], undefined);

  const exported = await api.doExportData();
  assert.equal(exported.data.formatVersion, 4);
  assert.equal(exported.data.focusSessions[0].note, "Shared with the team");
  assert.deepEqual(JSON.parse(JSON.stringify(exported.data.focusSessions[0].visitedDomains)), ["docs.example.com", "research.example.com", "youtube.com"]);
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
