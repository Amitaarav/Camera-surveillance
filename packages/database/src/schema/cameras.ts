import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const CAMERA_STATES = [
  "stopped",
  "connecting",
  "live",
  "error",
] as const;

export type CameraState = (typeof CAMERA_STATES)[number];

export const DESIRED_STATES = ["started", "stopped"] as const;
export type DesiredState = (typeof DESIRED_STATES)[number];

export const cameras = pgTable("cameras", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  rtspUrl: text("rtsp_url").notNull(),
  location: varchar("location", { length: 255 }),
  enabled: boolean("enabled").notNull().default(true),

  desiredState: varchar("desired_state", { length: 20 })
    .notNull()
    .default("stopped"),
  currentState: varchar("current_state", { length: 20 })
    .notNull()
    .default("stopped"),

  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Camera = typeof cameras.$inferSelect;
export type NewCamera = typeof cameras.$inferInsert;
