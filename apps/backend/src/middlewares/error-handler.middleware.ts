import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/validation";

export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = c.get("requestId") ?? "-";

  if (err instanceof ValidationError) {
    logger.warn(
      { requestId, issues: err.issues },
      "Validation failed",
    );
    return c.json(
      {
        error: "Validation failed",
        issues: err.issues,
        requestId,
      },
      422,
    );
  }

  if (err instanceof HTTPException) {
    logger.warn(
      { requestId, status: err.status, message: err.message },
      `HTTPException: ${err.message}`,
    );
    return c.json(
      {
        error: err.message,
        statusCode: err.status,
        requestId,
      },
      err.status,
    );
  }

  logger.error(
    { requestId, err },
    `Unhandled error: ${err instanceof Error ? err.message : String(err)}`,
  );

  return c.json(
    {
      error: "Internal Server Error",
      statusCode: 500,
      requestId,
    },
    500,
  );
};
