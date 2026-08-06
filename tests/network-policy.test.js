const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const packaged = JSON.parse(fs.readFileSync(path.join(root, "package-files.json"), "utf8"));
const textRuntime = packaged.filter((file) => /\.(?:html|js|css|json)$/.test(file));
const forbidden = [
  [/\bfetch\s*\(/, "fetch"],
  [/\bXMLHttpRequest\b/, "XMLHttpRequest"],
  [/\bWebSocket\s*\(/, "WebSocket"],
  [/\bEventSource\s*\(/, "EventSource"],
  [/\bsendBeacon\s*\(/, "sendBeacon"],
  [/<script\b[^>]+src=["']https?:\/\//i, "remote script"],
  [/\bimportScripts\s*\(\s*["']https?:\/\//i, "remote importScripts"],
];

test("packaged runtime contains no network client or remote executable path", () => {
  const findings = [];
  for (const relative of textRuntime) {
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    for (const [pattern, label] of forbidden) {
      if (pattern.test(source)) findings.push(`${relative}: ${label}`);
    }
  }
  assert.deepEqual(findings, [], "Network behavior requires an Accepted connected-capability ADR");
});
