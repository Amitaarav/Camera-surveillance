/**
 * WebSocket gateway — Bun-native WebSocket with JWT auth and topic rooms.
 *
 * Supports two auth modes for maximum compatibility:
 *
 *   1. **Query-param auth** (preferred):
 *      `ws://host/ws?token=<JWT>` — token verified on HTTP upgrade.
 *      Connection is authenticated immediately.
 *
 *   2. **First-message auth** (fallback for proxies that strip query strings):
 *      `ws://host/ws` — connection opens unauthenticated.
 *      Client must send `{ "type": "auth", "token": "<JWT>" }` as the first message.
 *      All other messages are rejected until auth succeeds.
 *
 * Security:
 *   - Camera ownership is verified on subscribe (DB lookup).
 *   - Ping/pong keeps connections alive and evicts dead sockets.
 *   - Unauthenticated sockets are closed after AUTH_TIMEOUT_MS.
 */

import type { ServerWebSocket } from "bun";
import { verifyJwtToken } from "@/modules/auth/auth.utils";
import { filterOwnedCameraIds } from "@/modules/cameras/cameras.repository";
import { logger } from "@/lib/logger";
import type { WsClientMessage } from "./events";

// Types

export interface WsData {
  /** Set after successful auth. Null while awaiting first-message auth. */
  userId: string | null;
  email: string | null;
  /** Cameras this socket is subscribed to. */
  subscribedCameras: Set<string>;
  /** Timer for first-message auth timeout. */
  authTimer: ReturnType<typeof setTimeout> | null;
  /** Ping/pong tracking — last pong received. */
  lastPong: number;
}

// Constants

/** How long an unauthenticated connection has to send auth message. */
const AUTH_TIMEOUT_MS = 5_000;

/** Interval between server-sent pings. */
const PING_INTERVAL_MS = 30_000;

/** If no pong received within this window after a ping, close the socket. */
const PONG_TIMEOUT_MS = 10_000;

/** Max cameras a single socket can subscribe to (prevent abuse). */
const MAX_SUBSCRIPTIONS = 50;

/** Max message size from client (prevent oversized payloads). */
export const MAX_MESSAGE_SIZE = 4_096; // bytes

// Connection tracking

const activeSockets = new Set<ServerWebSocket<WsData>>();
let pingInterval: ReturnType<typeof setInterval> | null = null;

// Upgrade handler — called from server.ts fetch

/**
 * Attempt to upgrade an HTTP request to WebSocket.
 *
 * Returns the WsData to attach to the socket, or null if auth failed
 * and we should try first-message auth instead.
 */
export async function handleUpgrade(
  req: Request,
): Promise<{ authenticated: boolean; data: WsData }> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (token) {
    try {
      const user = await verifyJwtToken(token);
      return {
        authenticated: true,
        data: {
          userId: user.sub,
          email: user.email,
          subscribedCameras: new Set(),
          authTimer: null,
          lastPong: Date.now(),
        },
      };
    } catch {
      // Token invalid — reject with auth error
      // We'll still create the socket but mark it unauthenticated
      // so it gets the auth timeout treatment
      logger.warn("WS upgrade: invalid token in query param");
    }
  }

  // No token or invalid token — allow connection for first-message auth
  return {
    authenticated: false,
    data: {
      userId: null,
      email: null,
      subscribedCameras: new Set(),
      authTimer: null,
      lastPong: Date.now(),
    },
  };
}

// WebSocket handlers (passed to Bun.serve({ websocket: ... }))

