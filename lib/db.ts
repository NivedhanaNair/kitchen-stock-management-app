import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/lib/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local (see the Neon project's connection details).");
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });
