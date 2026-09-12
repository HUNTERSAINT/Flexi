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

async function startServer() {
  // Seed required catalog data before accepting booking requests.
  await seedAdminUser();
  await seedWallets();
  await seedPricing();

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

startServer().catch((err) => {
  logger.error({ err }, "Unable to start server");
  process.exit(1);
});
