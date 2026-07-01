import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  /**
   * SHA-256 hash of the opaque random token sent to the client.
   * We never store the raw token — only the hash — so a DB leak
   * does not compromise existing sessions.
   */
  tokenHash: text("token_hash").notNull().unique(),

  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

  /**
   * Set to true on logout or rotation (old token is revoked when a
   * new one is issued). Allows single-use enforcement without deletes.
   */
  revoked: boolean("revoked").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type RefreshToken    = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
