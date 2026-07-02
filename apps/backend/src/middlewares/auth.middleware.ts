import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { verifyJwtToken } from "@/modules/auth/auth.utils";
import type { AppBindings } from "@/app";

const AUTH_HEADER = "authorization";

export const authMiddleware: MiddlewareHandler<AppBindings> = async (c, next) => {
  const authorization = c.req.header(AUTH_HEADER);

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    throw new HTTPException(401, { message: "Authorization required" });
  }

  const token = authorization.slice(7).trim();

  try {
    const user = await verifyJwtToken(token);
    c.set("user", user);
  } catch {
    throw new HTTPException(401, { message: "Invalid or expired token" });
  }

  await next();
};
