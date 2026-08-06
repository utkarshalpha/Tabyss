const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const port = Number(process.argv[2] || process.env.TABYSS_UI_TEST_PORT) || 4173;
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
};

http.createServer((request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  const relative = pathname === "/" ? "options.html" : decodeURIComponent(pathname.slice(1));
  const file = path.resolve(root, relative);
  if (file !== root && !file.startsWith(root + path.sep)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  fs.readFile(file, (error, buffer) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500).end("Not found");
      return;
    }
    let body = buffer;
    if (["options.html", "popup.html", "dashboard.html", "sidepanel.html", "wrapped.html"].includes(relative)) {
      body = buffer.toString("utf8").replace(
        '<script src="common.js"></script>',
        '<script src="common.js"></script>\n    <script src="product.js"></script>\n    <script src="tests/chrome-mock.js"></script>'
      );
    }
    response.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'",
    });
    response.end(body);
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`Tabyss UI test server: http://127.0.0.1:${port}/options.html`);
});
