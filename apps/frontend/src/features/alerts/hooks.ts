/**
 * TanStack Query hooks for alerts.
 *
 * Uses infinite query with cursor-based pagination (matching the
 * backend's `(occurred_at, event_id)` cursor format).
 */

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { alertsApi } from "./api";
import type { ListAlertsParams } from "./api";

const ALERTS_KEY = ["alerts"] as const;

/**
 * Infinite-scroll paginated alerts with optional filters.
 */
export function useAlerts(filters: Omit<ListAlertsParams, "cursor"> = {}) {
  return useInfiniteQuery({
    queryKey: [...ALERTS_KEY, filters],
    queryFn: ({ pageParam }) =>
      alertsApi.list({ ...filters, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor ?? undefined : undefined,
  });
}

/**
 * Single alert detail.
 */
export function useAlert(id: string) {
  return useQuery({
    queryKey: [...ALERTS_KEY, id],
    queryFn: () => alertsApi.get(id),
    enabled: !!id,
  });
}

/**
 * Programmatic invalidation — call when a new WS detection event arrives
 * so the next fetch includes the latest data.
 */
export function useInvalidateAlerts() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ALERTS_KEY });
}
