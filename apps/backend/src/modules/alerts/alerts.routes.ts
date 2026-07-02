import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { authMiddleware } from "@/middlewares/auth.middleware";
import * as alertsController from "./alerts.controller";
import type { AppBindings } from "@/app";
import { listAlertsQuerySchema, alertIdParamSchema } from "./alerts.schema";
import { validationHook } from "@/lib/openapi";

const alertsRouter = new OpenAPIHono<AppBindings>({ defaultHook: validationHook });

alertsRouter.use("*", authMiddleware);

alertsRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Alerts"],
    request: {
      query: listAlertsQuerySchema,
    },
    responses: {
      200: { description: "Paginated list of alerts" },
    },
  }),
  alertsController.list,
);

alertsRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    tags: ["Alerts"],
    request: {
      params: alertIdParamSchema,
    },
    responses: {
      200: { description: "Single alert by ID" },
    },
  }),
  alertsController.get,
);

export { alertsRouter };
