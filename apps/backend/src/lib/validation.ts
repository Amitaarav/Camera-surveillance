import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import type { z } from "zod";

export class ValidationError extends Error {
  public readonly status = 422;

  constructor(public readonly issues: z.ZodIssue[]) {
    super("Request validation failed");
  }
}

export async function validateJsonBody<T>(c: Context, schema: z.ZodType<T>) {
  let payload: unknown;

  try {
    payload = await c.req.json();
  } catch {
    throw new HTTPException(400, {message: "Request body must be valid JSON"});
  }

  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new ValidationError(result.error.issues);
  }

  return result.data;
}
