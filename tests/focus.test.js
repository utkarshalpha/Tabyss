const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "common.js"), "utf8");
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
vm.runInContext(`${source}\n;globalThis.__focusTest = {
  createFocusActive, focusElapsedMs, focusRemainingMs, focusNeedsReview,
  focusTransition, focusView, focusWithVisitedDomain, sanitizeFocusSessions,
  FOCUS_MAX_RUNNING_MS, FOCUS_MAX_VISITED_DOMAINS
};`, context);

const api = context.__focusTest;
const plain = (value) => JSON.parse(JSON.stringify(value));
const inContext = (value) => vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(value))})`, context);
const START = Date.UTC(2026, 7, 2, 9, 0, 0);

function timer(minutes = 25) {
  return api.createFocusActive(inContext({
    intention: "  Ship   the launch brief  ",
    successDefinition: "Reviewed draft",
    mode: "timer",
    targetMinutes: minutes,
  }), START, "focus_test_001");
}

test("timer creation normalizes its intention and derives time from timestamps", () => {
  const active = timer();
  assert.equal(active.intention, "Ship the launch brief");
  assert.equal(active.targetMs, 25 * 60000);
  assert.equal(api.focusElapsedMs(active, START + 5 * 60000), 5 * 60000);
  assert.equal(api.focusRemainingMs(active, START + 5 * 60000), 20 * 60000);
  assert.equal(api.focusNeedsReview(active, START + 25 * 60000), true);
});

test("pause freezes elapsed time and resume starts a new timestamp segment", () => {
  const paused = api.focusTransition(timer(), "pause", START + 4 * 60000).active;
  assert.equal(api.focusElapsedMs(paused, START + 20 * 60000), 4 * 60000);
  const resumed = api.focusTransition(paused, "resume", START + 20 * 60000).active;
  assert.equal(api.focusElapsedMs(resumed, START + 23 * 60000), 7 * 60000);
});

test("timer expiry enters review and an extension resumes without losing elapsed time", () => {
  const review = api.focusTransition(timer(), "review", START + 25 * 60000).active;
  assert.equal(review.status, "review");
  assert.equal(review.reviewReason, "timer");
  const extended = api.focusTransition(review, "extend", START + 26 * 60000, inContext({ minutes: 10 })).active;
  assert.equal(extended.status, "running");
  assert.equal(extended.targetMinutes, 35);
  assert.equal(api.focusRemainingMs(extended, START + 27 * 60000), 9 * 60000);
});

test("completion creates a compact outcome record and clears active state", () => {
  const result = api.focusTransition(timer(50), "complete", START + 30 * 60000, inContext({ note: "Sent for review" }));
  const record = plain(result.record);
  assert.equal(result.active, null);
  assert.equal(record.outcome, "completed");
  assert.equal(record.focusedMs, 30 * 60000);
  assert.equal(record.note, "Sent for review");
  assert.equal(record.abandonedReason, "");
});

test("session sites are domain-only, deduplicated, bounded and portable", () => {
  let active = api.focusWithVisitedDomain(timer(), "www.docs.example.com");
  active = api.focusWithVisitedDomain(active, "docs.example.com");
  active = api.focusWithVisitedDomain(active, "youtube.com");
  assert.deepEqual(plain(api.focusView(active, START + 1000).visitedDomains), ["docs.example.com", "youtube.com"]);
  const record = plain(api.focusTransition(active, "complete", START + 60000).record);
  assert.deepEqual(record.visitedDomains, ["docs.example.com", "youtube.com"]);
  assert.deepEqual(plain(api.sanitizeFocusSessions(inContext([record])))[0].visitedDomains, record.visitedDomains);

  const legacy = { ...record };
  delete legacy.visitedDomains;
  assert.deepEqual(plain(api.sanitizeFocusSessions(inContext([legacy])))[0].visitedDomains, []);
  const tooMany = Array.from({ length: api.FOCUS_MAX_VISITED_DOMAINS + 1 }, (_, index) => `site${index}.example.com`);
  assert.throws(
    () => api.createFocusActive(inContext({ intention: "Work", mode: "timer", targetMinutes: 25, visitedDomains: tooMany }), START, "focus_test_004"),
    /FOCUS_INVALID_SITES/
  );
});

test("abandonment accepts only allowlisted reasons", () => {
  const result = api.focusTransition(timer(), "abandon", START + 2 * 60000, inContext({ reason: "interrupted" }));
  assert.equal(result.record.outcome, "abandoned");
  assert.equal(result.record.abandonedReason, "interrupted");
  assert.throws(
    () => api.focusTransition(timer(), "abandon", START + 2 * 60000, inContext({ reason: "injected" })),
    /FOCUS_INVALID_REASON/
  );
});

test("open-ended sessions stop at the twelve-hour safety review", () => {
  const active = api.createFocusActive(inContext({
    intention: "Deep work",
    mode: "stopwatch",
  }), START, "focus_test_002");
  assert.equal(api.focusNeedsReview(active, START + api.FOCUS_MAX_RUNNING_MS), true);
  const review = api.focusTransition(active, "review", START + api.FOCUS_MAX_RUNNING_MS).active;
  assert.equal(review.reviewReason, "safety");
  assert.equal(api.focusView(review, START + api.FOCUS_MAX_RUNNING_MS).elapsedMs, api.FOCUS_MAX_RUNNING_MS);
});

test("invalid text, durations and transitions fail closed", () => {
  assert.throws(() => api.createFocusActive(inContext({ intention: "", mode: "timer", targetMinutes: 25 }), START, "focus_test_003"), /FOCUS_INVALID_TEXT/);
  assert.throws(() => api.createFocusActive(inContext({ intention: "Work", mode: "timer", targetMinutes: 4 }), START, "focus_test_003"), /FOCUS_INVALID_DURATION/);
  assert.throws(() => api.focusTransition(timer(), "resume", START + 1000), /FOCUS_INVALID_TRANSITION/);
  assert.throws(() => api.focusTransition(timer(), "complete", START - 1), /FOCUS_INVALID_REQUEST/);
});

test("focus history validation normalizes records and rejects duplicates", () => {
  const record = plain(api.focusTransition(timer(), "complete", START + 10 * 60000).record);
  const sanitized = plain(api.sanitizeFocusSessions(inContext([record])));
  assert.equal(sanitized.length, 1);
  assert.equal(sanitized[0].day.length, 10);
  assert.throws(() => api.sanitizeFocusSessions(inContext([record, record])), /duplicate session id/);
});

test("a long pause does not make an otherwise bounded outcome unrestorable", () => {
  const paused = api.focusTransition(timer(), "pause", START + 60000).active;
  const record = api.focusTransition(paused, "complete", START + 30 * 86400000).record;
  const sanitized = plain(api.sanitizeFocusSessions(inContext([plain(record)])));
  assert.equal(sanitized[0].focusedMs, 60000);
  assert.ok(sanitized[0].endedAt - sanitized[0].startedAt >= 29 * 86400000);
});
