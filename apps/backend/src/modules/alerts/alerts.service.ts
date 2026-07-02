import { HTTPException } from "hono/http-exception";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { publishToCamera } from "@/realtime/pubsub";
import * as repository from "./alerts.repository";
import type { IngestAlertDto, ListAlertsQuery } from "./alerts.schema";

const DEDUPE_TTL_SECONDS = 5;

export async function ingestAlert(event: IngestAlertDto): Promise<boolean> {
  if (event.dedupe_key) {
    const dedupeRedisKey = `dedupe:${event.dedupe_key}`;

    const result = await redis.set(
      dedupeRedisKey,
      "1",
      "EX",
      DEDUPE_TTL_SECONDS,
      "NX",
    );

    if (result === null) {
      logger.debug(
        { dedupeKey: event.dedupe_key, eventId: event.event_id },
        "Alert deduplicated — skipping insert",
      );
      return false;
    }
  }

  const alert = await repository.insertAlert({
    eventType: event.event_type,
    cameraId: event.camera_id,
    userId: event.user_id,
    occurredAt: new Date(event.occurred_at),
    dedupeKey: event.dedupe_key ?? null,
    payload: event.payload ?? null,
  });

  logger.info(
    { alertId: alert?.id, cameraId: event.camera_id, eventType: event.event_type },
    "Alert ingested",
  );

  publishToCamera(event.camera_id, {
    type: "detection.person",
    cameraId: event.camera_id,
    payload: (event.payload ?? {}) as any,
    occurredAt: event.occurred_at,
  });

  return true;
}

export async function getAlerts(userId: string, query: ListAlertsQuery) {
  return repository.findAlerts(userId, query);
}

export async function getAlert(id: string, userId: string) {
  const alert = await repository.findById(id, userId);

  if (!alert) {
    throw new HTTPException(404, { message: "Alert not found" });
  }

  return { alert };
}
