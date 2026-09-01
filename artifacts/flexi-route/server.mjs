import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT ?? 3000);
const publicDir = fileURLToPath(new URL("./dist/public/", import.meta.url));
const indexFile = path.join(publicDir, "index.html");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function safePath(requestUrl) {
  let pathname;

  try {
    pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  } catch {
    return null;
  }

  const requestedPath = path.resolve(publicDir, `.${pathname}`);
  if (requestedPath !== publicDir && !requestedPath.startsWith(`${publicDir}${path.sep}`)) {
    return null;
  }

  return requestedPath;
}

function sendFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    "Cache-Control": filePath === indexFile ? "no-cache" : "public, max-age=31536000, immutable",
    "Content-Type": contentTypes[extension] ?? "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method Not Allowed");
    return;
  }

  const requestedPath = safePath(request.url ?? "/");
  let filePath = requestedPath;

  if (filePath) {
    try {
      const details = await stat(filePath);
      if (details.isDirectory()) filePath = path.join(filePath, "index.html");
    } catch {
      filePath = null;
    }
  }

  if (!filePath) filePath = indexFile;

  try {
    await stat(filePath);
    if (request.method === "HEAD") {
      response.writeHead(200, {
        "Cache-Control": filePath === indexFile ? "no-cache" : "public, max-age=31536000, immutable",
        "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
      });
      response.end();
    } else {
      sendFile(response, filePath);
    }
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Frontend server listening on port ${port}`);
});