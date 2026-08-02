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
