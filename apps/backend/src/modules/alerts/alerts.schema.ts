import { z } from "zod";

export const listAlertsQuerySchema = z.object({
  cameraId: z.uuid("Invalid camera ID").optional(),
  eventType: z.string().max(100).optional(),
  from: z.iso.datetime({ message: "Invalid ISO-8601 date" }).optional(),
  to: z.iso.datetime({ message: "Invalid ISO-8601 date" }).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const alertIdParamSchema = z.object({
  id: z.uuid("Invalid alert ID"),
});

export type ListAlertsQuery = z.infer<typeof listAlertsQuerySchema>;

export const ingestAlertSchema = z.object({
  event_id: z.uuid(),
  event_type: z.string().min(1).max(100),
  camera_id: z.uuid(),
  user_id: z.uuid(),
  occurred_at: z.iso.datetime(),
  dedupe_key: z.string().max(255).nullable().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type IngestAlertDto = z.infer<typeof ingestAlertSchema>;

export interface PaginatedAlertsResponse {
  data: unknown[];
  nextCursor: string | null;
  hasMore: boolean;
}
