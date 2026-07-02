import pino from "pino";
import { env } from "@/config/env";

export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: "backend",
    env: env.NODE_ENV,
  },
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
          },
        }
      : undefined,
});
