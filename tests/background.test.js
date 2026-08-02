const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const common = fs.readFileSync(path.join(__dirname, "..", "common.js"), "utf8");
const background = fs.readFileSync(path.join(__dirname, "..", "background.js"), "utf8");
const listeners = {};
const state = {
  window: { id: 1, focused: true },
  tab: { id: 7, active: true, url: "https://example.com/work", audible: false, incognito: false },
  idle: "active",
  accessLevels: [],
};
const event = (name) => ({ addListener: (listener) => { listeners[name] = listener; } });
const local = {
  get: async () => ({}),
  set: async () => {},
  clear: async () => {},
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
  alarms: { onAlarm: event("alarm"), create: () => {} },
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

const context = vm.createContext({ URL, Date, console, chrome, window: {}, importScripts: () => {} });
vm.runInContext(`${common}\n${background}\n;globalThis.__backgroundTest = {
  isExtensionPageSender, isContentScriptSender, computeState,
  recapNotificationMessage, sunsetNotificationMessage
};`, context);
const api = context.__backgroundTest;

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
