import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { authMiddleware } from "@/middlewares/auth.middleware";
import * as camerasController from "./cameras.controller";
import type { AppBindings } from "@/app";
import { createCameraSchema, updateCameraSchema, cameraIdParamSchema } from "./cameras.schema";
import { validationHook } from "@/lib/openapi";

const camerasRouter = new OpenAPIHono<AppBindings>({ defaultHook: validationHook });

camerasRouter.use("*", authMiddleware);

camerasRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    tags: ["Cameras"],
    request: {
      body: { content: { "application/json": { schema: createCameraSchema } } },
    },
    responses: { 201: { description: "Create camera" } },
  }),
  camerasController.create
);

camerasRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Cameras"],
    responses: { 200: { description: "List cameras" } },
  }),
  camerasController.list
);

camerasRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    tags: ["Cameras"],
    request: { params: cameraIdParamSchema },
    responses: { 200: { description: "Get camera by ID" } },
  }),
  camerasController.get
);

camerasRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}",
    tags: ["Cameras"],
    request: {
      params: cameraIdParamSchema,
      body: { content: { "application/json": { schema: updateCameraSchema } } },
    },
    responses: { 200: { description: "Update camera" } },
  }),
  camerasController.update
);

camerasRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["Cameras"],
    request: { params: cameraIdParamSchema },
    responses: { 200: { description: "Delete camera" } },
  }),
  camerasController.remove
);

camerasRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/start",
    tags: ["Cameras"],
    request: { params: cameraIdParamSchema },
    responses: { 200: { description: "Start camera" } },
  }),
  camerasController.start
);

camerasRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/stop",
    tags: ["Cameras"],
    request: { params: cameraIdParamSchema },
    responses: { 200: { description: "Stop camera" } },
  }),
  camerasController.stop
);

export { camerasRouter };
