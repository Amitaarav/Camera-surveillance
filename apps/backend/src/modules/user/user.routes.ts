import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { authMiddleware } from "@/middlewares/auth.middleware";
import * as userController from "./user.controller";
import type { AppBindings } from "@/app";
import { updateProfileSchema } from "./user.schema";
import { validationHook } from "@/lib/openapi";

const userRouter = new OpenAPIHono<AppBindings>({ defaultHook: validationHook });
userRouter.use("*", authMiddleware);

userRouter.openapi(
  createRoute({
    method: "get",
    path: "/me",
    tags: ["User"],
    responses: { 200: { description: "Get current user profile" } },
  }),
  userController.getMe
);

userRouter.openapi(
  createRoute({
    method: "patch",
    path: "/me",
    tags: ["User"],
    request: {
      body: { content: { "application/json": { schema: updateProfileSchema } } },
    },
    responses: { 200: { description: "Update user profile" } },
  }),
  userController.patchMe
);

export { userRouter };
