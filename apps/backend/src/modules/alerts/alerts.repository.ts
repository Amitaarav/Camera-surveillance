import { db, sql, eq, and, desc } from "@/db/client";
import { alerts } from "@repo/db/schema";
import type { ListAlertsQuery } from "./alerts.schema";

export async function insertAlert(data: {
  eventType: string;
  cameraId: string;
  userId: string;
  occurredAt: Date;
  dedupeKey: string | null;
  payload: Record<string, unknown> | null;
}) {
  const [created] = await db
    .insert(alerts)
    .values({
      eventType: data.eventType,
      cameraId: data.cameraId,
      userId: data.userId,
      occurredAt: data.occurredAt,
      dedupeKey: data.dedupeKey,
      payload: data.payload,
    })
    .returning();

  return created;
}

function decodeCursor(cursor: string): { occurredAt: Date; id: string } | null {
  const sep = cursor.lastIndexOf("|");
  if (sep === -1) return null;

  const dateStr = cursor.slice(0, sep);
  const id = cursor.slice(sep + 1);

  const d = new Date(dateStr);
  if (isNaN(d.getTime()) || !id) return null;

  return { occurredAt: d, id };
}

function encodeCursor(row: { occurredAt: Date; id: string }): string {
  return `${row.occurredAt.toISOString()}|${row.id}`;
}

export async function findAlerts(
  userId: string,
  query: ListAlertsQuery,
) {
  const conditions = [eq(alerts.userId, userId)];

  if (query.cameraId) {
    conditions.push(eq(alerts.cameraId, query.cameraId));
  }

  if (query.eventType) {
    conditions.push(eq(alerts.eventType, query.eventType));
  }

  if (query.from) {
    conditions.push(
      sql`${alerts.occurredAt} >= ${new Date(query.from)}`,
    );
  }
  if (query.to) {
    conditions.push(
      sql`${alerts.occurredAt} <= ${new Date(query.to)}`,
    );
  }

  if (query.cursor) {
    const parsed = decodeCursor(query.cursor);
    if (parsed) {
      conditions.push(
        sql`(${alerts.occurredAt}, ${alerts.id}) < (${parsed.occurredAt}, ${parsed.id})`,
      );
    }
  }

  const limit = query.limit;

  const rows = await db
    .select()
    .from(alerts)
    .where(and(...conditions))
    .orderBy(desc(alerts.occurredAt), desc(alerts.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore && data.length > 0
      ? encodeCursor(data[data.length - 1]!)
      : null;

  return { data, nextCursor, hasMore };
}

export async function findById(id: string, userId: string) {
  const [alert] = await db
    .select()
    .from(alerts)
    .where(and(eq(alerts.id, id), eq(alerts.userId, userId)));

  return alert;
}
