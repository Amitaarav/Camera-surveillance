import {
  pgTable,
  uuid,
  real,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { cameras } from "./cameras";

export const cameraStats = pgTable("camera_stats", {
  cameraId: uuid("camera_id")
    .primaryKey()
    .references(() => cameras.id, { onDelete: "cascade" }),
  fps: real("fps"),
  detectionsLastMin: integer("detections_last_min").default(0),
  queueLagMs: integer("queue_lag_ms").default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type CameraStat = typeof cameraStats.$inferSelect;
export type NewCameraStat = typeof cameraStats.$inferInsert;
