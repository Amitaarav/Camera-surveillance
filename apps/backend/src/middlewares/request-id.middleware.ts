import type { MiddlewareHandler } from "hono";
import { randomUUID } from "node:crypto";

const HEADER = "x-request-id";

/**
 * Generates or propagates an `x-request-id` header on every request.
 * Downstream code reads it from `c.get("requestId")`.
 */
export const requestIdMiddleware: MiddlewareHandler = async (c, next) => {
  const incoming = c.req.header(HEADER);
  const requestId = incoming ?? randomUUID();

  c.set("requestId", requestId);
  c.header(HEADER, requestId);

  await next();
};
