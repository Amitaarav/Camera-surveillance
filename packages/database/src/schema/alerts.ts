import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { cameras } from "./cameras";
import { users } from "./users";
 
export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    cameraId: uuid("camera_id")
      .notNull()
      .references(() => cameras.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    dedupeKey: varchar("dedupe_key", { length: 255 }),

    // Flexible JSONB payload — schema varies by eventType
    payload: jsonb("payload").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Primary query path: alerts for a camera, ordered by time
    index("idx_alerts_camera_occurred").on(
      table.cameraId,
      table.occurredAt,
    ),
    index("idx_alerts_event_type").on(table.eventType),
    index("idx_alerts_dedupe_key").on(table.dedupeKey),
  ],
);

export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
