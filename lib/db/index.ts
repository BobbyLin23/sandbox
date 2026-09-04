import { parseEnv } from "@neon/env"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import config from "@/neon"
import * as schema from "./schema"

// Sync read of the branch env already injected into process.env (no network).
// Narrow to just the pooled URL — the right default for serverless drivers.
const { postgres } = parseEnv(config, ["DATABASE_URL"])

const sql = neon(postgres.databaseUrl)

export const db = drizzle(sql, { schema })
export * from "./schema"
