import { relations } from "drizzle-orm";

export { users } from "./users";
export type { User, NewUser } from "./users";

export { cameras, CAMERA_STATES, DESIRED_STATES } from "./cameras";
export type { Camera, NewCamera, CameraState, DesiredState } from "./cameras";

export { alerts } from "./alerts";
export type { Alert, NewAlert } from "./alerts";

export { cameraStats } from "./camera-stats";
export type { CameraStat, NewCameraStat } from "./camera-stats";

export { refreshTokens } from "./refresh-tokens";
export type { RefreshToken, NewRefreshToken } from "./refresh-tokens";

import { users } from "./users";
import { cameras } from "./cameras";
import { alerts } from "./alerts";
import { cameraStats } from "./camera-stats";
import { refreshTokens } from "./refresh-tokens";

export const usersRelations = relations(users, ({ many }) => ({
  cameras:       many(cameras),
  refreshTokens: many(refreshTokens),
}));

export const camerasRelations = relations(cameras, ({ one, many }) => ({
  owner: one(users, {
    fields:     [cameras.ownerId],
    references: [users.id],
  }),
  alerts: many(alerts),
  stats: one(cameraStats, {
    fields:     [cameras.id],
    references: [cameraStats.cameraId],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  camera: one(cameras, {
    fields:     [alerts.cameraId],
    references: [cameras.id],
  }),
  user: one(users, {
    fields:     [alerts.userId],
    references: [users.id],
  }),
}));

export const cameraStatsRelations = relations(cameraStats, ({ one }) => ({
  camera: one(cameras, {
    fields:     [cameraStats.cameraId],
    references: [cameras.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields:     [refreshTokens.userId],
    references: [users.id],
  }),
}));