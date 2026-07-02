import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";

import { env } from "@/config/env";
import { db, sql } from "@/db/client";
import { redis } from "@/lib/redis";
import { requestIdMiddleware } from "@/middlewares/request-id.middleware";
import { loggerMiddleware } from "@/middlewares/logger.middleware";
import { errorHandler } from "@/middlewares/error-handler.middleware";
import { validationHook } from "@/lib/openapi";
import { authRouter } from "@/modules/auth/auth.routes";
import { userRouter } from "@/modules/user/user.routes";
import { camerasRouter } from "@/modules/cameras/cameras.routes";
import { alertsRouter } from "@/modules/alerts/alerts.routes";
import type { AuthTokenPayload } from "@/modules/auth/auth.utils";

export type AppBindings = {
  Variables: {
    requestId: string;
    /** Set by authMiddleware after verifying the Bearer JWT. */
    user: AuthTokenPayload;
  };
};

const app = new OpenAPIHono<AppBindings>({
  defaultHook: validationHook,
});
app.use("*", requestIdMiddleware);
app.use("*", loggerMiddleware);
app.use(
  "*",
  cors({
    origin: env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(","),
  }),
);

app.onError(errorHandler);

app.route("/auth", authRouter);
app.route("/user", userRouter);
app.route("/cameras", camerasRouter);
app.route("/alerts", alertsRouter);

app.get("/health", async (c) => {
  const checks: Record<string, "ok" | "error"> = {};

  try {
    await db.execute(sql`SELECT 1`);
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  try {
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
  }

  const healthy = Object.values(checks).every((s) => s === "ok");
  return c.json(
    { status: healthy ? "ok" : "degraded", checks },
    healthy ? 200 : 503,
  );
});

app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Camera Surveillance API",
  },
});

app.get("/swagger", swaggerUI({ url: "/doc" }));

export { app };
