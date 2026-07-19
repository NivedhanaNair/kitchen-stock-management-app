import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/lib/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Locally, add it to .env.local. On Vercel, set it under Project Settings > Environment Variables and redeploy."
  );
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });
