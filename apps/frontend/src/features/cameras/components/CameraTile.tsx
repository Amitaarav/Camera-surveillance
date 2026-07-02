import { useEffect, useRef, useState } from "react";
import { useRealtimeStore } from "../../../store/realtimeStore";
import { useWebRTC } from "../../../realtime/useWebRTC";
import { useWs } from "../../../realtime/WebSocketProvider";
import { AlertCircle, RefreshCw, Square } from "lucide-react";
import { Badge } from "../../../components/ui/badge";

interface CameraTileProps {
  cameraId: string;
  desiredState: "started" | "stopped";
}

export function CameraTile({ cameraId, desiredState }: CameraTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Realtime states from Zustand
  const state = useRealtimeStore((s) => s.cameraStates[cameraId] ?? (desiredState === "started" ? "connecting" : "stopped"));
  const stats = useRealtimeStore((s) => s.cameraStats[cameraId]);
  const detections = useRealtimeStore((s) => s.cameraDetections[cameraId]);
  
  const { subscribe, unsubscribe } = useWs();
  const { connectionState, start, stop } = useWebRTC(cameraId, videoRef);

  // Track if we are subscribed to WS updates for this camera
  useEffect(() => {
    if (state === "live" || state === "connecting") {
      subscribe([cameraId]);
    }
    return () => {
      unsubscribe([cameraId]);
    };
  }, [cameraId, state, subscribe, unsubscribe]);

  // Manage WebRTC stream based on camera state
  useEffect(() => {
    if (state === "live") {
      start();
    } else {
      stop();
    }
    return () => {
      stop();
    };
  }, [state, start, stop]);

  // Draw bounding boxes on canvas when detections update
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !detections || detections.length === 0) {
      // Clear canvas if no detections
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas display resolution to its container
    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const latest = detections[0];
    const nativeWidth = video.videoWidth || 640;
    const nativeHeight = video.videoHeight || 480;

    const scaleX = canvas.width / nativeWidth;
    const scaleY = canvas.height / nativeHeight;

    latest.detections.forEach((det) => {
      const [x, y, w, h] = det.bbox;
      const rx = x * scaleX;
      const ry = y * scaleY;
      const rw = w * scaleX;
      const rh = h * scaleY;

      // Premium neon green stroke/glow
      ctx.strokeStyle = "#22C55E";
      ctx.lineWidth = 2;
      ctx.shadowColor = "rgba(34, 197, 94, 0.5)";
      ctx.shadowBlur = 6;
      ctx.strokeRect(rx, ry, rw, rh);

      // Label background
      ctx.shadowBlur = 0; // reset shadow for text
      ctx.fillStyle = "rgba(34, 197, 94, 0.85)";
      const labelText = `${det.label} ${(det.confidence * 100).toFixed(0)}%`;
      ctx.font = "bold 10px Inter, sans-serif";
      const textWidth = ctx.measureText(labelText).width;
      
      // Draw label background flag
      ctx.fillRect(rx, ry - 16, textWidth + 12, 16);

      // Label text
      ctx.fillStyle = "#ffffff";
      ctx.fillText(labelText, rx + 6, ry - 4);
    });

    // Clear bounding boxes after 1.5 seconds if no new updates arrive
    const timer = setTimeout(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 1500);

    return () => clearTimeout(timer);
  }, [detections]);

  // Status variants for rendering
  const renderStatus = () => {
    switch (state) {
      case "connecting":
        return (
          <div className="flex flex-col items-center gap-2 text-text-secondary animate-pulse-dot">
            <RefreshCw className="h-6 w-6 text-primary animate-spin" />
            <span className="text-xs font-medium">Connecting stream...</span>
          </div>
        );
      case "error":
        return (
          <div className="flex flex-col items-center gap-2 text-danger">
            <AlertCircle className="h-6 w-6" />
            <span className="text-xs font-medium">Camera connection failed</span>
          </div>
        );
      case "live":
        return (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover rounded-lg bg-black"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 pointer-events-none w-full h-full rounded-lg"
            />
          </div>
        );
      case "stopped":
      default:
        return (
          <div className="flex flex-col items-center gap-2 text-text-muted">
            <Square className="h-6 w-6 opacity-30" />
            <span className="text-xs font-medium">Stream Stopped</span>
          </div>
        );
    }
  };

  return (
    <div className="relative aspect-video w-full bg-surface-hover border-b border-border p-3 select-none overflow-hidden">
      <div className="h-full w-full rounded-lg bg-background flex items-center justify-center border border-border/50 overflow-hidden relative">
        {renderStatus()}

        {/* Live overlay badges */}
        {state === "live" && (
          <div className="absolute left-2 top-2 flex flex-col gap-1 pointer-events-none z-10">
            {stats && (
              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-medium text-text-secondary tabular-nums">
                <span>FPS: {stats.fps.toFixed(1)}</span>
                <span className="opacity-40">•</span>
                <span>Lag: {stats.queue_lag_ms}ms</span>
              </div>
            )}
          </div>
        )}

        <div className="absolute right-2 top-2 z-10">
          <Badge
            variant={
              state === "live"
                ? "success"
                : state === "connecting"
                ? "warning"
                : state === "error"
                ? "danger"
                : "secondary"
            }
            className="capitalize"
          >
            {state}
          </Badge>
        </div>
      </div>
    </div>
  );
}
