import { useState } from "react";
import { useRealtimeStore } from "../../../store/realtimeStore";
import { useAlerts } from "../hooks";
import { Badge } from "../../../components/ui/badge";
import {
  AlertTriangle,
  Clock,
  Eye,
  Activity,
  ChevronDown,
  Wifi,
  WifiOff,
} from "lucide-react";

interface AlertFeedProps {
  /** Only show alerts for this camera. Omit for all cameras. */
  cameraId?: string;
  /** Compact mode for sidebar panels. */
  compact?: boolean;
  /** Maximum items to show in live mode. */
  maxItems?: number;
}

export function AlertFeed({
  cameraId,
  compact = false,
  maxItems = 20,
}: AlertFeedProps) {
  const [mode, setMode] = useState<"live" | "history">("live");
  const wsConnected = useRealtimeStore((s) => s.wsConnected);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border px-1 pb-2 mb-3">
        <button
          onClick={() => setMode("live")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            mode === "live"
              ? "bg-primary/10 text-primary"
              : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
          }`}
        >
          <Activity className="h-3 w-3" />
          Live
          {wsConnected ? (
            <Wifi className="h-3 w-3 text-success" />
          ) : (
            <WifiOff className="h-3 w-3 text-danger" />
          )}
        </button>
        <button
          onClick={() => setMode("history")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            mode === "history"
              ? "bg-primary/10 text-primary"
              : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
          }`}
        >
          <Clock className="h-3 w-3" />
          History
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1 scrollbar-thin">
        {mode === "live" ? (
          <LiveAlertList
            cameraId={cameraId}
            maxItems={maxItems}
            compact={compact}
          />
        ) : (
          <HistoryAlertList cameraId={cameraId} compact={compact} />
        )}
      </div>
    </div>
  );
}

function LiveAlertList({
  cameraId,
  maxItems,
  compact,
}: {
  cameraId?: string;
  maxItems: number;
  compact: boolean;
}) {
  const alerts = useRealtimeStore((s) => s.recentAlerts);

  const filtered = cameraId
    ? alerts.filter((a) => a.cameraId === cameraId)
    : alerts;

  const display = filtered.slice(0, maxItems);

  if (display.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-text-muted">
          <Eye className="h-5 w-5" />
        </div>
        <p className="text-sm text-text-muted">
          No live detections yet.
        </p>
        <p className="text-xs text-text-muted mt-1">
          Events will appear here in real-time.
        </p>
      </div>
    );
  }

  return (
    <>
      {display.map((alert) => (
        <AlertRow
          key={alert.id}
          cameraId={alert.cameraId}
          eventType="detection.person"
          occurredAt={alert.occurredAt}
          detectionCount={alert.payload.detections.length}
          confidence={
            alert.payload.detections[0]?.confidence ?? 0
          }
          compact={compact}
          isLive
        />
      ))}
    </>
  );
}

function HistoryAlertList({
  cameraId,
  compact,
}: {
  cameraId?: string;
  compact: boolean;
}) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useAlerts({ cameraId, limit: 20 });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-lg bg-surface-hover animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-danger mb-2" />
        <p className="text-sm text-danger">Failed to load alerts</p>
      </div>
    );
  }

  const alerts = data?.pages.flatMap((p) => p.data) ?? [];

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-text-muted">
          <Clock className="h-5 w-5" />
        </div>
        <p className="text-sm text-text-muted">No alerts found.</p>
      </div>
    );
  }

  return (
    <>
      {alerts.map((alert) => {
        const payload = alert.payload as Record<string, unknown> | null;
        const detections = (payload?.detections as unknown[]) ?? [];
        const firstDetection = detections[0] as
          | { confidence?: number }
          | undefined;

        return (
          <AlertRow
            key={alert.id}
            cameraId={alert.cameraId}
            eventType={alert.eventType}
            occurredAt={alert.occurredAt}
            detectionCount={detections.length}
            confidence={firstDetection?.confidence ?? 0}
            compact={compact}
          />
        );
      })}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="flex w-full items-center justify-center gap-1.5 py-2 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors disabled:opacity-50"
        >
          {isFetchingNextPage ? (
            <span className="h-3 w-3 border-2 border-text-muted border-t-transparent rounded-full animate-spinner" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          Load more
        </button>
      )}
    </>
  );
}

function AlertRow({
  cameraId,
  occurredAt,
  detectionCount,
  confidence,
  compact,
  isLive,
}: {
  cameraId: string;
  eventType: string;
  occurredAt: string;
  detectionCount: number;
  confidence: number;
  compact: boolean;
  isLive?: boolean;
}) {
  const timeStr = formatTime(occurredAt);
  const confidenceStr = `${(confidence * 100).toFixed(0)}%`;

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-all hover:bg-surface-hover hover:border-border/50 ${
        isLive ? "animate-fade-in" : ""
      }`}
    >
      {/* Indicator */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isLive
            ? "bg-danger/10 text-danger"
            : "bg-warning/10 text-warning"
        }`}
      >
        <AlertTriangle className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate">
            Person Detected
          </span>
          {isLive && (
            <span className="flex h-1.5 w-1.5 rounded-full bg-danger animate-pulse-dot" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-muted truncate">
            {cameraId.slice(0, 8)}…
          </span>
          {!compact && (
            <>
              <span className="text-xs text-text-muted">•</span>
              <span className="text-xs text-text-muted">
                {detectionCount} detection{detectionCount !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <Badge
          variant={confidence >= 0.8 ? "danger" : confidence >= 0.5 ? "warning" : "secondary"}
          className="text-[10px] px-1.5 py-0"
        >
          {confidenceStr}
        </Badge>
        <span className="text-[10px] text-text-muted tabular-nums">
          {timeStr}
        </span>
      </div>
    </div>
  );
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 5) return "just now";
    if (diffSec < 60) return `${diffSec}s ago`;

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
}
