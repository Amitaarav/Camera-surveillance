import { create } from "zustand";
import type {
  CameraStateValue,
  CameraStatsPayload,
  DetectionPersonPayload,
} from "../types/events";

/** Maximum detections kept per camera (ring buffer). */
const MAX_DETECTIONS_PER_CAMERA = 50;

/** Maximum recent alerts kept globally for the live feed. */
const MAX_RECENT_ALERTS = 100;

export interface RealtimeAlert {
  id: string;
  cameraId: string;
  cameraName?: string;
  payload: DetectionPersonPayload;
  occurredAt: string;
  receivedAt: number;
}

interface RealtimeState {
  /** Per-camera tile state machine: connecting | live | stopped | error */
  cameraStates: Record<string, CameraStateValue>;

  /** Per-camera latest stats snapshot */
  cameraStats: Record<string, CameraStatsPayload>;

  /** Per-camera recent detections (for bounding-box overlays) */
  cameraDetections: Record<string, DetectionPersonPayload[]>;

  /** Global recent alerts feed (newest first) */
  recentAlerts: RealtimeAlert[];

  /** WebSocket connection status */
  wsConnected: boolean;

  setCameraState: (cameraId: string, state: CameraStateValue) => void;
  setCameraStats: (cameraId: string, stats: CameraStatsPayload) => void;
  addDetection: (
    cameraId: string,
    detection: DetectionPersonPayload,
    occurredAt: string,
  ) => void;
  clearCamera: (cameraId: string) => void;
  setWsConnected: (connected: boolean) => void;
  reset: () => void;
}

const initialState = {
  cameraStates: {} as Record<string, CameraStateValue>,
  cameraStats: {} as Record<string, CameraStatsPayload>,
  cameraDetections: {} as Record<string, DetectionPersonPayload[]>,
  recentAlerts: [] as RealtimeAlert[],
  wsConnected: false,
};

export const useRealtimeStore = create<RealtimeState>((set) => ({
  ...initialState,

  setCameraState: (cameraId, state) =>
    set((s) => ({
      cameraStates: { ...s.cameraStates, [cameraId]: state },
    })),

  setCameraStats: (cameraId, stats) =>
    set((s) => ({
      cameraStats: { ...s.cameraStats, [cameraId]: stats },
    })),

  addDetection: (cameraId, detection, occurredAt) =>
    set((s) => {
      // Update per-camera detections (ring buffer)
      const existing = s.cameraDetections[cameraId] ?? [];
      const updated = [detection, ...existing].slice(
        0,
        MAX_DETECTIONS_PER_CAMERA,
      );

      // Add to global alert feed
      const alert: RealtimeAlert = {
        id: `${cameraId}:${detection.frame_ts_ms}`,
        cameraId,
        payload: detection,
        occurredAt,
        receivedAt: Date.now(),
      };

      const alerts = [alert, ...s.recentAlerts].slice(0, MAX_RECENT_ALERTS);

      return {
        cameraDetections: { ...s.cameraDetections, [cameraId]: updated },
        recentAlerts: alerts,
      };
    }),

  clearCamera: (cameraId) =>
    set((s) => {
      const { [cameraId]: _state, ...cameraStates } = s.cameraStates;
      const { [cameraId]: _stats, ...cameraStats } = s.cameraStats;
      const { [cameraId]: _dets, ...cameraDetections } = s.cameraDetections;
      return { cameraStates, cameraStats, cameraDetections };
    }),

  setWsConnected: (connected) => set({ wsConnected: connected }),

  reset: () => set(initialState),
}));
