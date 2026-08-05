import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Lazy Neon + Drizzle client. Instantiated on first use so the app can
 * still boot (and render the landing page) when DATABASE_URL is unset.
 */
function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

type Db = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as { __ghostDb?: Db };

export function getDb(): Db {
  if (!globalForDb.__ghostDb) {
    globalForDb.__ghostDb = createDb();
  }
  return globalForDb.__ghostDb;
}
