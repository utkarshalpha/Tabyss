const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const pages = ["popup", "dashboard", "options", "wrapped", "sidepanel"];

for (const page of pages) {
  test(`${page} UI ids and accessibility references resolve`, () => {
    const html = fs.readFileSync(path.join(root, `${page}.html`), "utf8");
    const js = fs.readFileSync(path.join(root, `${page}.js`), "utf8");
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    const unique = new Set(ids);
    assert.equal(unique.size, ids.length, `${page}.html contains a duplicate id`);
    const runtimeIds = [...js.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    const declared = new Set([...ids, ...runtimeIds]);

    const jsTargets = [...js.matchAll(/getElementById\("([^"]+)"\)/g)].map((match) => match[1]);
    const markup = `${html}\n${js}`;
    const labelTargets = [...markup.matchAll(/\bfor="([^"]+)"/g)].map((match) => match[1]);
    const ariaTargets = [...markup.matchAll(/\baria-labelledby="([^"]+)"/g)]
      .flatMap((match) => match[1].trim().split(/\s+/));
    const missing = [...new Set([...jsTargets, ...labelTargets, ...ariaTargets])]
      .filter((id) => !declared.has(id));
    assert.deepEqual(missing, [], `${page} has references to missing element ids`);
  });
}

test("Saved pages replaces the multi-section Command Center with accessible controls", () => {
  const html = fs.readFileSync(path.join(root, "sidepanel.html"), "utf8");
  const js = fs.readFileSync(path.join(root, "sidepanel.js"), "utf8");
  assert.match(html, /<h1 id="savedPageTitle">Saved pages<\/h1>/);
  assert.match(html, /aria-label="Filter saved pages"/);
  assert.match(html, /data-saved-filter="saved"[^>]+aria-pressed="true"/);
  assert.match(js, /setAttribute\("aria-pressed", String\(active\)\)/);
  for (const retiredId of ["profileSelect", "planList", "spaceList", "checkpointList", "impactDays", "contractDialog"]) {
    assert.doesNotMatch(html, new RegExp(`id="${retiredId}"`));
  }
  for (const retiredLabel of ["Return Capsules", "Plans", "Spaces", "Tab recovery"]) {
    assert.doesNotMatch(html, new RegExp(retiredLabel));
  }
});

test("popup keeps the optional intentional session simple and secondary", () => {
  const html = fs.readFileSync(path.join(root, "popup.html"), "utf8");
  const js = fs.readFileSync(path.join(root, "popup.js"), "utf8");
  assert.ok(html.indexOf('class="today-card"') < html.indexOf('class="focuscard"'), "Today should lead the popup");
  assert.match(html, /<h2 id="focusHeading">Start a session<\/h2>/);
  assert.match(html, /An optional timer for what you are doing now\./);
  assert.match(html, /<option value="25" selected>25 min<\/option>/);
  assert.match(html, />Start<\/button>/);
  assert.match(html, /aria-label="Session progress"/);
  assert.match(html, /aria-label="Sites visited in this session"/);
  assert.match(html, /id="focusComplete"[^>]*>Complete<\/button>/);
  assert.match(html, /id="focusAbandon"[^>]*aria-label="End without completing"[^>]*>End<\/button>/);
  assert.match(js, /successDefinition: ""/);
  assert.match(js, /reason: ""/);
  assert.match(js, /note: ""/);
  for (const removedId of ["focusSuccess", "focusSuccessView", "focusReason", "focusFinish", "focusCheckout", "focusNote", "focusCheckoutBack"]) {
    assert.doesNotMatch(html, new RegExp(`id="${removedId}"`));
    assert.doesNotMatch(js, new RegExp(`getElementById\\("${removedId}"\\)`));
  }
  for (const removedCopy of ["One thing at a time", "Make space for what matters", "Add a finish line", "End unfinished", "Finish session", "How did this session go?"]) {
    assert.doesNotMatch(html, new RegExp(removedCopy));
  }
});

test("dashboard session history exposes the domain-only visited-site trail", () => {
  const html = fs.readFileSync(path.join(root, "dashboard.html"), "utf8");
  const js = fs.readFileSync(path.join(root, "dashboard.js"), "utf8");
  assert.match(html, /<h2>Intentional sessions<\/h2>/);
  assert.match(html, /What you worked on and the sites visited/);
  assert.match(js, /function focusVisitedSites\(domains\)/);
  assert.match(js, /aria-label", "Sites visited in this session"/);
  assert.match(js, /record\.visitedDomains/);
});
