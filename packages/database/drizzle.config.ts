import type { Config } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL_LOCAL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL_LOCAL or DATABASE_URL must be set to run drizzle-kit. " +
      "Copy .env.example to .env at the repo root and export it, or run via `dotenv -e ../../.env -- bunx drizzle-kit ...`.",
  );
}

export default {
  schema: "./src/schema/index.ts", // application code
  out: "./drizzle/migrations", // generated code
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
} satisfies Config;