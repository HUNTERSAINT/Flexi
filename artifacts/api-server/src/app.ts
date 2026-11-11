import fs from "node:fs";
import path from "node:path";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(
  express.json({
    verify: (req, _res, buffer) => {
      (req as Express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(
        buffer,
      );
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// ---------------------------------------------------------------------------
// Frontend (single-service deployment)
//
// When the built React app is present, this server also serves it, so the
// website and the API run as ONE service on one origin. The frontend is built
// to artifacts/flexi-route/dist/public. Set FRONTEND_DIST to use another
// folder. If the build output is missing (local API-only development, tests),
// nothing below is registered and the server behaves as a plain API.
// ---------------------------------------------------------------------------

const here = typeof __dirname !== "undefined" ? __dirname : process.cwd();
const frontendDir = path.resolve(
  process.env["FRONTEND_DIST"] ?? path.resolve(here, "../../flexi-route/dist/public"),
);
const indexFile = path.join(frontendDir, "index.html");

const CANONICAL_HOST = "flexirouteglobal.com";
const WWW_HOST = `www.${CANONICAL_HOST}`;
const HSTS = "max-age=31536000; includeSubDomains";

// Client-side routes handled by the React router. Anything else that is not a
// real file gets index.html with a real 404 status.
const knownClientRoute = (pathname: string): boolean =>
  pathname === "/" ||
  /^\/(about|services|pricing|track|contact|faq|book|login|register)\/?$/.test(pathname) ||
  /^\/track\/[^/]+\/?$/.test(pathname) ||
  /^\/(dashboard|admin|driver)(\/.*)?$/.test(pathname);

function redirectToCanonical(req: Request, res: Response, next: NextFunction) {
  const host = String(req.headers.host ?? "").split(":")[0]!.toLowerCase();
  const proto = String(req.headers["x-forwarded-proto"] ?? "")
    .split(",")[0]!
    .trim()
    .toLowerCase();
  const targetHost = host === WWW_HOST ? CANONICAL_HOST : host;

  if ((proto && proto !== "https") || host === WWW_HOST) {
    res
      .status(308)
      .set({ Location: `https://${targetHost}${req.originalUrl}`, "Cache-Control": "public, max-age=3600", "Strict-Transport-Security": HSTS })
      .end();
    return;
  }
  next();
}

function serveFrontend(req: Request, res: Response) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.status(405).set("Allow", "GET, HEAD").send("Method Not Allowed");
    return;
  }

  const security = { "Strict-Transport-Security": HSTS, "X-Content-Type-Options": "nosniff" };
  const pathname = req.path;

  let requested: string;
  try {
    requested = path.resolve(frontendDir, `.${decodeURIComponent(pathname)}`);
  } catch {
    res.status(400).set(security).send("Bad Request");
    return;
  }
  const insideDir = requested === frontendDir || requested.startsWith(`${frontendDir}${path.sep}`);

  let filePath: string | null = null;
  if (insideDir) {
    try {
      const stat = fs.statSync(requested);
      filePath = stat.isDirectory() ? path.join(requested, "index.html") : requested;
      if (!fs.existsSync(filePath)) filePath = null;
    } catch {
      filePath = null;
    }
  }

  if (filePath) {
    const isIndex = filePath === indexFile;
    res.set({
      ...security,
      "Cache-Control": isIndex ? "no-cache" : "public, max-age=31536000, immutable",
    });
    res.sendFile(filePath, { cacheControl: false, dotfiles: "deny" });
    return;
  }

  if (/\/(sitemap\.xml|robots\.txt)$/.test(pathname)) {
    res.status(404).set(security).type("text/plain").send("SEO resource not found");
    return;
  }

  // Unknown path: known app routes get the SPA shell (200), the rest get the
  // shell with a real 404 so crawlers do not index them.
  res.status(knownClientRoute(pathname) ? 200 : 404);
  res.set({ ...security, "Cache-Control": "no-cache" });
  res.sendFile(indexFile, { cacheControl: false, dotfiles: "deny" });
}

if (fs.existsSync(indexFile)) {
  logger.info({ frontendDir }, "Serving frontend from API server");
  // Unknown API paths must stay API errors, never the website's HTML.
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  app.use(redirectToCanonical);
  app.use(serveFrontend);
}

export default app;
