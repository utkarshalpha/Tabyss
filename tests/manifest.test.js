const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const packaged = JSON.parse(fs.readFileSync(path.join(root, "package-files.json"), "utf8"));
const packageSet = new Set(packaged);
const allowedPermissions = new Set(["tabs", "storage", "idle", "alarms", "notifications", "favicon"]);

test("manifest stays MV3 and uses only the accepted permission set", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.ok(Number(manifest.minimum_chrome_version) >= 111);
  assert.deepEqual(
    [...manifest.permissions].sort(),
    [...allowedPermissions].sort(),
    "Permission changes require an Accepted ADR and an explicit test update"
  );
  assert.equal(Object.hasOwn(manifest, "host_permissions"), false);
  assert.equal(Object.hasOwn(manifest, "externally_connectable"), false);
  assert.equal(Object.hasOwn(manifest, "update_url"), false);
});

test("manifest executable references are local, present and packaged", () => {
  const references = [manifest.background.service_worker];
  for (const script of manifest.content_scripts || []) {
    assert.deepEqual(script.matches, ["http://*/*", "https://*/*"]);
    references.push(...(script.js || []), ...(script.css || []));
  }
  references.push(
    manifest.action.default_popup,
    manifest.options_ui.page,
    ...Object.values(manifest.icons || {}),
    ...Object.values(manifest.action.default_icon || {})
  );
  for (const reference of new Set(references)) {
    assert.equal(/^https?:\/\//.test(reference), false, `Remote runtime reference: ${reference}`);
    assert.equal(fs.existsSync(path.join(root, reference)), true, `Missing runtime reference: ${reference}`);
    assert.equal(packageSet.has(reference), true, `Runtime reference is absent from package-files.json: ${reference}`);
  }
});

test("package contract is unique, complete and runtime-only", () => {
  assert.equal(packageSet.size, packaged.length, "Duplicate package entries");
  assert.equal(packaged[0], "manifest.json", "Manifest must be the first archive entry");
  for (const relative of packaged) {
    assert.equal(relative.includes(".."), false, `Unsafe package path: ${relative}`);
    assert.equal(path.isAbsolute(relative), false, `Absolute package path: ${relative}`);
    assert.equal(fs.statSync(path.join(root, relative)).isFile(), true, `Missing package file: ${relative}`);
    assert.equal(/^(tests|docs|tmp|\.git|\.github)(\/|$)/.test(relative), false, `Non-runtime file packaged: ${relative}`);
  }
});

test("HTML script and stylesheet references are local and packaged", () => {
  for (const relative of packaged.filter((file) => file.endsWith(".html"))) {
    const html = fs.readFileSync(path.join(root, relative), "utf8");
    const refs = [...html.matchAll(/<(?:script|link)\b[^>]+(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
    for (const reference of refs) {
      assert.equal(/^https?:\/\//.test(reference), false, `Remote asset in ${relative}: ${reference}`);
      const clean = reference.split(/[?#]/)[0];
      assert.equal(packageSet.has(clean), true, `Asset from ${relative} is absent from package: ${clean}`);
    }
  }
});
