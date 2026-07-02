import { db, eq, and } from "@/db/client";
import { cameras, cameraStats } from "@repo/db/schema";
import type { DesiredState, CameraState } from "@repo/db/schema";
import type { CreateCameraDto, UpdateCameraDto } from "./cameras.schema";

export async function create(userId: string, data: CreateCameraDto) {
  const [created] = await db
    .insert(cameras)
    .values({
      ...data,
      ownerId: userId,
    })
    .returning();

  return created;
}

export async function findAllByUserId(userId: string) {
  return db
    .select()
    .from(cameras)
    .where(eq(cameras.ownerId, userId))
    .orderBy(cameras.createdAt);
}

export async function findByIdAndUserId(id: string, userId: string) {
  const [camera] = await db
    .select()
    .from(cameras)
    .where(and(eq(cameras.id, id), eq(cameras.ownerId, userId)));

  return camera;
}

export async function update(
  id: string,
  userId: string,
  data: UpdateCameraDto,
) {
  const [updated] = await db
    .update(cameras)
    .set(data)
    .where(and(eq(cameras.id, id), eq(cameras.ownerId, userId)))
    .returning();

  return updated;
}

export async function deleteCamera(id: string, userId: string) {
  const [deleted] = await db
    .delete(cameras)
    .where(and(eq(cameras.id, id), eq(cameras.ownerId, userId)))
    .returning({ id: cameras.id });

  return deleted;
}

export async function setDesiredState(
  id: string,
  userId: string,
  desiredState: DesiredState,
) {
  const [updated] = await db
    .update(cameras)
    .set({ desiredState })
    .where(and(eq(cameras.id, id), eq(cameras.ownerId, userId)))
    .returning();

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event-driven methods — called by the queue consumer, not REST handlers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update a camera's current (actual) state.
 * Called when the worker reports a status change.
 * No ownership check — the worker is trusted infrastructure.
 */
export async function updateCurrentState(
  id: string,
  currentState: CameraState,
) {
  const [updated] = await db
    .update(cameras)
    .set({ currentState })
    .where(eq(cameras.id, id))
    .returning();

  return updated;
}

/**
 * Upsert the live stats snapshot for a camera.
 * Uses Drizzle's onConflictDoUpdate (INSERT ... ON CONFLICT DO UPDATE).
 */
export async function upsertStats(
  cameraId: string,
  stats: { fps: number; detectionsLastMin: number; queueLagMs: number },
) {
  const [upserted] = await db
    .insert(cameraStats)
    .values({
      cameraId,
      fps: stats.fps,
      detectionsLastMin: stats.detectionsLastMin,
      queueLagMs: stats.queueLagMs,
    })
    .onConflictDoUpdate({
      target: cameraStats.cameraId,
      set: {
        fps: stats.fps,
        detectionsLastMin: stats.detectionsLastMin,
        queueLagMs: stats.queueLagMs,
      },
    })
    .returning();

  return upserted;
}

/**
 * Look up the owner of a camera by camera ID.
 * Used by the WS gateway to verify a user is allowed to subscribe.
 */
export async function findOwnerByCameraId(id: string) {
  const [result] = await db
    .select({ ownerId: cameras.ownerId })
    .from(cameras)
    .where(eq(cameras.id, id));

  return result?.ownerId ?? null;
}

/**
 * Given a list of camera IDs, return only those owned by the given user.
 * Used by the WS gateway for batch ownership checks.
 */
export async function filterOwnedCameraIds(
  cameraIds: string[],
  userId: string,
): Promise<string[]> {
  if (cameraIds.length === 0) return [];

  const { inArray } = await import("drizzle-orm");

  const rows = await db
    .select({ id: cameras.id })
    .from(cameras)
    .where(and(inArray(cameras.id, cameraIds), eq(cameras.ownerId, userId)));

  return rows.map((r) => r.id);
}

