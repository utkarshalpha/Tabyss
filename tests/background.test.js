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
  doMaintenance, doResetToday, doProductCommand, doGuardDecision, checkScheduledPlans
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
  assert.equal(exported.data.formatVersion, 4);
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

test("Focus Contracts preview changes and persist recovery before parking tabs", async () => {
  delete storageState.product;
  storageState.focusActive = null;
  storageState.focusSessions = [];
  state.productAtRemove = null;
  state.tabs = [
    { id: 21, windowId: 1, index: 0, active: true, pinned: false, incognito: false, title: "Brief", url: "https://docs.example.com/brief" },
    { id: 22, windowId: 1, index: 1, active: false, pinned: false, incognito: false, title: "Video", url: "https://youtube.com/watch?v=1" },
  ];
  const saved = await api.doProductCommand("upsert-plan", inContext({ plan: {
    profileId: "profile_work",
    name: "Launch focus",
    intention: "Finish the launch brief",
    successDefinition: "Decision-ready draft",
    mode: "timer",
    targetMinutes: 25,
    protection: "nudge",
    allowedDomains: ["docs.example.com"],
    blockedDomains: [],
    relevantUrls: ["https://docs.example.com/brief"],
    parkUnrelated: true,
    restoreOnFinish: true,
    schedule: { enabled: false, days: [], time: "09:00" },
  } }));
  const planId = saved.product.plans[0].id;
  const preview = await api.doProductCommand("contract-preview", inContext({ planId }));
  assert.equal(preview.contract.unrelated.length, 1);
  assert.equal(preview.contract.unrelated[0].domain, "youtube.com");

  const notConfirmed = await api.doProductCommand("start-plan", inContext({ planId }));
  assert.equal(notConfirmed.requiresConfirmation, true);
  assert.equal(state.tabs.length, 2);

  const started = await api.doProductCommand("start-plan", inContext({ planId, confirmed: true }));
  assert.equal(started.focus.status, "running");
  assert.equal(state.tabs.some((tab) => tab.id === 22), false);
  assert.ok(state.productAtRemove?.checkpoints?.length > 0, "checkpoint must be durable before tab removal");
  assert.equal(storageState.product.activeContract.planId, planId);
  assert.equal(storageState.product.activeContract.status, "active");

  await api.doFocusCommand("complete", inContext({ note: "Done" }));
  assert.equal(storageState.product.activeContract.status, "finished");
  state.tabs = null;
});

test("guard decisions preserve agency, save detours and return to a planned tab", async () => {
  const plan = storageState.product.plans[0];
  state.tabs = [
    { id: 31, windowId: 1, index: 0, active: false, pinned: false, incognito: false, title: "Brief", url: "https://docs.example.com/brief" },
    { id: 32, windowId: 1, index: 1, active: true, pinned: false, incognito: false, title: "Interesting video", url: "https://youtube.com/watch?v=2" },
  ];
  await api.doFocusCommand("start", inContext({ intention: plan.intention, mode: "timer", targetMinutes: 25 }));
  storageState.product.activeContract = {
    planId: plan.id,
    checkpointId: storageState.product.checkpoints[0].id,
    startedAt: Date.now(),
    finishedAt: 0,
    restoreOnFinish: true,
    status: "active",
  };
  const sender = inContext({ tab: state.tabs[1] });
  await api.doGuardDecision(inContext({ decision: "continue", minutes: 10 }), sender);
  assert.ok(storageState.product.guardBypasses["youtube.com"] > Date.now());
  const latestRecovery = Object.entries(storageState.product.recoveryByDay).sort().at(-1)[1];
  assert.equal(latestRecovery.continued, 1);

  await api.doGuardDecision(inContext({ decision: "save" }), sender);
  assert.equal(storageState.product.capsules[0].url, "https://youtube.com/watch?v=2");
  assert.equal(storageState.product.capsules[0].note, "Saved during focus");
  assert.equal(state.tabs.find((tab) => tab.id === 31).active, true);
  await api.doFocusCommand("complete", inContext({}));
  state.tabs = null;
});

test("reset today clears local recovery outcomes without stranding workspace recovery", async () => {
  const plan = storageState.product.plans[0];
  const recoveryDay = Object.keys(storageState.product.recoveryByDay).sort().at(-1);
  await api.doFocusCommand("start", inContext({ intention: plan.intention, mode: "timer", targetMinutes: 25 }));
  storageState.product.activeContract = {
    ...storageState.product.activeContract,
    status: "active",
    startedAt: Date.now(),
    finishedAt: 0,
  };
  await api.doResetToday();
  assert.equal(storageState.product.recoveryByDay[recoveryDay], undefined);
  assert.equal(storageState.product.activeContract.status, "finished");
  assert.ok(storageState.product.activeContract.finishedAt > 0);
});

test("local plan schedules obey the per-day notification budget and de-duplicate", async () => {
  state.notifications = [];
  storageState.focusActive = null;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  await api.doProductCommand("upsert-plan", inContext({ plan: {
    profileId: "profile_personal",
    name: "Scheduled focus",
    intention: "Start the planned block",
    mode: "timer",
    targetMinutes: 25,
    protection: "observe",
    allowedDomains: [],
    blockedDomains: [],
    relevantUrls: [],
    parkUnrelated: false,
    restoreOnFinish: true,
    schedule: { enabled: true, days: [now.getDay()], time },
  } }));
  await api.checkScheduledPlans();
  await api.checkScheduledPlans();
  assert.equal(state.notifications.filter((item) => item.id.startsWith("plan-schedule:")).length, 1);
});

test("duplicate cleanup also persists its checkpoint before removing a tab", async () => {
  state.productAtRemove = null;
  state.tabs = [
    { id: 61, windowId: 1, index: 0, active: true, pinned: false, incognito: false, title: "Reference", url: "https://example.com/reference#top" },
    { id: 62, windowId: 1, index: 1, active: false, pinned: false, incognito: false, title: "Reference copy", url: "https://example.com/reference#notes" },
  ];
  const result = await api.doProductCommand("close-duplicates", inContext({ confirmed: true }));
  assert.equal(result.closed, 1);
  assert.equal(state.productAtRemove.checkpoints[0].reason, "duplicates");
  assert.equal(state.tabs.length, 1);
  const restored = await api.doProductCommand("restore-checkpoint", inContext({ checkpointId: result.product.checkpoints[0].id }));
  assert.equal(restored.restore.opened, 1);
  assert.equal(state.tabs.length, 2);
  state.tabs = null;
});

test("recovery refuses incomplete checkpoints and deletion of a checkpoint in use", async () => {
  const checkpointId = storageState.product.activeContract.checkpointId;
  await assert.rejects(
    api.doProductCommand("delete-checkpoint", inContext({ checkpointId })),
    (error) => error.code === "PRODUCT_CHECKPOINT_IN_USE"
  );
  state.tabs = Array.from({ length: 101 }, (_, index) => ({
    id: 500 + index,
    windowId: 1,
    index,
    active: index === 0,
    pinned: false,
    incognito: false,
    title: `Tab ${index}`,
    url: `https://example${index}.com/page`,
  }));
  await assert.rejects(
    api.doProductCommand("checkpoint", inContext({ label: "Too many tabs" })),
    (error) => error.code === "PRODUCT_TAB_LIMIT"
  );
  state.tabs = null;
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
