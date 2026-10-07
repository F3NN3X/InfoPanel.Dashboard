// Serves the freshly built dashboard and proxies /api + /assets to the
// live bridge (127.0.0.1:3921), so the new bundle renders with live data
// on a fresh origin (the in-app browser's cached bridge tab stays stale).
const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST = path.join(__dirname, "dist");
const UPSTREAM = { host: "127.0.0.1", port: 3921 };

const TYPES = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".html": "text/html",
  ".json": "application/json",
};

const server = http.createServer((req, res) => {
  const url = req.url || "/";
  if (url.startsWith("/api/") || url.startsWith("/assets/")) {
    const proxy = http.request(
      {
        host: UPSTREAM.host,
        port: UPSTREAM.port,
        path: url,
        method: req.method,
        headers: { ...req.headers, host: "127.0.0.1:3921" },
      },
      (up) => {
        res.writeHead(up.statusCode, up.headers);
        up.pipe(res);
      }
    );
    proxy.on("error", (e) => {
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end(String(e));
    });
    req.pipe(proxy);
    return;
  }
  let file = url === "/" ? "index.html" : decodeURIComponent(url.split("?")[0]).slice(1);
  file = path.join(DIST, file);
  if (!file.startsWith(DIST) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    file = path.join(DIST, "index.html");
  }
  res.writeHead(200, {
    "Content-Type": TYPES[path.extname(file)] || "text/html",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(4173, "127.0.0.1", () =>
  console.log("preview+proxy on http://127.0.0.1:4173 (upstream 3921)")
);
