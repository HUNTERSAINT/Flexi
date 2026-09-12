import app from "./app";
import { logger } from "./lib/logger";
import { seedAdminUser, seedPricing, seedWallets } from "./lib/seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

function startServer() {
  const server = app.listen(port, () => {
    logger.info({ port }, "Server listening");

    // Do not block the HTTP listener on database initialization. Railway's
    // startup probe needs a response while the database is connecting and
    // seed data is being prepared.
    void Promise.all([seedAdminUser(), seedWallets(), seedPricing()])
      .then(() => {
        logger.info("Database seed completed");
      })
      .catch((err) => {
        logger.error({ err }, "Database seed failed");
      });
  });

  server.on("error", (err) => {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  });
}

startServer();
