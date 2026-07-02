import { HTTPException } from "hono/http-exception";
import * as repository from "./cameras.repository";
import type { CreateCameraDto, UpdateCameraDto } from "./cameras.schema";
import type { DesiredState } from "@repo/db/schema";
import { publishCameraCommand } from "@/queue/producer";
import { publishToCamera } from "@/realtime/pubsub";
import { logger } from "@/lib/logger";
import type {
  CameraStatusPayload,
  CameraStatsPayload,
  CameraStateValue,
} from "@/realtime/events";

export async function createCamera(userId: string, data: CreateCameraDto) {
  const camera = await repository.create(userId, data);

  if (!camera) {
    throw new HTTPException(500, { message: "Failed to create camera" });
  }

  return { camera };
}

export async function getCameras(userId: string) {
  const cameras = await repository.findAllByUserId(userId);
  return { cameras };
}

export async function getCamera(id: string, userId: string) {
  const camera = await repository.findByIdAndUserId(id, userId);

  if (!camera) {
    throw new HTTPException(404, { message: "Camera not found" });
  }

  return { camera };
}

export async function updateCamera(
  id: string,
  userId: string,
  data: UpdateCameraDto,
) {
  const camera = await repository.update(id, userId, data);

  if (!camera) {
    throw new HTTPException(404, { message: "Camera not found" });
  }

  return { camera };
}

export async function deleteCamera(id: string, userId: string) {
  const deleted = await repository.deleteCamera(id, userId);

  if (!deleted) {
    throw new HTTPException(404, { message: "Camera not found" });
  }

  return { success: true };
}

export async function setCameraDesiredState(
  id: string,
  userId: string,
  state: DesiredState,
  requestId?: string,
) {
  const camera = await repository.setDesiredState(id, userId, state);

  if (!camera) {
    throw new HTTPException(404, { message: "Camera not found" });
  }

  // Map desiredState ("started"/"stopped") → command action ("start"/"stop")
  const action = state === "started" ? "start" : "stop";

  // Publish 'camera.command' message to Redis Stream so the
  // Go worker can pick up the state change and start/stop RTSP ingestion.
  await publishCameraCommand(id, camera.ownerId, action, camera.rtspUrl, requestId);


  return { camera };
}

// ─────────────────────────────────────────────────────────────────────────────
// Event handlers — called by the queue consumer, NOT by REST controllers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle a camera.status event from the worker.
 * Updates the camera's `currentState` in Postgres and broadcasts via WS.
 */
export async function handleStatusEvent(
  cameraId: string,
  payload: CameraStatusPayload,
) {
  const updated = await repository.updateCurrentState(
    cameraId,
    payload.state as CameraStateValue,
  );

  if (!updated) {
    logger.warn({ cameraId, payload }, "Status event for unknown camera");
    return;
  }

  // Broadcast to all WS subscribers of this camera
  publishToCamera(cameraId, {
    type: "camera.status",
    cameraId,
    payload,
  });
}

/**
 * Handle a camera.stats event from the worker.
 * Upserts the `camera_stats` row and broadcasts via WS.
 */
export async function handleStatsEvent(
  cameraId: string,
  payload: CameraStatsPayload,
) {
  await repository.upsertStats(cameraId, {
    fps: payload.fps,
    detectionsLastMin: payload.detections_last_min,
    queueLagMs: payload.queue_lag_ms,
  });

  // Broadcast to all WS subscribers of this camera
  publishToCamera(cameraId, {
    type: "camera.stats",
    cameraId,
    payload,
  });
}
