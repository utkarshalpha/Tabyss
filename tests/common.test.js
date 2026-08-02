const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "common.js"), "utf8");
const productSource = fs.readFileSync(path.join(__dirname, "..", "product.js"), "utf8");
const context = vm.createContext({
  URL,
  Date,
  console,
  window: { matchMedia: () => ({ matches: false }) },
  chrome: {
    runtime: { getURL: (value) => `chrome-extension://tabyss${value}` },
    storage: { local: { get: async () => ({}) } },
  },
});
vm.runInContext(`${source}\n${productSource}\n;globalThis.__tabyssTest = {
  normalizeDomainInput, isIgnoredDomain, sanitizeSettings, validateImportData,
  buildExportPayload, faviconUrl, EXPORT_SCHEMA_VERSION
};`, context);

const api = context.__tabyssTest;
const jsonInContext = (value) => vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(value))})`, context);
const rawJsonInContext = (value) => vm.runInContext(`JSON.parse(${JSON.stringify(value)})`, context);
const plain = (value) => JSON.parse(JSON.stringify(value));

test("favicon URLs use Chrome's local cache for exact web pages", () => {
  const exact = new URL(api.faviconUrl("https://docs.example.com/brief?mode=review", 24));
  assert.equal(exact.protocol, "chrome-extension:");
  assert.equal(exact.pathname, "/_favicon/");
  assert.equal(exact.searchParams.get("pageUrl"), "https://docs.example.com/brief?mode=review");
  assert.equal(exact.searchParams.get("size"), "24");
  assert.equal(new URL(api.faviconUrl("www.Example.com", 32)).searchParams.get("pageUrl"), "https://example.com/");
  assert.equal(api.faviconUrl("chrome://settings", 32), null);
});

test("domain input is canonical and ignore rules respect label boundaries", () => {
  assert.equal(api.normalizeDomainInput("https://www.Google.com:443/a?q=1"), "google.com");
  assert.equal(api.normalizeDomainInput("MAIL.Google.com."), "mail.google.com");
  assert.equal(api.normalizeDomainInput("not a domain"), null);
  assert.equal(api.isIgnoredDomain("mail.google.com", jsonInContext(["google.com"])), true);
  assert.equal(api.isIgnoredDomain("google.com", jsonInContext(["google.com"])), true);
  assert.equal(api.isIgnoredDomain("evil-google.com", jsonInContext(["google.com"])), false);
  assert.equal(api.isIgnoredDomain("docs.google.com", jsonInContext(["mail.google.com"])), false);
});

test("settings are allowlisted, bounded and private by default", () => {
  const settings = plain(api.sanitizeSettings(jsonInContext({
    theme: "midnight",
    idleSeconds: 2,
    retentionDays: 99999,
    notificationDetails: "yes",
    ignore: ["https://www.example.com/path", "example.com", "mail.example.com"],
    goals: { Social: 5000, Other: 12, Unknown: 1 },
    overrides: { "www.example.com": "Education", "bad.test": "Unknown" },
    injected: true,
  })));
  assert.equal(settings.theme, "system");
  assert.equal(settings.idleSeconds, 15);
  assert.equal(settings.retentionDays, 3650);
  assert.equal(settings.notificationDetails, false);
  assert.deepEqual(settings.ignore, ["example.com", "mail.example.com"]);
  assert.deepEqual(settings.goals, { Social: 1440 });
  assert.deepEqual(settings.overrides, { "example.com": "Education" });
  assert.equal(Object.hasOwn(settings, "injected"), false);
});

test("appearance accepts only system, light and dark", () => {
  for (const theme of ["system", "light", "dark"]) {
    assert.equal(plain(api.sanitizeSettings(jsonInContext({ theme }))).theme, theme);
  }
  assert.equal(plain(api.sanitizeSettings(jsonInContext({ theme: true }))).theme, "system");
});

test("appearance applies and removes explicit root themes", () => {
  const result = plain(vm.runInContext(`(() => {
    globalThis.document = { documentElement: { dataset: {}, style: {} } };
    applyTheme("dark");
    const dark = { theme: document.documentElement.dataset.theme, scheme: document.documentElement.style.colorScheme };
    applyTheme("light");
    const light = { theme: document.documentElement.dataset.theme, scheme: document.documentElement.style.colorScheme };
    applyTheme("system");
    const system = { hasTheme: Object.hasOwn(document.documentElement.dataset, "theme"), scheme: document.documentElement.style.colorScheme };
    delete globalThis.document;
    return { dark, light, system };
  })()`, context));
  assert.deepEqual(result, {
    dark: { theme: "dark", scheme: "dark" },
    light: { theme: "light", scheme: "light" },
    system: { hasTheme: false, scheme: "light dark" },
  });
});

test("a complete legacy backup validates and is normalized", () => {
  const backup = jsonInContext({
    exportedFrom: "Tabyss",
    usage: { "2026-01-02": { "www.example.com": 120 } },
    hours: { "2026-01-02": { 9: 120 } },
    switches: { "2026-01-02": 3 },
    holes: { "2026-01-02": [{ domain: "www.youtube.com", secs: 1800, hour: 22 }] },
    notified: { "2026-01-02": { Social: true } },
    media: { "2026-01-02": { video: { "www.youtube.com": 60 } } },
    wellness: { "2026-01-02": { eyeTaken: 1, waterDone: 2 } },
    settings: { ignore: ["https://example.org/private"], notificationDetails: true },
  });
  const result = plain(api.validateImportData(backup));
  assert.equal(result.patch.usage["2026-01-02"]["example.com"], 120);
  assert.equal(result.patch.media["2026-01-02"].video["youtube.com"], 60);
  assert.deepEqual(result.patch.settings.ignore, ["example.org"]);
  assert.equal(result.patch.settings.notificationDetails, true);
  assert.match(result.warnings[0], /Legacy backup/);
});

test("current exports include version metadata and all restorable sections", () => {
  const payload = plain(vm.runInContext("buildExportPayload({ settings: { officeMode: true } })", context));
  assert.equal(payload.exportedFrom, "Tabyss");
  assert.equal(payload.formatVersion, api.EXPORT_SCHEMA_VERSION);
  assert.equal(payload.settings.officeMode, true);
  for (const key of ["usage", "hours", "switches", "holes", "notified", "media", "wellness"]) {
    assert.deepEqual(payload[key], {});
  }
  assert.deepEqual(payload.focusSessions, []);
  assert.equal(payload.product.version, 1);
  assert.equal(payload.product.profiles.length, 3);
  assert.doesNotThrow(() => api.validateImportData(jsonInContext(payload)));
});

test("unknown settings are ignored with an explicit restore warning", () => {
  const result = plain(api.validateImportData(jsonInContext({
    exportedFrom: "Tabyss",
    formatVersion: api.EXPORT_SCHEMA_VERSION,
    settings: { officeMode: true, remoteCodeUrl: "https://unsafe.example/script.js" },
  })));
  assert.equal(result.patch.settings.officeMode, true);
  assert.equal(Object.hasOwn(result.patch.settings, "remoteCodeUrl"), false);
  assert.match(result.warnings.join(" "), /Ignored unknown settings: remoteCodeUrl/);
});

test("imports reject wrong products, future formats and malformed metrics", () => {
  assert.throws(() => api.validateImportData(jsonInContext({ exportedFrom: "Other", usage: {} })), /not a Tabyss backup/);
  assert.throws(() => api.validateImportData(jsonInContext({
    exportedFrom: "Tabyss", formatVersion: api.EXPORT_SCHEMA_VERSION + 1, usage: {},
  })), /newer Tabyss version/);
  assert.throws(() => api.validateImportData(jsonInContext({
    exportedFrom: "Tabyss", usage: { "2026-02-31": { "example.com": 1 } },
  })), /invalid date key/);
  assert.throws(() => api.validateImportData(jsonInContext({
    exportedFrom: "Tabyss", hours: { "2026-01-02": { 24: 1 } },
  })), /invalid hour/);
  assert.throws(() => api.validateImportData(jsonInContext({
    exportedFrom: "Tabyss", usage: { "2026-01-02": { "example.com": -1 } },
  })), /must be a number/);
  assert.throws(() => api.validateImportData(jsonInContext({
    exportedFrom: "Tabyss", usage: { "2026-01-02": { "example.com": null } },
  })), /must be a number/);
  assert.throws(() => api.validateImportData(jsonInContext({
    exportedFrom: "Tabyss", formatVersion: "2", usage: {},
  })), /invalid backup version/);
});

test("imports reject prototype-pollution keys at any depth", () => {
  const polluted = rawJsonInContext(
    '{"exportedFrom":"Tabyss","usage":{"2026-01-02":{"__proto__":10}}}'
  );
  assert.throws(() => api.validateImportData(polluted), /unsafe key "__proto__"/);

  const constructorKey = rawJsonInContext(
    '{"exportedFrom":"Tabyss","settings":{"overrides":{"constructor":"Social"}}}'
  );
  assert.throws(() => api.validateImportData(constructorKey), /unsafe key "constructor"/);
});
