import { Redis, type RedisOptions } from "ioredis";
import { env } from "./config/env.js";
import { logger } from "./logger-config.js";

const MAX_RETRY_ATTEMPTS  = 20;
const BASE_RETRY_DELAY_MS = 200;
const MAX_RETRY_DELAY_MS  = 5_000;

const QUIT_TIMEOUT_MS = 3_000;

let isShuttingDown = false;

const redisOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,

  password: env.REDIS_PASSWORD ?? undefined,

  retryStrategy(times: number): number | null {
    if (isShuttingDown) {
      logger.info("Redis: shutdown in progress — stopping reconnect attempts");
      return null;
    }

    if (times > MAX_RETRY_ATTEMPTS) {
      logger.error(
        `Redis: max reconnect attempts (${MAX_RETRY_ATTEMPTS}) reached — exiting`,
      );
      setImmediate(() => process.exit(1));
      return null;
    }

    const delay = Math.min(times * BASE_RETRY_DELAY_MS, MAX_RETRY_DELAY_MS);
    logger.warn("Redis: scheduling reconnect", { attempt: times, delayMs: delay });
    return delay;
  },

  maxRetriesPerRequest: 3,
  enableReadyCheck:     true,

  lazyConnect: true,
};

const createRedisClient = (): Redis => {
  const client = new Redis(redisOptions);

  client.on("connect",      () => logger.info("Redis: TCP connection established"));
  client.on("ready",        () => logger.info("Redis: client ready"));
  client.on("reconnecting", (delayMs: number) => logger.warn("Redis: reconnecting", { delayMs }));
  client.on("close",        () => logger.warn("Redis: connection closed"));
  client.on("end",          () => logger.info("Redis: connection ended (no more reconnects)"));
  client.on("error",        (err: Error) => logger.error("Redis: error", { error: err }));

  return client;
};

export const redis = createRedisClient();

const quitWithTimeout = (): Promise<void> =>
  new Promise((resolve) => {
    const timer = setTimeout(() => {
      logger.warn(
        `Redis: quit() did not resolve within ${QUIT_TIMEOUT_MS}ms — forcing disconnect`,
      );
      redis.disconnect();
      resolve();
    }, QUIT_TIMEOUT_MS);

    redis
      .quit()
      .then(() => {
        clearTimeout(timer);
        logger.info("Redis: connection closed gracefully");
        resolve();
      })
      .catch((err: Error) => {
        clearTimeout(timer);
        logger.error("Redis: error during graceful shutdown", { error: err });
        redis.disconnect();
        resolve();
      });
  });

const shutdown = async (): Promise<void> => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info("Redis: beginning graceful shutdown");
  await quitWithTimeout();
};

process.on("SIGINT",  shutdown);
process.on("SIGTERM", shutdown);