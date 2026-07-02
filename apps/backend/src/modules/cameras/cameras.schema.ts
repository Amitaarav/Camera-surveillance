import { z } from "zod";

export const createCameraSchema = z.object({
  name: z.string().min(1).max(255),
  rtspUrl: z.url(),
  location: z.string().max(255).optional(),
  enabled: z.boolean().default(true),
});

export const updateCameraSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  rtspUrl: z.url().optional(),
  location: z.string().max(255).optional(),
  enabled: z.boolean().optional(),
});

export const cameraIdParamSchema = z.object({
  id: z.uuid("Invalid camera ID"),
});

export type CreateCameraDto = z.infer<typeof createCameraSchema>;
export type UpdateCameraDto = z.infer<typeof updateCameraSchema>;
