/**
 * Redis pub/sub backplane for multi-instance WebSocket fan-out.
 *
 * When the backend runs as multiple replicas, each instance only knows about
 * its own WS connections. This module bridges instances:
 *
 *   1. Any instance can call `publishToCamera(cameraId, event)` —
 *      this publishes to a Redis channel `ws:camera:<cameraId>`.
 *
 *   2. Every instance subscribes to `ws:camera:*` and re-broadcasts
 *      to its local Bun WS topic `camera:<cameraId>`.
 *
 * For a single-instance deploy this is a no-op passthrough, but it costs
 * almost nothing and means the architecture is ready for horizontal scaling.
 *
 * IMPORTANT: ioredis requires a DEDICATED client for subscriptions — a client
 * in subscriber mode cannot issue normal commands. We duplicate the main client.
 */

import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import type { WsServerMessage } from "./events";
import type { ServerWebSocket } from "bun";

/** Dedicated subscriber connection (created lazily on init). */
let subscriber: typeof redis | null = null;

/**
 * Reference to the Bun server — set by `initPubSub()` in server.ts.
 * Needed to call `server.publish(topic, data)` for local fan-out.
 */
let serverRef: { publish: (topic: string, data: string) => void } | null = null;

/**
 * Publish a WS event to all subscribers of a camera, across all replicas.
 *
 * This is the ONLY function the rest of the codebase should call to push
 * realtime events. It handles both local and cross-replica fan-out.
 */
export function publishToCamera(
  cameraId: string,
  message: WsServerMessage,
): void {
  const channel = `ws:camera:${cameraId}`;
  const payload = JSON.stringify(message);

  // Publish to Redis so other replicas receive it
  redis.publish(channel, payload).catch((err) => {
    logger.error({ err, cameraId }, "Failed to publish to Redis channel");
  });

  // Also publish locally (in case this instance has subscribers)
  // This is redundant if we're also listening on Redis, but the Redis
  // subscriber will handle dedup by checking the source. For simplicity
  // at single-instance scale, we skip dedup and just let Bun topic handle it.
}

/**
 * Initialise the pub/sub backplane.
 *
 * Call once at server startup, after Bun.serve() returns the server reference.
 */
export async function initPubSub(
  server: { publish: (topic: string, data: string) => void },
): Promise<void> {
  serverRef = server;

  // Create a dedicated subscriber client
  subscriber = redis.duplicate();
  await subscriber.connect();

  // Subscribe to all camera channels using pattern subscribe
  await subscriber.psubscribe("ws:camera:*");

  subscriber.on("pmessage", (_pattern: string, channel: string, message: string) => {
    // channel = "ws:camera:<cameraId>" → extract cameraId
    const cameraId = channel.slice("ws:camera:".length);

    if (!cameraId || !serverRef) return;

    // Re-broadcast to the local Bun topic
    const topic = `camera:${cameraId}`;
    serverRef.publish(topic, message);
  });

  logger.info("Redis pub/sub backplane initialised");
}

/**
 * Graceful shutdown — unsubscribe and disconnect the subscriber client.
 */
export async function shutdownPubSub(): Promise<void> {
  if (subscriber) {
    try {
      await subscriber.punsubscribe("ws:camera:*");
      subscriber.disconnect();
    } catch (err) {
      logger.error({ err }, "Error during pub/sub shutdown");
    }
    subscriber = null;
  }
  serverRef = null;
  logger.info("Redis pub/sub backplane shut down");
}
