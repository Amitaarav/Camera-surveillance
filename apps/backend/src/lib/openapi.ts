import { ValidationError } from "@/lib/validation";
import type { Hook } from "@hono/zod-openapi";

/**
 * Shared defaultHook for all OpenAPIHono instances.
 * The parent app's defaultHook does NOT propagate to sub-routers,
 * so each sub-router must receive this hook in its constructor.
 */
export const validationHook: Hook<any, any, any, any> = (result, c) => {
  if (!result.success) {
    throw new ValidationError(result.error.issues);
  }
};
