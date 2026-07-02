export type BBox = [x: number, y: number, w: number, h: number];

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

export type WsClientMessage =
  | { type: "subscribe"; cameraIds: string[] }
  | { type: "unsubscribe"; cameraIds: string[] }
  | { type: "auth"; token: string }
  | { type: "ping" };

export type WsServerMessage =
  | {
      type: "detection.person";
      cameraId: string;
      payload: DetectionPersonPayload;
      occurredAt: string;
    }
  | { type: "camera.status"; cameraId: string; payload: CameraStatusPayload }
  | { type: "camera.stats"; cameraId: string; payload: CameraStatsPayload }
  | { type: "subscribed"; cameraIds: string[] }
  | { type: "unsubscribed"; cameraIds: string[] }
  | { type: "error"; message: string }
  | { type: "auth.ok"; userId: string }
  | { type: "pong" };