export const websocketHandlers = {
  open(ws: ServerWebSocket<WsData>) {
    activeSockets.add(ws);

    if (ws.data.userId) {
      // Already authenticated via query-param
      logger.debug(
        { userId: ws.data.userId },
        "WS: authenticated connection opened",
      );
      ws.send(JSON.stringify({ type: "auth.ok", userId: ws.data.userId }));
    } else {
      // Start auth timeout — close if no auth message received
      ws.data.authTimer = setTimeout(() => {
        logger.warn("WS: auth timeout — closing unauthenticated socket");
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Authentication timeout — send auth message or reconnect with ?token=",
          }),
        );
        ws.close(4001, "Authentication timeout");
      }, AUTH_TIMEOUT_MS);

      logger.debug("WS: unauthenticated connection opened — awaiting auth message");
    }
  },

  async message(ws: ServerWebSocket<WsData>, rawMessage: string | Buffer) {
    let msg: WsClientMessage;

    try {
      const text =
        typeof rawMessage === "string"
          ? rawMessage
          : new TextDecoder().decode(rawMessage);
      msg = JSON.parse(text);
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    // First-message auth 
    if (msg.type === "auth") {
      if (ws.data.userId) {
        ws.send(
          JSON.stringify({ type: "error", message: "Already authenticated" }),
        );
        return;
      }

      try {
        const user = await verifyJwtToken(msg.token);
        ws.data.userId = user.sub;
        ws.data.email = user.email;

        // Clear auth timeout
        if (ws.data.authTimer) {
          clearTimeout(ws.data.authTimer);
          ws.data.authTimer = null;
        }

        logger.debug({ userId: user.sub }, "WS: first-message auth succeeded");
        ws.send(JSON.stringify({ type: "auth.ok", userId: user.sub }));
      } catch {
        ws.send(
          JSON.stringify({ type: "error", message: "Invalid or expired token" }),
        );
        ws.close(4002, "Invalid token");
      }
      return;
    }

    //  Reject all messages from unauthenticated sockets 
    if (!ws.data.userId) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Not authenticated — send auth message first",
        }),
      );
      return;
    }

    //  Ping/pong 
    if (msg.type === "ping") {
      ws.send(JSON.stringify({ type: "pong" }));
      return;
    }

    //  Subscribe 
    if (msg.type === "subscribe") {
      if (
        !Array.isArray(msg.cameraIds) ||
        msg.cameraIds.length === 0 ||
        msg.cameraIds.some((id) => typeof id !== "string")
      ) {
        ws.send(
          JSON.stringify({ type: "error", message: "cameraIds must be a non-empty array of UUIDs" }),
        );
        return;
      }

      // Enforce subscription limit
      const totalAfter = ws.data.subscribedCameras.size + msg.cameraIds.length;
      if (totalAfter > MAX_SUBSCRIPTIONS) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: `Max ${MAX_SUBSCRIPTIONS} subscriptions per connection`,
          }),
        );
        return;
      }

      //  Ownership check — only allow subscribing to owned cameras 
      const ownedIds = await filterOwnedCameraIds(
        msg.cameraIds,
        ws.data.userId,
      );

      const rejected = msg.cameraIds.filter((id) => !ownedIds.includes(id));
      if (rejected.length > 0) {
        logger.warn(
          { userId: ws.data.userId, rejected },
          "WS: subscribe rejected — cameras not owned",
        );
      }

      // Subscribe to owned cameras only
      for (const id of ownedIds) {
        if (!ws.data.subscribedCameras.has(id)) {
          ws.subscribe(`camera:${id}`);
          ws.data.subscribedCameras.add(id);
        }
      }

      ws.send(JSON.stringify({ type: "subscribed", cameraIds: ownedIds }));

      if (rejected.length > 0) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: `Access denied to cameras: ${rejected.join(", ")}`,
          }),
        );
      }
      return;
    }

    //  Unsubscribe 
    if (msg.type === "unsubscribe") {
      if (!Array.isArray(msg.cameraIds)) {
        ws.send(
          JSON.stringify({ type: "error", message: "cameraIds must be an array" }),
        );
        return;
      }

      for (const id of msg.cameraIds) {
        ws.unsubscribe(`camera:${id}`);
        ws.data.subscribedCameras.delete(id);
      }

      ws.send(JSON.stringify({ type: "unsubscribed", cameraIds: msg.cameraIds }));
      return;
    }

    //  Unknown message 
    ws.send(
      JSON.stringify({ type: "error", message: `Unknown message type: ${(msg as any).type}` }),
    );
  },

  close(ws: ServerWebSocket<WsData>, code: number, reason: string) {
    // Clean up auth timer
    if (ws.data.authTimer) {
      clearTimeout(ws.data.authTimer);
    }

    // Unsubscribe from all topics
    for (const id of ws.data.subscribedCameras) {
      ws.unsubscribe(`camera:${id}`);
    }

    activeSockets.delete(ws);

    logger.debug(
      { userId: ws.data.userId, code, reason },
      "WS: connection closed",
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Ping/pong health check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Start the periodic ping loop. Call once after server starts.
 */
export function startPingLoop(): void {
  if (pingInterval) return;

  pingInterval = setInterval(() => {
    const now = Date.now();

    for (const ws of activeSockets) {
      // Check if last pong was too long ago
      if (now - ws.data.lastPong > PING_INTERVAL_MS + PONG_TIMEOUT_MS) {
        logger.debug(
          { userId: ws.data.userId },
          "WS: closing dead connection (pong timeout)",
        );
        ws.close(4003, "Pong timeout");
        continue;
      }

      // Send ping
      try {
        ws.send(JSON.stringify({ type: "ping" }));
      } catch {
        // Socket already closed
        activeSockets.delete(ws);
      }
    }
  }, PING_INTERVAL_MS);

  logger.info("WS: ping loop started");
}

/**
 * Stop the ping loop. Call during graceful shutdown.
 */
export function stopPingLoop(): void {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
}

/**
 * Get the count of active WebSocket connections.
 * Useful for health checks and future metrics.
 */
export function getActiveConnectionCount(): number {
  return activeSockets.size;
}
