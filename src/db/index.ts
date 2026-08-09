import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { ntPool?: Pool };

function makePool() {
  const pool = new Pool({ connectionString: getEnv().DATABASE_URL, max: 5 });
  attachDatabasePool(pool);
  return pool;
}

const pool = globalForDb.ntPool ?? makePool();
globalForDb.ntPool = pool;

export const db = drizzle(pool, { schema });
export * as tables from "./schema";
