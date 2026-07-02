import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { STREAMS } from "./producer";
import { ingestAlert } from "@/modules/alerts/alerts.service";
import { handleStatusEvent, handleStatsEvent } from "@/modules/cameras/cameras.service";
import type { IngestAlertDto } from "@/modules/alerts/alerts.schema";
import type { CameraStatusPayload, CameraStatsPayload } from "@/realtime/events";

const CONSUMER_GROUP = "backend-group";
const CONSUMER_NAME = `backend-${process.pid}`;

let isRunning = false;
let loopPromise: Promise<void> | null = null;

async function setupGroups() {
  for (const stream of [STREAMS.DETECTION_EVENTS, STREAMS.CAMERA_HEARTBEATS]) {
    try {
      await redis.xgroup("CREATE", stream, CONSUMER_GROUP, "0", "MKSTREAM");
      logger.info({ stream, group: CONSUMER_GROUP }, "Created Redis Stream consumer group");
    } catch (err: any) {
      if (err.message && err.message.includes("BUSYGROUP")) {
        logger.debug({ stream, group: CONSUMER_GROUP }, "Consumer group already exists");
      } else {
        logger.error({ err, stream }, "Failed to setup consumer group");
        throw err;
      }
    }
  }
}

async function consumeLoop() {
  logger.info({ consumer: CONSUMER_NAME }, "Starting queue consumer loop");

  while (isRunning) {
    try {
      const result = await redis.xreadgroup(
        "GROUP",
        CONSUMER_GROUP,
        CONSUMER_NAME,
        "COUNT",
        10,
        "BLOCK",
        2000,
        "STREAMS",
        STREAMS.DETECTION_EVENTS,
        STREAMS.CAMERA_HEARTBEATS,
        ">",
        ">"
      ) as any;

      if (!result) {
        continue;
      }

      for (const [stream, messages] of result) {
        for (const message of messages) {
          const [id, fields] = message;
          
          const data: Record<string, string> = {};
          for (let i = 0; i < fields.length; i += 2) {
            data[fields[i]!] = fields[i + 1]!;
          }

          try {
            await handleMessage(stream, id, data);
            await redis.xack(stream, CONSUMER_GROUP, id);
          } catch (err) {
            logger.error({ err, stream, messageId: id, data }, "Error processing queue message");
            await redis.xack(stream, CONSUMER_GROUP, id);
          }
        }
      }
    } catch (err: any) {
      if (!isRunning) break;
      logger.error({ err }, "Queue consumer loop encountered an error");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  logger.info("Queue consumer loop stopped");
}

async function handleMessage(stream: string, id: string, data: Record<string, string>) {
  logger.debug({ stream, messageId: id }, "Processing queue message");

  if (stream === STREAMS.DETECTION_EVENTS) {
    const eventType = data.event_type;
    const cameraId = data.camera_id;
    const userId = data.user_id;
    const occurredAt = data.occurred_at;
    const dedupeKey = data.dedupe_key;
    const payloadStr = data.payload;

    if (!eventType || !cameraId || !userId || !occurredAt) {
      throw new Error("Missing required event envelope fields");
    }

    let payload: Record<string, unknown> = {};
    if (payloadStr) {
      try {
        payload = JSON.parse(payloadStr);
      } catch {
        logger.warn({ payloadStr }, "Invalid payload JSON in detection event");
      }
    }

    const ingestDto: IngestAlertDto = {
      event_id: id, // here use Redis message ID as event ID or fallback to uuid if provided
      event_type: eventType,
      camera_id: cameraId,
      user_id: userId,
      occurred_at: occurredAt,
      dedupe_key: dedupeKey,
      payload,
    };

    await ingestAlert(ingestDto);

  } else if (stream === STREAMS.CAMERA_HEARTBEATS) {
    const eventType = data.event_type;
    const cameraId = data.camera_id;

    if (!eventType || !cameraId) {
      throw new Error("Missing required heartbeat fields");
    }

    if (eventType === "camera.status") {
      const state = data.state;
      const reason = data.reason || null;
      const fps = parseFloat(data.fps || "0");

      if (!state) throw new Error("Missing status state");

      const statusPayload: CameraStatusPayload = {
        state: state as any,
        reason,
        fps,
      };

      await handleStatusEvent(cameraId, statusPayload);

    } else if (eventType === "camera.stats") {
      const fps = parseFloat(data.fps || "0");
      const detectionsLastMin = parseInt(data.detections_last_min || "0", 10);
      const queueLagMs = parseInt(data.queue_lag_ms || "0", 10);

      const statsPayload: CameraStatsPayload = {
        fps,
        detections_last_min: detectionsLastMin,
        queue_lag_ms: queueLagMs,
      };

      await handleStatsEvent(cameraId, statsPayload);
    } else {
      logger.warn({ eventType }, "Unknown heartbeat event type");
    }
  }
}

/**
 * Start the background consumer.
 */
export async function startQueueConsumer() {
  if (isRunning) return;
  isRunning = true;

  await setupGroups();
  loopPromise = consumeLoop();
}

/**
 * Stop the background consumer gracefully.
 */
export async function stopQueueConsumer() {
  if (!isRunning) return;
  isRunning = false;

  logger.info("Stopping queue consumer...");
  if (loopPromise) {
    await loopPromise;
    loopPromise = null;
  }
}
