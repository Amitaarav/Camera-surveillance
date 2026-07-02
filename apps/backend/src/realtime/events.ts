export interface EventEnvelope<T = unknown> {
  schema_version: "1.0";
  event_id: string;
  event_type: EventType;
  camera_id: string;
  user_id: string;
  occurred_at: string; // ISO-8601
  received_at: string; // ISO-8601, set by backend on ingestion
  dedupe_key: string | null;
  payload: T;
}

export const EVENT_TYPES = [
  "detection.person",
  "camera.status",
  "camera.stats",
  "camera.command",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type BBox = [number, number, number, number];

export interface Detection {
  label: string;
  confidence: number;
  bbox: BBox;
}

export interface DetectionPersonPayload {
  frame_ts_ms: number;
  detections: Detection[];
  model: {
    name: string;
    version: string;
  };
}

export type CameraStateValue = "stopped" | "connecting" | "live" | "error";

export interface CameraStatusPayload {
  state: CameraStateValue;
  reason: string | null;
  fps: number;
}

export interface CameraStatsPayload {
  fps: number;
  detections_last_min: number;
  queue_lag_ms: number;
}

export interface CameraCommandPayload {
  action: "start" | "stop";
  rtsp_url: string;
}

export type DetectionEvent = EventEnvelope<DetectionPersonPayload>;
export type CameraStatusEvent = EventEnvelope<CameraStatusPayload>;
export type CameraStatsEvent = EventEnvelope<CameraStatsPayload>;
export type CameraCommandEvent = EventEnvelope<CameraCommandPayload>;

export type WsClientMessage =
  | { type: "subscribe"; cameraIds: string[] }
  | { type: "unsubscribe"; cameraIds: string[] }
  | { type: "auth"; token: string }
  | { type: "ping" };

export type WsServerMessage =
  | { type: "detection.person"; cameraId: string; payload: DetectionPersonPayload; occurredAt: string }
  | { type: "camera.status"; cameraId: string; payload: CameraStatusPayload }
  | { type: "camera.stats"; cameraId: string; payload: CameraStatsPayload }
  | { type: "subscribed"; cameraIds: string[] }
  | { type: "unsubscribed"; cameraIds: string[] }
  | { type: "error"; message: string }
  | { type: "auth.ok"; userId: string }
  | { type: "pong" };
