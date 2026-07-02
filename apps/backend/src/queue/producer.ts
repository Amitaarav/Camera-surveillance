import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

export const STREAMS = {
  CAMERA_COMMANDS: "camera.commands",
  DETECTION_EVENTS: "detection.events",
  CAMERA_HEARTBEATS: "camera.heartbeats",
} as const;

export async function publishCameraCommand(
  cameraId: string,
  ownerId: string,
  action: "start" | "stop",
  rtspUrl: string,
  requestId?: string,
): Promise<string> {
  const fields: (string | string)[] = [
    "cameraId", cameraId,
    "ownerId", ownerId,
    "action", action,
    "rtspUrl", rtspUrl,
  ];


  if (requestId) {
    fields.push("requestId", requestId);
  }

  const messageId = await redis.xadd(
    STREAMS.CAMERA_COMMANDS,
    "*",
    ...fields,
  );

  logger.debug(
    { stream: STREAMS.CAMERA_COMMANDS, cameraId, action, messageId, requestId },
    "Published camera command",
  );

  if (!messageId) {
    throw new Error("Failed to publish camera command, received null messageId");
  }

  return messageId;
}
