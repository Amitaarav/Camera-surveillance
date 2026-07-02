/**
 * Alerts REST API — cursor-paginated list + single-alert detail.
 */

import { api } from "../../lib/axios";

export interface Alert {
  id: string;
  eventType: string;
  cameraId: string;
  userId: string;
  occurredAt: string;
  dedupeKey: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface ListAlertsParams {
  cameraId?: string;
  eventType?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export interface PaginatedAlertsResponse {
  data: Alert[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const alertsApi = {
  list: (params: ListAlertsParams = {}) =>
    api
      .get<PaginatedAlertsResponse>("/alerts", { params })
      .then((r) => r.data),

  get: (id: string) =>
    api.get<{ alert: Alert }>(`/alerts/${id}`).then((r) => r.data.alert),
};
