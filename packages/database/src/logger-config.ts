export const logger = {
  info: (message: string, meta?: any) => {
    console.info(`[INFO] ${message}`, meta ? meta : "");
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${message}`, meta ? meta : "");
  },
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] ${message}`, meta ? meta : "");
  },
};
