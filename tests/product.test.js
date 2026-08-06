const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const common = fs.readFileSync(path.join(root, "common.js"), "utf8");
const product = fs.readFileSync(path.join(root, "product.js"), "utf8");
const context = vm.createContext({
  URL,
  Date,
  console,
  window: { matchMedia: () => ({ matches: false }) },
  chrome: {
    runtime: { getURL: (value) => `chrome-extension://tabyss/${value}` },
    storage: { local: { get: async () => ({}) } },
  },
});
vm.runInContext(`${common}\n${product}\n;globalThis.__productTest = {
  defaultProductData, sanitizeProductData, sanitizeProductPlan, productUrl,
  productUrlKey, productTabIsPlanned, productDuplicateGroups, PRODUCT_LIMITS
};`, context);
const api = context.__productTest;
const inContext = (value) => vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(value))})`, context);
const plain = (value) => JSON.parse(JSON.stringify(value));

test("new V2 data starts with bounded local profiles and no hidden connected state", () => {
  const value = plain(api.defaultProductData());
  assert.equal(value.version, 1);
  assert.deepEqual(value.profiles.map((profile) => profile.name), ["Personal", "Work", "Study"]);
  assert.deepEqual(value.plans, []);
  assert.deepEqual(value.spaces, []);
  assert.deepEqual(value.capsules, []);
  assert.deepEqual(value.schedulePrompts, {});
  assert.equal(Object.hasOwn(value, "account"), false);
  assert.equal(Object.hasOwn(value, "friends"), false);
});

test("explicit captures accept only bounded credential-free HTTP(S) URLs", () => {
  assert.equal(api.productUrl("https://example.com/path#note"), "https://example.com/path#note");
  assert.throws(() => api.productUrl("javascript:alert(1)"), /PRODUCT_INVALID_URL/);
  assert.throws(() => api.productUrl("https://user:secret@example.com/private"), /PRODUCT_INVALID_URL/);
  assert.throws(() => api.productUrl(`https://example.com/${"x".repeat(2100)}`), /PRODUCT_INVALID_URL/);
});

test("plan rules are normalized and evaluate domains without reading page content", () => {
  const plan = plain(api.sanitizeProductPlan(inContext({
    id: "plan_launch001",
    profileId: "profile_work",
    name: " Launch plan ",
    intention: " Finish   launch brief ",
    mode: "timer",
    targetMinutes: 50,
    protection: "nudge",
    allowedDomains: ["https://docs.example.com/path", "docs.example.com"],
    blockedDomains: ["youtube.com"],
    relevantUrls: ["https://docs.example.com/brief"],
    schedule: { enabled: true, days: [1, 1, 3, 8], time: "09:30" },
  })));
  assert.equal(plan.name, "Launch plan");
  assert.equal(plan.intention, "Finish launch brief");
  assert.deepEqual(plan.allowedDomains, ["docs.example.com"]);
  assert.deepEqual(plan.schedule, { enabled: true, days: [1, 3], time: "09:30" });
  assert.equal(api.productTabIsPlanned(inContext({ url: "https://docs.example.com/work" }), inContext(plan)), true);
  assert.equal(api.productTabIsPlanned(inContext({ url: "https://youtube.com/watch?v=1" }), inContext(plan)), false);
  assert.equal(api.productTabIsPlanned(inContext({ url: "https://mail.example.com" }), inContext(plan)), false);
});

test("duplicate recovery ignores fragments and keeps separate query variants", () => {
  const groups = plain(api.productDuplicateGroups(inContext([
    { id: 1, windowId: 1, url: "https://example.com/read#top", title: "Top" },
    { id: 2, windowId: 1, url: "https://example.com/read#notes", title: "Notes" },
    { id: 3, windowId: 1, url: "https://example.com/read?page=2", title: "Page 2" },
    { id: 4, windowId: 1, url: "chrome://settings", title: "Settings" },
  ])));
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].map((tab) => tab.id), [1, 2]);
});

test("product validation fails closed on corruption, duplicates and collection overflow", () => {
  assert.throws(() => api.sanitizeProductData(inContext({ version: 99 })), /PRODUCT_DATA_CORRUPT/);
  const duplicateProfiles = plain(api.defaultProductData());
  duplicateProfiles.profiles.push(duplicateProfiles.profiles[0]);
  assert.throws(() => api.sanitizeProductData(inContext(duplicateProfiles)), /PRODUCT_INVALID_PROFILE/);
  const overflow = plain(api.defaultProductData());
  overflow.profiles = Array.from({ length: api.PRODUCT_LIMITS.profiles + 1 }, (_, index) => ({
    id: `profile_custom${String(index).padStart(3, "0")}`,
    name: `Profile ${index}`,
    color: "#5b3fd6",
    createdAt: 0,
    updatedAt: 0,
  }));
  assert.throws(() => api.sanitizeProductData(inContext(overflow)), /PRODUCT_INVALID_PROFILE/);
});
