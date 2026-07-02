import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import * as authController from "./auth.controller";
import { loginSchema, registerSchema, refreshSchema, logoutSchema } from "./auth.schema";
import { validationHook } from "@/lib/openapi";

const authRouter = new OpenAPIHono({ defaultHook: validationHook });

authRouter.openapi(
  createRoute({
    method: "post",
    path: "/register",
    tags: ["Auth"],
    request: {
      body: { content: { "application/json": { schema: registerSchema } } },
    },
    responses: { 201: { description: "User registered successfully" } },
  }),
  authController.register
);

authRouter.openapi(
  createRoute({
    method: "post",
    path: "/login",
    tags: ["Auth"],
    request: {
      body: { content: { "application/json": { schema: loginSchema } } },
    },
    responses: { 200: { description: "User logged in successfully" } },
  }),
  authController.login
);

authRouter.openapi(
  createRoute({
    method: "post",
    path: "/refresh",
    tags: ["Auth"],
    request: {
      body: { content: { "application/json": { schema: refreshSchema } } },
    },
    responses: { 200: { description: "Token refreshed successfully" } },
  }),
  authController.refresh
);

authRouter.openapi(
  createRoute({
    method: "post",
    path: "/logout",
    tags: ["Auth"],
    request: {
      body: { content: { "application/json": { schema: logoutSchema } } },
    },
    responses: { 204: { description: "User logged out successfully" } },
  }),
  authController.logout
);

export { authRouter };
