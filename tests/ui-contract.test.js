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
  assert.match(html, /<h1 id="savedPageTitle"[^>]*>Saved pages<\/h1>/);
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

test("the local UI preview loads the product model before its browser mock", () => {
  const server = fs.readFileSync(path.join(root, "tests", "ui-server.js"), "utf8");
  const commonAt = server.indexOf('<script src="common.js"></script>');
  const productAt = server.indexOf('<script src="product.js"></script>');
  const mockAt = server.indexOf('<script src="tests/chrome-mock.js"></script>');
  assert.ok(commonAt >= 0 && commonAt < productAt, "common.js must load before product.js");
  assert.ok(productAt < mockAt, "product.js must load before the UI browser mock");
});

test("the intentional session stays secondary behind its header dial", () => {
  const html = fs.readFileSync(path.join(root, "popup.html"), "utf8");
  const js = fs.readFileSync(path.join(root, "popup.js"), "utf8");
  // Secondary is now expressed by the sheet being closed, not by DOM order:
  // it drops from the dial, so it has to precede the cards it covers.
  assert.match(html, /<section id="focusPanel" class="focus-sheet"[^>]*hidden>/);
  assert.match(html, /id="focusToggle"[^>]*aria-expanded="false"[^>]*aria-controls="focusPanel"/s);
  assert.match(html, /<h2 id="focusHeading">What matters now\?<\/h2>/);
  assert.match(html, /id="focusIntention"[^>]*aria-labelledby="focusHeading"/s, "the heading labels the field");
  // Duration is a segmented control, not a dropdown.
  assert.doesNotMatch(html, /id="focusDuration"/);
  for (const value of ["25", "50", "90", "stopwatch"]) {
    assert.match(html, new RegExp(`type="radio" name="focusDuration"[^>]*value="${value}"`));
  }
  assert.match(html, /id="dur25"[^>]*checked/, "25 minutes is the default length");
  for (const spoken of ["25 minutes", "50 minutes", "90 minutes", "Open-ended, no timer"]) {
    assert.match(html, new RegExp(`aria-label="${spoken}"`), "each length needs a spoken name");
  }
  assert.match(js, /input\[name="focusDuration"\]:checked/);
  assert.match(html, />Start session<\/button>/);
  assert.match(html, /aria-label="Session progress"/);
  assert.match(html, /aria-label="Sites visited in this session"/);
  assert.match(html, /id="focusComplete"[^>]*>Complete<\/button>/);
  assert.match(html, /id="focusAbandon"[^>]*aria-label="End without completing"[^>]*>End<\/button>/);
  // A live session must never be hidden behind a collapsed sheet.
  assert.match(js, /setFocusPanel\(true\);/);
  // Today's details open by default; the office-mode failure keeps its own
  // message now that the session error lives in a sheet that may be closed.
  assert.match(html, /<details class="popup-more" open>/);
  assert.match(html, /id="officeError"/);
});

test("the dial is a drawn instrument, and labels are not set in monospace", () => {
  const html = fs.readFileSync(path.join(root, "popup.html"), "utf8");
  const js = fs.readFileSync(path.join(root, "popup.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  for (const part of ["dialArc", "dialHour", "dialMin", "dial-ticks", "dial-pin"]) {
    assert.match(html, new RegExp(part), `the dial needs its ${part}`);
  }
  assert.match(js, /function renderDial\(focus, elapsed\)/);
  assert.match(css, /--display: "Bahnschrift"/);
  assert.match(css, /--label: var\(--display\)/);
  assert.match(css, /--figure: var\(--display\)/);
  // Monospace survives only where the content really is technical text.
  const monoUses = [...css.matchAll(/^(.*)font-family: var\(--mono\)/gm)].map((m) => m[1]);
  assert.equal(monoUses.length, 2, `monospace should be reserved for domain lists, found: ${monoUses}`);
  for (const use of monoUses) assert.match(use, /\.field textarea|\.assignrow \.ad/);
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

test("settings exposes a persistent accessible theme choice", () => {
  const html = fs.readFileSync(path.join(root, "options.html"), "utf8");
  const js = fs.readFileSync(path.join(root, "options.js"), "utf8");
  const common = fs.readFileSync(path.join(root, "common.js"), "utf8");
  assert.match(html, /<h2 id="appearanceTitle">Appearance<\/h2>/);
  for (const theme of ["system", "light", "dark"]) {
    assert.match(html, new RegExp(`type="radio" name="appearance" value="${theme}"`));
  }
  assert.match(html, /id="themeStatus"[^>]+role="status"[^>]+aria-live="polite"/);
  assert.match(js, /appearance: document\.querySelector\('input\[name="appearance"\]:checked'\)/);
  assert.match(js, /applyAppearance\(/);
  assert.match(common, /appearance: "system"/);
  assert.match(common, /root\.dataset\.theme = mode/);
  assert.match(common, /if \(mode === "system"\) delete root\.dataset\.theme;/, "system must clear the override so the OS media query wins");
  assert.match(common, /systemTheme\?\.addEventListener\?\.\("change"/);
  for (const page of ["popup", "dashboard", "options", "wrapped"]) {
    const pageJs = fs.readFileSync(path.join(root, `${page}.js`), "utf8");
    assert.match(pageJs, /tabyss-theme-change/, `${page} should redraw theme-dependent UI`);
  }
});

test("Abyss and Ember tokens and rounded popup shell are enforced", () => {
  const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const content = fs.readFileSync(path.join(root, "content.js"), "utf8");
  for (const token of ["#f5f3fa", "#17121f", "#7c3aed", "#db2777", "#f97316", "#0e0b15", "#f4f1fa", "#a78bfa"]) {
    assert.match(css, new RegExp(token, "i")); // tokens are generated upper-case
  }
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /:root:not\(\[data-theme="light"\]\)/);
  assert.match(css, /--radius-shell: 22px/);
  assert.match(css, /html:has\(body\.popup\) \{ padding: 4px; \}/);
  assert.match(css, /\.popup \{[\s\S]*?border-radius: var\(--radius-shell\)/);
  assert.match(content, /border-radius:24px/);
});
