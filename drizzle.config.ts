import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

config({ path: ".env.local" })
config()

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Provide it in .env.local or run via `neon-env run`."
  )
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
})
