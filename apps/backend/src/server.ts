import { logger } from "@/lib/logger";
import { app } from "@/app";
import { env } from "@/config/env";
import { handleUpgrade, websocketHandlers, startPingLoop, stopPingLoop } from "@/realtime/ws.gateway";
import { initPubSub, shutdownPubSub } from "@/realtime/pubsub";
import { startQueueConsumer, stopQueueConsumer } from "@/queue/consumer";

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught Exception crashed the server");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled Rejection crashed the server");
  process.exit(1);
});

logger.info(
  { port: env.PORT, env: env.NODE_ENV },
  `Backend starting on port ${env.PORT} (${env.NODE_ENV})`,
);

// Start the Bun server instance
const server = Bun.serve({
  port: env.PORT,
  hostname: "0.0.0.0", // Allow external/Docker connections
  fetch: async (req, serverInstance) => {
    const url = new URL(req.url);

    // Route WebSocket upgrades
    if (url.pathname === "/ws") {
      const { authenticated, data } = await handleUpgrade(req);
      const upgraded = serverInstance.upgrade(req, { data });
      if (upgraded) {
        logger.debug({ authenticated, email: data.email }, "WebSocket upgrade request accepted");
        return undefined; // Bun handled it
      } else {
        logger.error("WebSocket upgrade failed");
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
    }

    // Default: Route HTTP requests to Hono app
    try {
      return await app.fetch(req);
    } catch (err) {
      logger.error({ err }, "Error handling request");
      return new Response("Internal Server Error", { status: 500 });
    }
  },
  websocket: websocketHandlers,
});

// Initialize background lifecycle loops
(async () => {
  try {
    // 1. PubSub backplane
    await initPubSub(server);

    // 2. Queue consumer loop
    await startQueueConsumer();

    // 3. WS ping loop
    startPingLoop();

    logger.info("All background subsystems successfully started");
  } catch (err) {
    logger.fatal({ err }, "Failed to start background subsystems");
    process.exit(1);
  }
})();

// Graceful shutdown handling
let isShuttingDown = false;
async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info("Graceful shutdown initiated...");

  // Stop accepting new connections
  server.stop(true);

  // Stop background tasks
  stopPingLoop();
  await stopQueueConsumer();
  await shutdownPubSub();

  logger.info("Backend shut down gracefully");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default server;