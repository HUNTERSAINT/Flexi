import express, { type Express } from "express";
import cors from "cors";
import path from "node:path";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
const frontendDir = path.join(process.cwd(), "artifacts", "flexi-route", "dist", "public");
const frontendIndex = path.join(frontendDir, "index.html");

app.use((req, res, next) => {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const host = String(req.headers.host ?? "").split(":")[0].toLowerCase();
  const forwardedProto = String(req.headers["x-forwarded-proto"] ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  const canonicalHost = host === "www.flexirouteglobal.com" ? "flexirouteglobal.com" : host;

  if (host === "www.flexirouteglobal.com" || (forwardedProto && forwardedProto !== "https")) {
    res.redirect(308, `https://${canonicalHost}${req.originalUrl}`);
    return;
  }

  next();
});

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
      (req as Express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

// Keep API routes ahead of the frontend fallback so /api requests always reach Express.
app.use("/api", router);

// Serve the Vite-built frontend from this same Railway service.
app.use(express.static(frontendDir, {
  index: "index.html",
  maxAge: "1y",
  immutable: true,
  setHeaders(res, filePath) {
    if (filePath.endsWith("index.html")) {
      res.setHeader("Cache-Control", "no-cache");
    }
  },
}));

// Support client-side routes while returning real 404s for unknown paths.
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    next();
    return;
  }

  const pathname = req.path;
  const isKnownClientRoute =
    pathname === "/" ||
    /^\/(about|services|pricing|track|contact|faq|book|login|register)\/?$/.test(pathname) ||
    /^\/track\/[^/]+\/?$/.test(pathname) ||
    /^\/(dashboard|admin|driver)(\/.*)?$/.test(pathname);

  if (!isKnownClientRoute) {
    next();
    return;
  }

  res.sendFile(frontendIndex, (error) => {
    if (error) next(error);
  });
});

export default app;
