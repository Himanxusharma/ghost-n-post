import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js uses .env.local; load it explicitly (and override stale shell env).
config({ path: ".env.local", override: true });
config({ path: ".env", override: false });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is missing. Set it in .env.local (Neon connection string).",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
