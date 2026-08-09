import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

const unpooled =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.POSTGRES_URL_NON_POOLING;

if (!unpooled) {
  console.warn(
    "drizzle.config: DATABASE_URL_UNPOOLED / POSTGRES_URL_NON_POOLING not set, " +
      "falling back to DATABASE_URL. Pooled URLs can break schema pushes; " +
      "prefer the direct connection string for db:push."
  );
}

const url = unpooled ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "drizzle.config: no database URL found. Set DATABASE_URL_UNPOOLED (preferred) or DATABASE_URL in .env.local."
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url },
});
