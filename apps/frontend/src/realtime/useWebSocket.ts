/**
 * useWebSocket — production-grade native WebSocket hook.
 *
 * Features:
 *  - Query-param JWT auth (`?token=<jwt>`)
 *  - Exponential backoff reconnection (1s → 2s → 4s → … → 30s max)
 *  - Client-side ping keepalive (25s interval)
 *  - Typed message dispatch into the Zustand realtime store
 *  - subscribe/unsubscribe helpers for camera topic rooms
 *  - Teardown on unmount; no stale closures
 *
 * Usage:
 *   const { isConnected, subscribe, unsubscribe } = useWebSocket();
 */

import { useEffect, useRef, useCallback } from "react";
import { getTokens } from "../features/auth/store";
import { useRealtimeStore } from "../store/realtimeStore";
import type { WsClientMessage, WsServerMessage } from "../types/events";

// ─── Config ──────────────────────────────────────────────────────────────────

const WS_PATH = "/ws";
const INITIAL_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;
const PING_INTERVAL_MS = 25_000;
const BACKOFF_FACTOR = 2;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWsUrl(): string | null {
  const tokens = getTokens();
  if (!tokens?.accessToken) return null;

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${protocol}//${host}${WS_PATH}?token=${encodeURIComponent(tokens.accessToken)}`;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const retryDelayRef = useRef(INITIAL_RETRY_MS);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const subscribedCamerasRef = useRef<Set<string>>(new Set());



  const send = useCallback((msg: WsClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  const startPing = useCallback(() => {
    stopPing();
    pingTimerRef.current = setInterval(() => {
      send({ type: "ping" });
    }, PING_INTERVAL_MS);
  }, [send]);

  const stopPing = useCallback(() => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  }, []);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      let msg: WsServerMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      const store = useRealtimeStore.getState();

      switch (msg.type) {
        case "camera.status":
          store.setCameraState(msg.cameraId, msg.payload.state);
          break;

        case "camera.stats":
          store.setCameraStats(msg.cameraId, msg.payload);
          break;

        case "detection.person":
          store.addDetection(msg.cameraId, msg.payload, msg.occurredAt);
          break;

        case "auth.ok":
          if (subscribedCamerasRef.current.size > 0) {
            send({
              type: "subscribe",
              cameraIds: Array.from(subscribedCamerasRef.current),
            });
          }
          break;

        case "pong":
          break;

        case "error":
          console.error("[WS] Server error:", msg.message);
          break;

        default:
          break;
      }
    },
    [send],
  );

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const url = getWsUrl();
    if (!url) {
      retryTimerRef.current = setTimeout(
        connect,
        retryDelayRef.current,
      );
      return;
    }

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      retryDelayRef.current = INITIAL_RETRY_MS;
      useRealtimeStore.getState().setWsConnected(true);
      startPing();
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      if (!mountedRef.current) return;
      useRealtimeStore.getState().setWsConnected(false);
      stopPing();

      const delay = retryDelayRef.current;
      retryDelayRef.current = Math.min(
        delay * BACKOFF_FACTOR,
        MAX_RETRY_MS,
      );
      retryTimerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
    };
  }, [handleMessage, startPing, stopPing]);

  const subscribe = useCallback(
    (cameraIds: string[]) => {
      for (const id of cameraIds) {
        subscribedCamerasRef.current.add(id);
      }
      send({ type: "subscribe", cameraIds });
    },
    [send],
  );

  const unsubscribe = useCallback(
    (cameraIds: string[]) => {
      for (const id of cameraIds) {
        subscribedCamerasRef.current.delete(id);
      }
      send({ type: "unsubscribe", cameraIds });
    },
    [send],
  );

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      stopPing();

      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }

      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }

      useRealtimeStore.getState().setWsConnected(false);
    };
  }, [connect, stopPing]);

  return {
    isConnected: useRealtimeStore((s) => s.wsConnected),
    subscribe,
    unsubscribe,
  };
}
