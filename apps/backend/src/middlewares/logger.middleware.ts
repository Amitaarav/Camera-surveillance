import type { MiddlewareHandler } from "hono";
import { logger } from "@/lib/logger";

export const loggerMiddleware: MiddlewareHandler = async (c, next) => {
  const start = performance.now();
  const requestId = c.get("requestId") ?? "-";

  try {
    await next();
  } finally {
    const duration = Math.round(performance.now() - start);

    logger.info(
      {
        requestId,
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: duration
      },
      "Request completed"
    );
  }
};