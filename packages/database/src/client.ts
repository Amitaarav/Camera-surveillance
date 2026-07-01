import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql, eq, and, or, desc, asc, inArray } from "drizzle-orm";
import { env } from "./config/env";
import * as schema from "./schema";

const queryClient = postgres(env.DATABASE_URL);

export const db = drizzle(queryClient, { schema });
export { sql, eq, and, or, desc, asc, inArray };

export const pgClient = queryClient;