import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { env } from "./config/env";
import * as schema from "./schema";

const queryClient = postgres(env.DATABASE_URL);

export const db = drizzle(queryClient, { schema });
export { sql };

export const pgClient = queryClient;